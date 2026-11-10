-- Sum one normalized personal best per submitted Level. Existing rows stay auditable.
create or replace function public.onet_total_page(p_offset int default 0,p_limit int default 20)
returns table(id text,player_name text,metric_value numeric,created_at timestamptz,levels jsonb)
language sql stable security invoker set search_path=public as $$
 with runs as (
  select coalesce(r.player_id::text,'legacy:'||lower(btrim(r.player_name))) as who,
   r.player_name,r.created_at,r.id,substring(r.variant from 7)::int as lvl,
   case when r.details->>'scoreVersion'='2' then least(3400,r.metric_value)
    else 2400+round(1000*least(1::numeric,(r.metric_value-2400)/(10*
     case r.variant when 'level-1' then 360 when 'level-2' then 330 when 'level-3' then 300
     when 'level-4' then 285 when 'level-5' then 270 when 'level-6' then 255
     when 'level-7' then 240 when 'level-8' then 225 when 'level-9' then 210 else 195 end))) end as score
  from public.game_leaderboards r where r.game_id='onet' and r.metric_kind='score'
   and r.metric_value>=2400 and r.variant ~ '^level-([1-9]|1[0-9]|20)$'
 ), best as (
  select distinct on (who,lvl) who,lvl,score,created_at from runs order by who,lvl,score desc,created_at,id
 ), names as (
  select distinct on (who) who,player_name from runs order by who,created_at desc,id desc
 )
 select b.who,n.player_name,sum(b.score),max(b.created_at),jsonb_object_agg(b.lvl,b.score)
 from best b join names n using(who) group by b.who,n.player_name
 order by sum(b.score) desc,max(b.created_at),b.who
 limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
$$;
revoke all on function public.onet_total_page(int,int) from public;
grant execute on function public.onet_total_page(int,int) to anon,authenticated;
