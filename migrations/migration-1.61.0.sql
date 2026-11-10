begin;
create schema if not exists uno_private;
revoke all on schema uno_private from public,anon,authenticated;
create table if not exists uno_private.cards(id text primary key,color text not null,value text not null);
create table if not exists uno_private.rooms(
 id uuid primary key default gen_random_uuid(),code text unique not null,host text not null,
 capacity int not null check(capacity between 2 and 4),players jsonb not null default '[]',
 state jsonb not null default '{}',version int not null default 0,
 receipts jsonb not null default '{}',created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '2 hours'
);
alter table uno_private.rooms enable row level security;
alter table uno_private.cards enable row level security;
-- No client policies: snapshots are filtered by the security-definer RPC only.
insert into uno_private.cards(id,color,value) values
('red_0','red','0'),
('red_1_a','red','1'),
('red_1_b','red','1'),
('red_2_a','red','2'),
('red_2_b','red','2'),
('red_3_a','red','3'),
('red_3_b','red','3'),
('red_4_a','red','4'),
('red_4_b','red','4'),
('red_5_a','red','5'),
('red_5_b','red','5'),
('red_6_a','red','6'),
('red_6_b','red','6'),
('red_7_a','red','7'),
('red_7_b','red','7'),
('red_8_a','red','8'),
('red_8_b','red','8'),
('red_9_a','red','9'),
('red_9_b','red','9'),
('red_draw2_a','red','draw2'),
('red_draw2_b','red','draw2'),
('red_reverse_a','red','reverse'),
('red_reverse_b','red','reverse'),
('red_skip_a','red','skip'),
('red_skip_b','red','skip'),
('blue_0','blue','0'),
('blue_1_a','blue','1'),
('blue_1_b','blue','1'),
('blue_2_a','blue','2'),
('blue_2_b','blue','2'),
('blue_3_a','blue','3'),
('blue_3_b','blue','3'),
('blue_4_a','blue','4'),
('blue_4_b','blue','4'),
('blue_5_a','blue','5'),
('blue_5_b','blue','5'),
('blue_6_a','blue','6'),
('blue_6_b','blue','6'),
('blue_7_a','blue','7'),
('blue_7_b','blue','7'),
('blue_8_a','blue','8'),
('blue_8_b','blue','8'),
('blue_9_a','blue','9'),
('blue_9_b','blue','9'),
('blue_draw2_a','blue','draw2'),
('blue_draw2_b','blue','draw2'),
('blue_reverse_a','blue','reverse'),
('blue_reverse_b','blue','reverse'),
('blue_skip_a','blue','skip'),
('blue_skip_b','blue','skip'),
('green_0','green','0'),
('green_1_a','green','1'),
('green_1_b','green','1'),
('green_2_a','green','2'),
('green_2_b','green','2'),
('green_3_a','green','3'),
('green_3_b','green','3'),
('green_4_a','green','4'),
('green_4_b','green','4'),
('green_5_a','green','5'),
('green_5_b','green','5'),
('green_6_a','green','6'),
('green_6_b','green','6'),
('green_7_a','green','7'),
('green_7_b','green','7'),
('green_8_a','green','8'),
('green_8_b','green','8'),
('green_9_a','green','9'),
('green_9_b','green','9'),
('green_draw2_a','green','draw2'),
('green_draw2_b','green','draw2'),
('green_reverse_a','green','reverse'),
('green_reverse_b','green','reverse'),
('green_skip_a','green','skip'),
('green_skip_b','green','skip'),
('yellow_0','yellow','0'),
('yellow_1_a','yellow','1'),
('yellow_1_b','yellow','1'),
('yellow_2_a','yellow','2'),
('yellow_2_b','yellow','2'),
('yellow_3_a','yellow','3'),
('yellow_3_b','yellow','3'),
('yellow_4_a','yellow','4'),
('yellow_4_b','yellow','4'),
('yellow_5_a','yellow','5'),
('yellow_5_b','yellow','5'),
('yellow_6_a','yellow','6'),
('yellow_6_b','yellow','6'),
('yellow_7_a','yellow','7'),
('yellow_7_b','yellow','7'),
('yellow_8_a','yellow','8'),
('yellow_8_b','yellow','8'),
('yellow_9_a','yellow','9'),
('yellow_9_b','yellow','9'),
('yellow_draw2_a','yellow','draw2'),
('yellow_draw2_b','yellow','draw2'),
('yellow_reverse_a','yellow','reverse'),
('yellow_reverse_b','yellow','reverse'),
('yellow_skip_a','yellow','skip'),
('yellow_skip_b','yellow','skip'),
('wild_01','wild','wild'),
('wild_02','wild','wild'),
('wild_03','wild','wild'),
('wild_04','wild','wild'),
('wild_draw4_01','wild','wild_draw4'),
('wild_draw4_02','wild','wild_draw4'),
('wild_draw4_03','wild','wild_draw4'),
('wild_draw4_04','wild','wild_draw4')
on conflict(id) do update set color=excluded.color,value=excluded.value;
create or replace function uno_private.shuffle(a jsonb) returns jsonb language sql volatile set search_path='' as $$
 select coalesce(jsonb_agg(value order by random()),'[]') from jsonb_array_elements(a);
