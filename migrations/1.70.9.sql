BEGIN;
alter table public.game_leaderboards drop constraint if exists valid_leaderboard_game;
alter table public.game_leaderboards add constraint valid_leaderboard_game check (game_id in ('mines','mole','tic','reaction','puzzle','onet','connect4','simon','jigsaw','miner','thom-diamond'));

create or replace function public.game_rankings(p_game text,p_player uuid)
returns table(id text,player_name text,"position" bigint,score numeric,secondary numeric,breakdown jsonb)
language sql stable security invoker set search_path=public as $$
 with album_ids as (
  select coalesce(e.item->>'id',e.item#>>'{}') as image_id
  from public.game_settings s
  cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) e(item)
  join public.game_images i on i.id::text=coalesce(e.item->>'id',e.item#>>'{}')
  where s.key=p_game||'Album'
 ), runs as (
  select coalesce(r.player_id::text,'legacy:'||lower(btrim(r.player_name))) who,r.player_name,r.created_at,r.id,r.variant,
   case when p_game='onet' and coalesce(r.details->>'scoreVersion','')<>'2' then
     2400+round(1000*least(1::numeric,(r.metric_value-2400)/(10*case r.variant
       when 'level-1' then 360 when 'level-2' then 330 when 'level-3' then 300 when 'level-4' then 285
       when 'level-5' then 270 when 'level-6' then 255 when 'level-7' then 240 when 'level-8' then 225
       when 'level-9' then 210 else 195 end)))
    when p_game='onet' then least(3400,r.metric_value) else r.metric_value end val,
   case when r.details->>'aiStreak' ~ '^[0-9]{1,9}$' then (r.details->>'aiStreak')::int else 0 end streak
  from public.game_leaderboards r where r.game_id=p_game and case p_game
   when 'puzzle' then r.metric_kind='steps' and r.variant ~ '-(easy|hard)$' and
    (regexp_replace(r.variant,'-(easy|hard)$','') in (select image_id from album_ids)
     or (r.variant in ('default-thom-easy','default-thom-hard') and not exists(select from album_ids)))
   when 'jigsaw' then r.metric_kind='steps' and r.variant ~ '-(easy|hard)$' and regexp_replace(r.variant,'-(easy|hard)$','') in (select image_id from album_ids)
   when 'thom-diamond' then r.metric_kind='score' and r.variant ~ '^level-([1-9][0-9]?|100)$' and r.details->'won'='true'::jsonb
   when 'miner' then r.metric_kind='score' and r.variant ~ '^level-([1-9]|10)$' and r.metric_value>0 and r.details->>'won'='true'
   when 'simon' then r.metric_kind='score' and r.variant in ('easy','medium','hard')
   when 'onet' then r.metric_kind='score' and r.variant ~ '^level-([1-9]|1[0-9]|20)$' and r.metric_value>=2400
   when 'tic' then r.metric_kind='wins' and r.metric_value>0 and coalesce(r.details->>'mode','ai')='ai'
     and r.variant ~ '^[0-9]+-(easy|medium|hard|impossible)$' and coalesce(r.details->>'winner','')<>'draw'
     and (r.details->>'playerMark' is null or r.details->>'winner'=r.details->>'playerMark')
   when 'connect4' then r.metric_kind='score' and r.metric_value>0 and r.variant ~ '^ai-(easy|medium|hard)$' and coalesce(r.details->>'mode','ai')='ai'
   when 'mines' then r.metric_kind='time' and r.variant in ('easy','medium','hard','expert') and coalesce(r.details->>'won','true')='true'
   when 'reaction' then r.metric_kind='reaction' and r.metric_value>0 and coalesce(r.details->>'validRounds','1')<>'0'
   when 'mole' then r.metric_kind='score' else false end
 ), per_variant as (
  select who,variant,case when p_game in ('mines','reaction','puzzle','jigsaw') then min(val) else max(val) end best,
   max(streak) streak from runs group by who,variant
 ), totals as (
  select who,sum(case when p_game in ('puzzle','jigsaw') then case when variant like '%-hard' then 250 else 100 end
    when p_game='simon' then best*case variant when 'hard' then 3 when 'medium' then 2 else 1 end
    when p_game in ('tic','connect4','mines','reaction') then 1 else best end) score,
   case when p_game='mines' then sum(best) when p_game='reaction' then avg(best)
    when p_game in ('tic','connect4') then max(streak) else 0 end secondary,
   jsonb_object_agg(variant,best) breakdown from per_variant group by who
 ), names as (
  select distinct on (who) who,player_name from runs order by who,created_at desc,id desc
 ), ranked as (
  select t.*,n.player_name,row_number() over(order by score desc,
    case when p_game in ('tic','connect4') then -secondary else secondary end,who collate "C") as position
  from totals t join names n using(who)
 )
 select who,ranked.player_name,ranked.position,ranked.score,ranked.secondary,ranked.breakdown
 from ranked where ranked.position<=9 or who=p_player::text order by ranked.position;
$$;
create or replace function public.ranking_runs(p_game text,p_who text)
returns table(who text,player_name text,created_at timestamptz,id bigint,variant text,val numeric,streak int)
language sql stable security invoker set search_path=public as $$
 with album_ids as (
  select coalesce(e.item->>'id',e.item#>>'{}') as image_id
  from public.game_settings s
  cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end) e(item)
  join public.game_images i on i.id::text=coalesce(e.item->>'id',e.item#>>'{}')
  where s.key=p_game||'Album'
 ), runs as (
  select coalesce(r.player_id::text,'legacy:'||lower(btrim(r.player_name))) who,r.player_name,r.created_at,r.id,r.variant,
   case when p_game='onet' and coalesce(r.details->>'scoreVersion','')<>'2' then
     2400+round(1000*least(1::numeric,(r.metric_value-2400)/(10*case r.variant
       when 'level-1' then 360 when 'level-2' then 330 when 'level-3' then 300 when 'level-4' then 285
       when 'level-5' then 270 when 'level-6' then 255 when 'level-7' then 240 when 'level-8' then 225
       when 'level-9' then 210 else 195 end)))
    when p_game='onet' then least(3400,r.metric_value) else r.metric_value end val,
   case when r.details->>'aiStreak' ~ '^[0-9]{1,9}$' then (r.details->>'aiStreak')::int else 0 end streak
  from public.game_leaderboards r where r.game_id=p_game
   and (p_who is null or coalesce(r.player_id::text,'legacy:'||lower(btrim(r.player_name)))=p_who)
   and case p_game
   when 'puzzle' then r.metric_kind='steps' and r.variant ~ '-(easy|hard)$' and
    (regexp_replace(r.variant,'-(easy|hard)$','') in (select image_id from album_ids)
     or (r.variant in ('default-thom-easy','default-thom-hard') and not exists(select from album_ids)))
   when 'jigsaw' then r.metric_kind='steps' and r.variant ~ '-(easy|hard)$' and regexp_replace(r.variant,'-(easy|hard)$','') in (select image_id from album_ids)
   when 'thom-diamond' then r.metric_kind='score' and r.variant ~ '^level-([1-9][0-9]?|100)$' and r.details->'won'='true'::jsonb
   when 'miner' then r.metric_kind='score' and r.variant ~ '^level-([1-9]|10)$' and r.metric_value>0 and r.details->>'won'='true'
   when 'simon' then r.metric_kind='score' and r.variant in ('easy','medium','hard')
   when 'onet' then r.metric_kind='score' and r.variant ~ '^level-([1-9]|1[0-9]|20)$' and r.metric_value>=2400
   when 'tic' then r.metric_kind='wins' and r.metric_value>0 and coalesce(r.details->>'mode','ai')='ai'
     and r.variant ~ '^[0-9]+-(easy|medium|hard|impossible)$' and coalesce(r.details->>'winner','')<>'draw'
     and (r.details->>'playerMark' is null or r.details->>'winner'=r.details->>'playerMark')
   when 'connect4' then r.metric_kind='score' and r.metric_value>0 and r.variant ~ '^ai-(easy|medium|hard)$' and coalesce(r.details->>'mode','ai')='ai'
   when 'mines' then r.metric_kind='time' and r.variant in ('easy','medium','hard','expert') and coalesce(r.details->>'won','true')='true'
   when 'reaction' then r.metric_kind='reaction' and r.metric_value>0 and coalesce(r.details->>'validRounds','1')<>'0'
   when 'mole' then r.metric_kind='score' else false end
 ) select * from runs;
$$;
create or replace function public.ranking_detail_page(p_game text,p_who text,p_offset int default 0)
returns table(variant text,best numeric)
language sql stable security invoker set search_path=public as $$
 with items as (
  select r.variant,case when p_game in ('mines','reaction','puzzle','jigsaw') then min(r.val) else max(r.val) end best
  from public.ranking_runs(p_game,p_who) r
  where p_who is not null group by r.variant
 ), album as (
  select coalesce(e.item->>'id',e.item#>>'{}') img,min(e.ord) as idx from public.game_settings s
  cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value)='array' then s.value else '[]'::jsonb end)
  with ordinality e(item,ord) where s.key=p_game||'Album' group by 1
 )
 select i.variant,i.best from items i left join album a on a.img=regexp_replace(i.variant,'-(easy|hard)$','')
 order by a.idx,case when p_game in ('onet','miner','thom-diamond') then substring(i.variant from 7)::int end,
  case when i.variant in ('easy','medium','hard','expert') then array_position(array['easy','medium','hard','expert'],i.variant) end,
  i.variant collate "C" limit 13 offset greatest(p_offset,0);
$$;
COMMIT;
