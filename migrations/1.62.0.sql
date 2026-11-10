-- 1.62.0: bots for UNO. Run after migration-1.61.7.sql.
begin;
create or replace function uno_private.bot_actor(s jsonb,players jsonb) returns text language sql stable set search_path='' as $$
 select v->>'id' from jsonb_array_elements(players) v
 where s->>'status'='playing' and coalesce((v->>'bot')::boolean,false) and not(v->>'left')::boolean
 and (v->>'id'=s->>'uno_target' or v->>'id'=s->>'turn')
 order by (v->>'id'=s->>'uno_target') desc limit 1;
$$;
create or replace function uno_private.schedule_bot(s jsonb,players jsonb,changed boolean) returns jsonb language plpgsql set search_path='' as $$
begin
 if uno_private.bot_actor(s,players) is null then return s-'bot_due';end if;
 if changed or s->>'bot_due' is null then return s||jsonb_build_object('bot_due',now()+interval '1200 milliseconds');end if;
 return s;
end;$$;
create or replace function uno_private.bot_step(s jsonb,players jsonb) returns jsonb language plpgsql set search_path='' as $$
declare actor text:=uno_private.bot_actor(s,players);chosen text;card_id text;
begin
 if actor is null then return s;end if;
 if s->>'uno_target'=actor then return uno_private.step(s,actor,'uno','{}');end if;
 -- Bots never inspect an opponent's cards or the private +4 legality flag.
 if s->'pending' is not null and s->'pending'<>'null'::jsonb then
  return uno_private.step(s,actor,case when random()<0.2 then 'challenge' else 'accept' end,'{}');
 end if;
 if s->>'uno_target' is not null then return uno_private.step(s,actor,'catch','{}');end if;
 select c.id into card_id from jsonb_array_elements_text(s->'hands'->actor) h join uno_private.cards c on c.id=h
 where uno_private.legal(s,actor,c.id)
 -- Keep wilds until needed and don't knowingly play an illegal +4.
 and (c.value<>'wild_draw4' or not exists(select 1 from jsonb_array_elements_text(s->'hands'->actor) x join uno_private.cards own on own.id=x where own.color=s->>'color'))
 order by (c.color='wild'),random() limit 1;
 if card_id is null then return uno_private.step(s,actor,case when coalesce((s->>'drew')::boolean,false) then 'pass' else 'draw' end,'{}');end if;
 select c.color into chosen from jsonb_array_elements_text(s->'hands'->actor) h join uno_private.cards c on c.id=h where c.color<>'wild' and c.id<>card_id group by c.color order by count(*) desc,random() limit 1;
 return uno_private.step(s,actor,'play',jsonb_build_object('card',card_id,'color',coalesce(chosen,'red')));
end;$$;
create or replace function uno_private.snapshot(r uno_private.rooms,p text) returns jsonb language plpgsql stable set search_path='' as $$
declare s jsonb:=r.state;players jsonb;legal jsonb;
begin
 select coalesce(jsonb_agg(v||jsonb_build_object('count',coalesce(jsonb_array_length(s->'hands'->(v->>'id')),0),'online',coalesce((v->>'bot')::boolean,false) or (v->>'seen')::timestamptz>now()-interval '30 seconds')),'[]') into players from jsonb_array_elements(r.players) v;
 select coalesce(jsonb_agg(v),'[]') into legal from jsonb_array_elements_text(coalesce(s->'hands'->p,'[]')) v where uno_private.legal(s,p,v);
 return jsonb_build_object('id',r.id,'code',r.code,'host',r.host,'capacity',r.capacity,'version',r.version,'players',players,'me',p,'status',coalesce(s->>'status','lobby'),'hand',coalesce(s->'hands'->p,'[]'),'legal',legal,'turn',s->>'turn','color',s->>'color','direction',s->'direction','order',coalesce(s->'order','[]'::jsonb),'top',s->'discard'->>(jsonb_array_length(s->'discard')-1),'drawCount',coalesce(jsonb_array_length(s->'deck'),0),'drew',s->'drew','pending',case when s->'pending'<>'null'::jsonb then jsonb_build_object('actor',s->'pending'->>'actor','target',s->'pending'->>'target') else null end,'unoTarget',s->>'uno_target','winner',s->>'winner','notice',s->>'notice','effect',s->>'effect','botDue',s->>'bot_due','deadline',s->>'deadline','serverNow',now(),'startedAt',s->>'started_at','endedAt',s->>'ended_at');
end;$$;