$$;
create or replace function uno_private.next_player(s jsonb,p text,steps int default 1) returns text language plpgsql set search_path='' as $$
declare n int:=jsonb_array_length(s->'order');i int;
begin select ordinality::int-1 into i from jsonb_array_elements_text(s->'order') with ordinality where value=p;
 return s->'order'->>((i+steps*coalesce((s->>'direction')::int,1))%n+n)%n;end;$$;
create or replace function uno_private.draw(s jsonb,p text,n int) returns jsonb language plpgsql set search_path='' as $$
declare deck jsonb:=s->'deck';disc jsonb:=s->'discard';hand jsonb:=s->'hands'->p;c jsonb;i int;
begin
 for i in 1..n loop
  if jsonb_array_length(deck)=0 and jsonb_array_length(disc)>1 then
   deck:=uno_private.shuffle(disc-(jsonb_array_length(disc)-1));disc:=jsonb_build_array(disc->(jsonb_array_length(disc)-1));
  end if;
  if jsonb_array_length(deck)=0 then exit;end if;
  c:=deck->0;deck:=deck-0;hand:=hand||jsonb_build_array(c);s:=jsonb_set(s,'{last_draw}',c);
 end loop;
 s:=jsonb_set(s,'{deck}',deck);s:=jsonb_set(s,'{discard}',disc);s:=jsonb_set(s,array['hands',p],hand);return s;
end;$$;
create or replace function uno_private.legal(s jsonb,p text,c text) returns boolean language plpgsql stable set search_path='' as $$
declare card uno_private.cards;topcard uno_private.cards;
begin
 if s->>'status' is distinct from 'playing' or s->>'turn' is distinct from p or s->'pending'<>'null'::jsonb or not (s->'hands'->p ? c) then return false;end if;
 if (s->>'drew')::boolean and s->>'drawn' is distinct from c then return false;end if;
 select * into card from uno_private.cards where id=c;
 select * into topcard from uno_private.cards where id=s->'discard'->>(jsonb_array_length(s->'discard')-1);
 return card.color='wild' or card.color=s->>'color' or card.value=topcard.value;
end;$$;
create or replace function uno_private.start(ids jsonb) returns jsonb language plpgsql set search_path='' as $$
declare s jsonb;deck jsonb;hands jsonb:='{}';p text;topcard text;
begin
 select uno_private.shuffle(jsonb_agg(id order by id)) into deck from uno_private.cards;
 ids:=uno_private.shuffle(ids);
 for p in select jsonb_array_elements_text(ids) loop hands:=jsonb_set(hands,array[p],'[]');end loop;
 s:=jsonb_build_object('status','playing','order',ids,'turn',ids->>0,'direction',1,'hands',hands,'deck',deck,'discard','[]'::jsonb,'pending',null,'uno_target',null,'drew',false,'drawn',null,'winner',null,'started_at',now(),'notice','Đã chia 7 lá. Bắt đầu!');
 for p in select jsonb_array_elements_text(ids) loop s:=uno_private.draw(s,p,7);end loop;
 select v into topcard from jsonb_array_elements_text(s->'deck') v join uno_private.cards c on c.id=v where c.value~'^[0-9]$' limit 1;
 s:=jsonb_set(s,'{deck}',(s->'deck')-topcard);s:=jsonb_set(s,'{discard}',jsonb_build_array(topcard));
 s:=jsonb_set(s,'{color}',(select to_jsonb(color) from uno_private.cards where id=topcard));return s;
