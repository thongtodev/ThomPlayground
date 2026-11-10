-- 1.61.7: authoritative 30s turns and 15s +4 decisions. Run after 1.61.5.
begin;
create or replace function uno_private.with_deadline(s jsonb,previous jsonb,reset_clock boolean)
returns jsonb language plpgsql set search_path='' as $$
begin
 if s->>'status' is distinct from 'playing' then return s-'deadline';end if;
 if reset_clock or s->>'deadline' is null or s->>'turn' is distinct from previous->>'turn' or s->'pending' is distinct from previous->'pending' then
  return s||jsonb_build_object('deadline',now()+case when s->'pending' is not null and s->'pending'<>'null'::jsonb then interval '15 seconds' else interval '30 seconds' end);
 end if;
 return s;
end;$$;
create or replace function uno_private.expire_turn(s jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare previous jsonb:=s;target text:=s->>'turn';
begin
 if s->>'status' is distinct from 'playing' or s->>'deadline' is null or (s->>'deadline')::timestamptz>now() then return s;end if;
 if s->'pending' is not null and s->'pending'<>'null'::jsonb then
  s:=uno_private.step(s,s->'pending'->>'target','accept','{}');
  s:=s||jsonb_build_object('notice','Hết 15 giây: tự nhận 4 lá và mất lượt.','effect','draw');
 else
  -- Already drew during this turn: only pass, never charge an extra card.
  if not coalesce((s->>'drew')::boolean,false) then s:=uno_private.draw(s,target,1);end if;
  s:=s||jsonb_build_object('turn',uno_private.next_player(s,target),'drew',false,'drawn',null,'uno_target',null,'notice','Hết 30 giây: rút tối đa 1 lá và chuyển lượt.','effect','draw');
 end if;
 return uno_private.with_deadline(s,previous,true);
end;$$;

create or replace function uno_private.snapshot(r uno_private.rooms,p text) returns jsonb language plpgsql stable set search_path='' as $$
declare s jsonb:=r.state;players jsonb;legal jsonb;
begin
 select coalesce(jsonb_agg(v||jsonb_build_object('count',coalesce(jsonb_array_length(s->'hands'->(v->>'id')),0),'online',(v->>'seen')::timestamptz>now()-interval '30 seconds')),'[]') into players from jsonb_array_elements(r.players) v;
 select coalesce(jsonb_agg(v),'[]') into legal from jsonb_array_elements_text(coalesce(s->'hands'->p,'[]')) v where uno_private.legal(s,p,v);
 return jsonb_build_object('id',r.id,'code',r.code,'host',r.host,'capacity',r.capacity,'version',r.version,'players',players,'me',p,'status',coalesce(s->>'status','lobby'),'hand',coalesce(s->'hands'->p,'[]'),'legal',legal,'turn',s->>'turn','color',s->>'color','direction',s->'direction','order',coalesce(s->'order','[]'::jsonb),'top',s->'discard'->>(jsonb_array_length(s->'discard')-1),'drawCount',coalesce(jsonb_array_length(s->'deck'),0),'drew',s->'drew','pending',case when s->'pending'<>'null'::jsonb then jsonb_build_object('actor',s->'pending'->>'actor','target',s->'pending'->>'target') else null end,'unoTarget',s->>'uno_target','winner',s->>'winner','notice',s->>'notice','effect',s->>'effect','deadline',s->>'deadline','serverNow',now(),'startedAt',s->>'started_at','endedAt',s->>'ended_at');
end;$$;

create or replace function public.uno_room(action text,room_code text default '',args jsonb default '{}',expected_version int default null,request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p text:=auth.uid()::text;r uno_private.rooms;member jsonb;players jsonb;idx int;name text;ids jsonb;changed boolean:=false;all_ready boolean;live int;before_state jsonb;expired boolean:=false;
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
  if not (member->>'left')::boolean and (member->>'seen')::timestamptz<now()-interval '90 seconds' then
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
  select v->>'id' into r.host from jsonb_array_elements(r.players) v where not(v->>'left')::boolean limit 1;changed:=true;
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
  if action='ready' then
   if r.state->>'status'='playing' then raise exception 'Ván đang chơi.';end if;
   r.players:=jsonb_set(r.players,array[idx::text,'ready'],to_jsonb(coalesce((args->>'ready')::boolean,false)));
  elsif action='start' then
   if p<>r.host or r.state->>'status'='playing' then raise exception 'Chỉ chủ phòng được bắt đầu.';end if;
   select jsonb_agg(v->>'id'),bool_and((v->>'ready')::boolean),count(*) into ids,all_ready,live from jsonb_array_elements(r.players) v where not(v->>'left')::boolean;
   if live<2 or not all_ready then raise exception 'Cần ít nhất 2 người và tất cả sẵn sàng.';end if;
   r.state:=uno_private.start(ids);
   select jsonb_agg(v||jsonb_build_object('ready',false)) into r.players from jsonb_array_elements(r.players) v;
  elsif action='leave' then
   r.players:=jsonb_set(r.players,array[idx::text,'left'],'true');r.state:=uno_private.forfeit(r.state,p);
   if r.host=p then select v->>'id' into r.host from jsonb_array_elements(r.players) v where not(v->>'left')::boolean limit 1;r.host:=coalesce(r.host,p);end if;
  elsif action='lobby' then
   if p<>r.host or r.state->>'status'<>'finished' then raise exception 'Chỉ chủ phòng trở về phòng chờ sau ván.';end if;
   r.state:='{}';select coalesce(jsonb_agg(v||jsonb_build_object('ready',false)),'[]') into r.players from jsonb_array_elements(r.players) v where not(v->>'left')::boolean;
  else r.state:=uno_private.step(r.state,p,action,args);
  end if;
  r.receipts:=jsonb_set(r.receipts,array[p],to_jsonb(request_id::text));changed:=true;
 end if;
 r.state:=uno_private.with_deadline(r.state,before_state,action in ('start','play','accept','challenge','pass'));
 if changed then r.version:=r.version+1;end if;
 update uno_private.rooms set players=r.players,state=r.state,host=r.host,receipts=r.receipts,version=r.version,expires_at=now()+interval '2 hours' where id=r.id;
 if changed then perform realtime.send(jsonb_build_object('version',r.version),'changed','uno:'||r.id::text,true);end if;
 return uno_private.snapshot(r,p);
end;$$;

revoke all on all functions in schema uno_private from public,anon,authenticated;
revoke all on function public.uno_room(text,text,jsonb,int,uuid) from public,anon;
grant execute on function public.uno_room(text,text,jsonb,int,uuid) to authenticated;
commit;
