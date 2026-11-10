-- 1.61.3: run after migration-1.61.0.sql. Automatic pass after an unplayable draw.
begin;
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
  s:=s||jsonb_build_object('uno_target',null,'drew',true,'drawn',case when jsonb_array_length(s->'hands'->p)>count_before then s->>'last_draw' else null end,'notice','Chim cá rút được lá đánh được rồi, ra bài nào!','effect','draw');
  if s->>'drawn' is null or not uno_private.legal(s,p,s->>'drawn') then
   s:=s||jsonb_build_object('turn',uno_private.next_player(s,p),'drew',false,'drawn',null,'notice','Lá này chưa hợp rồi, nhường chim cá kế bên nhé!');
  end if;return s;
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

commit;
