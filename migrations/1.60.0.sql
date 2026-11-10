-- Each image/difficulty earns its reward once. Compare moves within each board layout.
create or replace function public.jigsaw_detail_page(p_who text,p_offset int default 0)
returns table(variant text,best numeric,board_best numeric,tray_best numeric)
language sql stable security invoker set search_path=public as $$
 with page as (
  select v.variant,v.best,v.seq as ord
  from public.ranking_detail_page('jigsaw',p_who,p_offset) with ordinality v(variant,best,seq)
  order by v.seq
 )
 select p.variant,p.best,
  min(l.metric_value) filter(where l.details->>'layout'='board'),
  min(l.metric_value) filter(where l.details->>'layout' is distinct from 'board')
 from page p join public.game_leaderboards l on l.game_id='jigsaw' and l.variant=p.variant and l.metric_kind='steps'
  and coalesce(l.player_id::text,'legacy:'||lower(btrim(l.player_name)))=p_who
 group by p.ord,p.variant,p.best order by p.ord;
$$;
revoke all on function public.jigsaw_detail_page(text,int) from public;
grant execute on function public.jigsaw_detail_page(text,int) to anon,authenticated;
