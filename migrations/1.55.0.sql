-- Run once in Supabase SQL Editor before deploying 1.55.0.
begin;
alter table public.game_leaderboards add column if not exists player_id uuid;
create index if not exists game_leaderboards_player_best_idx
 on public.game_leaderboards(game_id,variant,metric_kind,player_id,metric_value,created_at,id);

create or replace function public.leaderboard_variants(p_game_id text)
returns table(variant text, variant_label text, metric_kind text)
language sql stable security invoker set search_path = public as $$
 select distinct on (l.variant,l.metric_kind) l.variant,l.variant_label,l.metric_kind
 from public.game_leaderboards l where l.game_id=p_game_id
 order by l.variant,l.metric_kind,l.created_at desc,l.id desc;
$$;
create or replace function public.leaderboard_page(p_game_id text,p_variant text,p_metric_kind text,p_offset integer default 0,p_limit integer default 20)
returns setof public.game_leaderboards
language sql stable security invoker set search_path = public as $$
 with best as (
 select distinct on (coalesce(l.player_id::text,'legacy:'||lower(btrim(l.player_name)))) l.*
 from public.game_leaderboards l
 where l.game_id=p_game_id and l.variant=p_variant and l.metric_kind=p_metric_kind
 order by coalesce(l.player_id::text,'legacy:'||lower(btrim(l.player_name))),
 case when p_metric_kind in ('time','steps','reaction') then l.metric_value else -l.metric_value end,
 l.created_at,l.id
 )
 select * from best
 order by case when p_metric_kind in ('time','steps','reaction') then metric_value else -metric_value end,created_at,id
 limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
$$;
revoke all on function public.leaderboard_variants(text) from public;
revoke all on function public.leaderboard_page(text,text,text,integer,integer) from public;
grant execute on function public.leaderboard_variants(text) to anon,authenticated;
grant execute on function public.leaderboard_page(text,text,text,integer,integer) to anon,authenticated;

-- One database snapshot, no PostgREST row limit. Files are downloaded afterwards.
create or replace function public.export_game_backup()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
 if not public.is_game_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 return jsonb_build_object(
 'format','thom-playground-backup','version',1,'exported_at',now(),
 'tables',jsonb_build_object(
  'game_admins',coalesce((select jsonb_agg(t order by user_id) from public.game_admins t),'[]'::jsonb),
  'game_images',coalesce((select jsonb_agg(t order by id) from public.game_images t),'[]'::jsonb),
  'game_assets',coalesce((select jsonb_agg(t order by slot) from public.game_assets t),'[]'::jsonb),
  'game_settings',coalesce((select jsonb_agg(t order by key) from public.game_settings t),'[]'::jsonb),
  'game_leaderboards',coalesce((select jsonb_agg(t order by id) from public.game_leaderboards t),'[]'::jsonb)
 ),
 'storage_objects',coalesce((select jsonb_agg(jsonb_build_object('name',name,'metadata',metadata) order by name) from storage.objects where bucket_id='game-images'),'[]'::jsonb)
 );
end;
$$;
revoke all on function public.export_game_backup() from public,anon;
grant execute on function public.export_game_backup() to authenticated;
commit;