end;$$;
create or replace function uno_private.step(s jsonb,p text,action text,args jsonb) returns jsonb language plpgsql set search_path='' as $$
declare c text:=args->>'card';card uno_private.cards;target text;actor text;chosen text;bad boolean;count_before int;candidate text;
begin
 if s->>'status' is distinct from 'playing' or not(s->'order' ? p) then raise exception 'Ván chưa bắt đầu hoặc bạn đã rời phòng.';end if;
 if action='uno' then
  if s->>'uno_target' is distinct from p or jsonb_array_length(s->'hands'->p)<>1 then raise exception 'Không có lượt báo UNO.';end if;
  s:=jsonb_set(s,'{uno_target}','null');return s||jsonb_build_object('notice','UNO!','effect','uno');
 elsif action='catch' then
  target:=s->>'uno_target';if target is null or target=p or jsonb_array_length(s->'hands'->target)<>1 then raise exception 'Không có lỗi UNO để bắt.';end if;
  s:=uno_private.draw(s,target,2);s:=jsonb_set(s,'{uno_target}','null');return s||jsonb_build_object('notice','Bắt UNO thành công: rút 2 lá.','effect','catch');
 end if;
 if s->>'turn' is distinct from p then raise exception 'Chưa đến lượt bạn.';end if;
 if s->'pending'<>'null'::jsonb then
  if action not in ('accept','challenge') then raise exception 'Hãy xử lý lá +4 trước.';end if;
  actor:=s->'pending'->>'actor';bad:=(s->'pending'->>'illegal')::boolean;candidate:=s->'pending'->>'candidate';
  s:=s||jsonb_build_object('pending',null,'uno_target',null,'drew',false,'drawn',null);
  if action='challenge' and bad then
   s:=uno_private.draw(s,actor,4);s:=s||jsonb_build_object('notice','Thách thức đúng! Người đánh +4 rút 4 lá; bạn được đi.','effect','challenge');
  else
   s:=uno_private.draw(s,p,case when action='challenge' then 6 else 4 end);
   s:=s||jsonb_build_object('turn',uno_private.next_player(s,p),'notice',case when action='challenge' then 'Thách thức sai: rút 6 lá, mất lượt.' else 'Đã rút 4 lá, mất lượt.' end,'effect','draw');
   if candidate is not null then s:=s||jsonb_build_object('winner',candidate,'status','finished','ended_at',now());end if;
  end if;return s;
 end if;
 if action='draw' then
  if (s->>'drew')::boolean then raise exception 'Mỗi lượt chỉ rút một lần.';end if;
  count_before:=jsonb_array_length(s->'hands'->p);s:=uno_private.draw(s,p,1);
  s:=s||jsonb_build_object('uno_target',null,'drew',true,'drawn',case when jsonb_array_length(s->'hands'->p)>count_before then s->>'last_draw' else null end,'notice','Đã rút bài. Chỉ được đánh lá vừa rút hoặc chuyển lượt.','effect','draw');return s;
 elsif action='pass' then
  if not (s->>'drew')::boolean then raise exception 'Hãy đánh hoặc rút bài trước.';end if;
  return s||jsonb_build_object('turn',uno_private.next_player(s,p),'drew',false,'drawn',null,'uno_target',null,'notice','Đã chuyển lượt.','effect','pass');
 elsif action<>'play' then raise exception 'Thao tác không hợp lệ.';end if;
 if not uno_private.legal(s,p,c) then raise exception 'Lá bài không hợp lệ.';end if;
 select * into card from uno_private.cards where id=c;
 chosen:=case when card.color='wild' then args->>'color' else card.color end;
 if chosen is null or chosen not in ('red','yellow','green','blue') then raise exception 'Hãy chọn một trong bốn màu.';end if;
 select exists(select 1 from jsonb_array_elements_text(s->'hands'->p) h join uno_private.cards x on x.id=h where x.color=s->>'color') into bad;
 s:=jsonb_set(s,array['hands',p],(s->'hands'->p)-c);
 s:=s||jsonb_build_object('discard',(s->'discard')||jsonb_build_array(c),'color',chosen,'drew',false,'drawn',null,'uno_target',null,'notice','Đã đánh bài.','effect',card.value);
 if jsonb_array_length(s->'hands'->p)=1 then s:=jsonb_set(s,'{uno_target}',to_jsonb(p));end if;
 if card.value='reverse' then s:=jsonb_set(s,'{direction}',to_jsonb(-(s->>'direction')::int));end if;
 target:=uno_private.next_player(s,p);
 if card.value='wild_draw4' then
  s:=s||jsonb_build_object('turn',target,'pending',jsonb_build_object('actor',p,'target',target,'illegal',bad,'candidate',case when jsonb_array_length(s->'hands'->p)=0 then p else null end),'notice','+4: chấp nhận hoặc thách thức.');return s;
 elsif card.value='draw2' then
  s:=uno_private.draw(s,target,2);target:=uno_private.next_player(s,target);s:=s||jsonb_build_object('notice','Đối thủ rút 2 lá và mất lượt.');
 elsif card.value='skip' or (card.value='reverse' and jsonb_array_length(s->'order')=2) then target:=uno_private.next_player(s,target);
 end if;
 s:=jsonb_set(s,'{turn}',to_jsonb(target));
 if jsonb_array_length(s->'hands'->p)=0 then s:=s||jsonb_build_object('status','finished','winner',p,'ended_at',now());end if;
 return s;