create or replace function public.uno_room(action text,room_code text default '',args jsonb default '{}',expected_version int default null,request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p text:=auth.uid()::text;r uno_private.rooms;member jsonb;players jsonb;idx int;name text;ids jsonb;changed boolean:=false;all_ready boolean;live int;before_state jsonb;expired boolean:=false;bot_count int;bot_i int;
begin
 if p is null then raise exception 'Hãy kết nối phiên chơi trước.';end if;
 name:=left(btrim(coalesce(args->>'name','')),24);
 if action in ('create','join') and length(name)<1 then raise exception 'Nhập biệt danh.';end if;
 if action='create' then
  if exists(select 1 from public.game_settings where key='gameAvailability' and value->>'uno'='false') then raise exception 'Game đang tạm tắt.';end if;
  perform pg_advisory_xact_lock(hashtext(p));
  if (select count(*) from uno_private.rooms where host=p and created_at>now()-interval '10 minutes')>=5 then raise exception 'Bạn tạo phòng quá nhanh. Hãy thử lại sau.';end if;
  insert into uno_private.rooms(code,host,capacity,players) values(upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),p,coalesce((args->>'capacity')::int,4),jsonb_build_array(jsonb_build_object('id',p,'name',name,'ready',true,'left',false,'seen',now()))) returning * into r;
  return uno_private.snapshot(r,p);
 end if;
 select * into r from uno_private.rooms where code=upper(btrim(room_code)) for update;
 if not found or r.expires_at<now() then raise exception 'Phòng không tồn tại hoặc đã hết hạn.';end if;
 before_state:=r.state;
 -- Connected peers trigger cleanup on every snapshot, even if the disconnected user owns the turn.
 players:='[]';
 for member in select value from jsonb_array_elements(r.players) loop
  if not coalesce((member->>'bot')::boolean,false) and not (member->>'left')::boolean and (member->>'seen')::timestamptz<now()-interval '90 seconds' then
   member:=member||jsonb_build_object('left',true,'ready',false);r.state:=uno_private.forfeit(r.state,member->>'id');changed:=true;
  end if;players:=players||jsonb_build_array(member);
 end loop;r.players:=players;
 select ordinality::int-1 into idx from jsonb_array_elements(r.players) with ordinality where value->>'id'=p;
 if action='join' and (idx is null or (r.players->idx->>'left')::boolean) then
  if r.state->>'status'='playing' then raise exception 'Ván đã bắt đầu; không thể vào lại sau khi bỏ cuộc.';end if;
  select count(*) into live from jsonb_array_elements(r.players) v where not (v->>'left')::boolean;
  if live>=r.capacity then raise exception 'Phòng đã đủ người.';end if;
  select coalesce(jsonb_agg(v),'[]') into r.players from jsonb_array_elements(r.players) v where not (v->>'left')::boolean;
  idx:=jsonb_array_length(r.players);r.players:=r.players||jsonb_build_array(jsonb_build_object('id',p,'name',name,'ready',false,'left',false,'seen',now()));changed:=true;
 elsif idx is null then raise exception 'Bạn không thuộc phòng này.';
 end if;
 if (r.players->idx->>'left')::boolean then
  if changed then r.version:=r.version+1;update uno_private.rooms set players=r.players,state=r.state,version=r.version where id=r.id;end if;
  return jsonb_build_object('removed',true,'notice','Bạn đã rời phòng hoặc mất kết nối quá 90 giây.');
 end if;
 r.players:=jsonb_set(r.players,array[idx::text,'seen'],to_jsonb(now()));
 if not exists(select 1 from jsonb_array_elements(r.players) v where v->>'id'=r.host and not(v->>'left')::boolean) then
  select v->>'id' into r.host from jsonb_array_elements(r.players) v where not(v->>'left')::boolean and not coalesce((v->>'bot')::boolean,false) limit 1;changed:=true;
 end if;
 -- Initialize old rooms and reset only when cleanup changed the active decision.
 r.state:=uno_private.with_deadline(r.state,before_state,false);
 if r.state is distinct from before_state then changed:=true;end if;
 if r.state->>'status'='playing' and (r.state->>'deadline')::timestamptz<=now() then
  r.state:=uno_private.expire_turn(r.state);changed:=true;expired:=true;
 end if;
 before_state:=r.state;
 -- A late command cannot undo expiry; return the committed authoritative state.
 if expired then action:='snapshot';end if;
 if action not in ('snapshot','join') then
  if request_id is null then raise exception 'Thiếu mã thao tác.';end if;
  if r.receipts->>p=request_id::text then return uno_private.snapshot(r,p);end if;
  if expected_version is null or expected_version<>r.version then raise exception 'Trạng thái đã thay đổi. Đang cập nhật lại.';end if;
  if action='set_bots' then
   if p<>r.host or r.state->>'status'='playing' then raise exception 'Chỉ chủ phòng được chỉnh bot khi chưa chơi.';end if;
   bot_count:=(args->>'count')::int;
   if bot_count is null or bot_count<0 or bot_count>3 then raise exception 'Chọn từ 0 đến 3 bot.';end if;
   select coalesce(jsonb_agg(v),'[]') into players from jsonb_array_elements(r.players) v where not(v->>'left')::boolean and not coalesce((v->>'bot')::boolean,false);
   if jsonb_array_length(players)+bot_count>r.capacity then raise exception 'Không đủ ghế trống cho số bot đã chọn.';end if;
   for bot_i in 1..bot_count loop
    players:=players||jsonb_build_array(jsonb_build_object('id','bot-'||bot_i,'name','Thơm Bot '||bot_i,'bot',true,'ready',true,'left',false,'seen',now()));
   end loop;
   r.players:=players;r.state:='{}';
  elsif action='ready' then
   if r.state->>'status'='playing' then raise exception 'Ván đang chơi.';end if;
   r.players:=jsonb_set(r.players,array[idx::text,'ready'],to_jsonb(coalesce((args->>'ready')::boolean,false)));
  elsif action='start' then
   if p<>r.host or r.state->>'status'='playing' then raise exception 'Chỉ chủ phòng được bắt đầu.';end if;
   select jsonb_agg(v->>'id'),bool_and((v->>'ready')::boolean),count(*) into ids,all_ready,live from jsonb_array_elements(r.players) v where not(v->>'left')::boolean;
   if live<2 or not all_ready then raise exception 'Cần ít nhất 2 người và tất cả sẵn sàng.';end if;
   r.state:=uno_private.start(ids);
   select jsonb_agg(v||jsonb_build_object('ready',coalesce((v->>'bot')::boolean,false))) into r.players from jsonb_array_elements(r.players) v;
  elsif action='leave' then
   r.players:=jsonb_set(r.players,array[idx::text,'left'],'true');r.state:=uno_private.forfeit(r.state,p);
   if r.host=p then select v->>'id' into r.host from jsonb_array_elements(r.players) v where not(v->>'left')::boolean and not coalesce((v->>'bot')::boolean,false) limit 1;r.host:=coalesce(r.host,p);end if;
  elsif action='lobby' then
   if p<>r.host or r.state->>'status'<>'finished' then raise exception 'Chỉ chủ phòng trở về phòng chờ sau ván.';end if;
   r.state:='{}';select coalesce(jsonb_agg(v||jsonb_build_object('ready',coalesce((v->>'bot')::boolean,false))),'[]') into r.players from jsonb_array_elements(r.players) v where not(v->>'left')::boolean;
  else r.state:=uno_private.step(r.state,p,action,args);
  end if;
  r.receipts:=jsonb_set(r.receipts,array[p],to_jsonb(request_id::text));changed:=true;
 end if;
 r.state:=uno_private.with_deadline(r.state,before_state,action in ('start','play','accept','challenge','pass'));
 -- One server-controlled bot action per snapshot, serialized by the room lock.
 if action='snapshot' and not expired and r.state->>'bot_due' is not null and (r.state->>'bot_due')::timestamptz<=now() then
  before_state:=r.state;
  r.state:=uno_private.bot_step(r.state,r.players);
  r.state:=uno_private.with_deadline(r.state,before_state,r.state->>'effect' not in ('uno','catch') and not coalesce((r.state->>'drew')::boolean,false) and r.state is distinct from before_state);
  if r.state is distinct from before_state then changed:=true;end if;
 end if;
 r.state:=uno_private.schedule_bot(r.state,r.players,changed);
 if changed then r.version:=r.version+1;end if;
 update uno_private.rooms set players=r.players,state=r.state,host=r.host,receipts=r.receipts,version=r.version,expires_at=now()+interval '2 hours' where id=r.id;
 if changed then perform realtime.send(jsonb_build_object('version',r.version),'changed','uno:'||r.id::text,true);end if;
 return uno_private.snapshot(r,p);
end;$$;

revoke all on all functions in schema uno_private from public,anon,authenticated;
revoke all on function public.uno_room(text,text,jsonb,int,uuid) from public,anon;
grant execute on function public.uno_room(text,text,jsonb,int,uuid) to authenticated;
commit;