end;$$;
create or replace function uno_private.forfeit(s jsonb,p text) returns jsonb language plpgsql set search_path='' as $$
declare nxt text;
begin
 if s->>'status' is distinct from 'playing' or not(s->'order' ? p) then return s;end if;
 nxt:=uno_private.next_player(s,p);
 s:=s||jsonb_build_object('deck',uno_private.shuffle((s->'deck')||(s->'hands'->p)),'hands',(s->'hands')-p,'order',(s->'order')-p,'notice','Một người chơi đã bỏ cuộc.');
 if s->>'uno_target'=p then s:=jsonb_set(s,'{uno_target}','null');end if;
 if s->'pending'->>'target'=p and s->'pending'->>'candidate' is not null then s:=s||jsonb_build_object('status','finished','winner',s->'pending'->>'candidate','ended_at',now());end if;
 if s->'pending'->>'actor'=p or s->'pending'->>'target'=p then s:=jsonb_set(s,'{pending}','null');end if;
 if s->>'turn'=p then s:=s||jsonb_build_object('turn',nxt,'drew',false,'drawn',null);end if;
 if jsonb_array_length(s->'order')<2 then s:=s||jsonb_build_object('status','finished','winner',s->'order'->>0,'ended_at',now());end if;
 return s;
end;$$;
create or replace function uno_private.snapshot(r uno_private.rooms,p text) returns jsonb language plpgsql stable set search_path='' as $$
declare s jsonb:=r.state;players jsonb;legal jsonb;
begin
 select coalesce(jsonb_agg(v||jsonb_build_object('count',coalesce(jsonb_array_length(s->'hands'->(v->>'id')),0),'online',(v->>'seen')::timestamptz>now()-interval '30 seconds')),'[]') into players from jsonb_array_elements(r.players) v;
 select coalesce(jsonb_agg(v),'[]') into legal from jsonb_array_elements_text(coalesce(s->'hands'->p,'[]')) v where uno_private.legal(s,p,v);
 return jsonb_build_object('id',r.id,'code',r.code,'host',r.host,'capacity',r.capacity,'version',r.version,'players',players,'me',p,'status',coalesce(s->>'status','lobby'),'hand',coalesce(s->'hands'->p,'[]'),'legal',legal,'turn',s->>'turn','color',s->>'color','direction',s->'direction','top',s->'discard'->>(jsonb_array_length(s->'discard')-1),'drawCount',coalesce(jsonb_array_length(s->'deck'),0),'drew',s->'drew','pending',case when s->'pending'<>'null'::jsonb then jsonb_build_object('actor',s->'pending'->>'actor','target',s->'pending'->>'target') else null end,'unoTarget',s->>'uno_target','winner',s->>'winner','notice',s->>'notice','effect',s->>'effect','startedAt',s->>'started_at','endedAt',s->>'ended_at');
end;$$;
create or replace function public.uno_room(action text,room_code text default '',args jsonb default '{}',expected_version int default null,request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p text:=auth.uid()::text;r uno_private.rooms;member jsonb;players jsonb;idx int;name text;ids jsonb;changed boolean:=false;all_ready boolean;live int;
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
 if changed then r.version:=r.version+1;end if;
 update uno_private.rooms set players=r.players,state=r.state,host=r.host,receipts=r.receipts,version=r.version,expires_at=now()+interval '2 hours' where id=r.id;
 if changed then perform realtime.send(jsonb_build_object('version',r.version),'changed','uno:'||r.id::text,true);end if;
 return uno_private.snapshot(r,p);
end;$$;
create or replace function public.uno_is_member(topic text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from uno_private.rooms r,jsonb_array_elements(r.players) p where 'uno:'||r.id::text=topic and p->>'id'=auth.uid()::text and not(p->>'left')::boolean and r.expires_at>now());
$$;
revoke all on all functions in schema uno_private from public,anon,authenticated;
revoke all on function public.uno_room(text,text,jsonb,int,uuid) from public,anon;
grant execute on function public.uno_room(text,text,jsonb,int,uuid) to authenticated;
revoke all on function public.uno_is_member(text) from public,anon;
grant execute on function public.uno_is_member(text) to authenticated;
drop policy if exists uno_receive on realtime.messages;
create policy uno_receive on realtime.messages for select to authenticated using(extension='broadcast' and public.uno_is_member(realtime.topic()));
-- Clients cannot broadcast state or read uno_private tables.
alter table public.game_settings drop constraint if exists valid_setting;
alter table public.game_settings add constraint valid_setting check(key in ('rewards','radio','puzzleAlbum','moleAppearance','gameAvailability','onetAlbum','jigsawAlbum','minerAlbum','unoAssets'));
commit;
