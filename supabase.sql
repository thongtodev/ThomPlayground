-- Database schema and migration for current release. Safe to run on an existing project.
-- Never place service_role or database passwords in frontend environment variables.
create table if not exists public.game_admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.game_images (id uuid primary key, name text not null, image_url text not null, storage_path text not null unique, created_at timestamptz not null default now());
alter table public.game_images add column if not exists category text not null default 'shared';
alter table public.game_images drop constraint if exists valid_image_category;
alter table public.game_images add constraint valid_image_category check (category in ('shared','home','mines','mole','tic','reaction','puzzle','onet','connect4','simon','jigsaw','miner'));
create table if not exists public.game_assets (slot text primary key, image_id uuid not null references public.game_images(id) on delete cascade, transform jsonb, updated_at timestamptz not null default now());
alter table public.game_assets add column if not exists transform jsonb;
-- The former hammer assignment is retired; its library image is kept.
delete from public.game_assets where slot='icon-hammer';
alter table public.game_assets drop constraint if exists valid_slot;
alter table public.game_assets add constraint valid_slot check (slot in (
 'card-uno','card-thom-diamond',
 'card-miner','icon-miner','miner-character','miner-slipper','miner-pair','miner-gold','miner-mic','miner-rock','miner-boulder','miner-clock','miner-magnet','miner-boost',
 'hero','card-mines','card-mole','card-tic','card-reaction','card-puzzle','card-onet','card-connect4','card-simon','card-jigsaw','mines','mole','mole-bomb','mole-trap','tic-x','tic-o','reaction','reaction-bomb','puzzle-1','puzzle-2','puzzle-3','connect4-red','connect4-yellow','simon-1','simon-2','simon-3','simon-4',
 'icon-logo','icon-home','icon-onet','icon-connect4','icon-simon','icon-jigsaw','card-onet','icon-slipper','icon-sound-on','icon-sound-off','icon-bomb','icon-mines','icon-mole','icon-tic','icon-reaction','icon-puzzle','icon-trophy','icon-gallery','icon-radio','icon-flag','icon-play','icon-pause','icon-reset','icon-lock','icon-micro'
));
create table if not exists public.game_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now(), constraint valid_setting check (key in ('rewards','radio','puzzleAlbum','moleAppearance','gameAvailability','onetAlbum','jigsawAlbum','minerAlbum','unoAssets','thomDiamondCrops')));
alter table public.game_settings drop constraint if exists valid_setting;
alter table public.game_settings add constraint valid_setting check (key in ('rewards','radio','puzzleAlbum','moleAppearance','gameAvailability','onetAlbum','jigsawAlbum','minerAlbum','unoAssets','thomDiamondCrops'));
create or replace function public.is_game_admin() returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from public.game_admins where user_id=auth.uid());
$$;
revoke all on function public.is_game_admin() from public;
grant execute on function public.is_game_admin() to authenticated;
alter table public.game_admins enable row level security;
alter table public.game_images enable row level security;
alter table public.game_assets enable row level security;
alter table public.game_settings enable row level security;
-- Admin roster is never exposed via a public SELECT policy.
drop policy if exists "Public may read image gallery" on public.game_images;
drop policy if exists "Public may read assignments" on public.game_assets;
drop policy if exists "Admins may insert images" on public.game_images;
drop policy if exists "Admins may update image categories" on public.game_images;
drop policy if exists "Admins may delete images" on public.game_images;
drop policy if exists "Admins may insert assignments" on public.game_assets;
drop policy if exists "Admins may update assignments" on public.game_assets;
drop policy if exists "Admins may delete assignments" on public.game_assets;
drop policy if exists "Public may read game settings" on public.game_settings;
drop policy if exists "Admins may write game settings" on public.game_settings;
drop policy if exists "Admins may update game settings" on public.game_settings;
create policy "Public may read image gallery" on public.game_images for select to anon,authenticated using (true);
create policy "Public may read assignments" on public.game_assets for select to anon,authenticated using (true);
create policy "Admins may insert images" on public.game_images for insert to authenticated with check (public.is_game_admin());
create policy "Admins may update image categories" on public.game_images for update to authenticated using (public.is_game_admin()) with check (public.is_game_admin());
create policy "Admins may delete images" on public.game_images for delete to authenticated using (public.is_game_admin());
create policy "Admins may insert assignments" on public.game_assets for insert to authenticated with check (public.is_game_admin());
create policy "Admins may update assignments" on public.game_assets for update to authenticated using (public.is_game_admin()) with check (public.is_game_admin());
create policy "Admins may delete assignments" on public.game_assets for delete to authenticated using (public.is_game_admin());
create policy "Public may read game settings" on public.game_settings for select to anon,authenticated using (true);
create policy "Admins may write game settings" on public.game_settings for insert to authenticated with check (public.is_game_admin());
create policy "Admins may update game settings" on public.game_settings for update to authenticated using (public.is_game_admin()) with check (public.is_game_admin());
grant select on public.game_images,public.game_assets,public.game_settings to anon,authenticated;
grant insert,update,delete on public.game_images,public.game_assets,public.game_settings to authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('game-images','game-images',true,5242880,array['image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/webp'];
drop policy if exists "Public can read game images" on storage.objects;
drop policy if exists "Admins can upload game images" on storage.objects;
drop policy if exists "Admins can delete game images" on storage.objects;
create policy "Public can read game images" on storage.objects for select to anon,authenticated using (bucket_id='game-images');
create policy "Admins can upload game images" on storage.objects for insert to authenticated with check (bucket_id='game-images' and public.is_game_admin());
create policy "Admins can delete game images" on storage.objects for delete to authenticated using (bucket_id='game-images' and public.is_game_admin());
-- After creating an Auth user in Supabase Dashboard, authorize it via SQL Editor:
-- insert into public.game_admins(user_id) values ('PASTE_AUTH_USER_UUID_HERE');
-- Frontend uses only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.

-- Public game leaderboards. Anyone may read and submit a score; public clients
-- cannot update or delete submitted records. Server-side anti-cheat requires
-- a trusted Edge Function and is intentionally not claimed by this client flow.
create table if not exists public.game_leaderboards (
 id bigint generated by default as identity primary key,
 game_id text not null,
 variant text not null default 'default',
 variant_label text not null default 'Mặc định',
 player_name text not null,
 metric_kind text not null,
 metric_value numeric not null,
 metric_label text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 constraint valid_leaderboard_game check (game_id in ('mines','mole','tic','reaction','puzzle','onet','connect4','simon','jigsaw','miner','thom-diamond')),
 constraint valid_leaderboard_variant check (char_length(variant) between 1 and 100),
 constraint valid_leaderboard_variant_label check (char_length(variant_label) between 1 and 80),
 constraint valid_leaderboard_player_name check (char_length(btrim(player_name)) between 2 and 24),
 constraint valid_leaderboard_metric_kind check (metric_kind in ('score','time','steps','reaction','wins')),
 constraint valid_leaderboard_metric_value check (metric_value >= 0 and metric_value <= 1000000000),
 constraint valid_leaderboard_metric_label check (char_length(metric_label) between 1 and 60),
 constraint valid_leaderboard_details check (jsonb_typeof(details) = 'object')
);
alter table public.game_leaderboards drop constraint if exists valid_leaderboard_game;
alter table public.game_leaderboards add constraint valid_leaderboard_game check (game_id in ('mines','mole','tic','reaction','puzzle','onet','connect4','simon','jigsaw','miner','thom-diamond'));
create index if not exists game_leaderboards_game_variant_metric_idx
 on public.game_leaderboards (game_id, variant, metric_kind, metric_value, created_at);
create index if not exists game_leaderboards_created_idx
 on public.game_leaderboards (created_at desc);
alter table public.game_leaderboards enable row level security;
drop policy if exists "Public may read game leaderboards" on public.game_leaderboards;
drop policy if exists "Public may submit game leaderboard entries" on public.game_leaderboards;
create policy "Public may read game leaderboards"
 on public.game_leaderboards for select to anon, authenticated using (true);
create policy "Public may submit game leaderboard entries"
 on public.game_leaderboards for insert to anon, authenticated
 with check (
  char_length(btrim(player_name)) between 2 and 24
  and metric_value >= 0 and metric_value <= 1000000000
  and jsonb_typeof(details) = 'object'
 );
grant select, insert on public.game_leaderboards to anon, authenticated;
grant usage, select on sequence public.game_leaderboards_id_seq to anon, authenticated;

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
-- One position per player. Apply the viewer filter only after ranking everyone.
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
revoke all on function public.game_rankings(text,uuid) from public;
grant execute on function public.game_rankings(text,uuid) to anon,authenticated;

create index if not exists game_ranking_detail_lookup on public.game_leaderboards
 (game_id,(coalesce(player_id::text,'legacy:'||lower(btrim(player_name)))),variant);

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
create or replace function public.ranking_summary(p_game text,p_player uuid)
returns table(id text,player_name text,"position" bigint,score numeric,secondary numeric)
language sql stable security invoker set search_path=public as $$
 with runs as (select * from public.ranking_runs(p_game,null)),
 per_variant as (
  select who,variant,case when p_game in ('mines','reaction','puzzle','jigsaw') then min(val) else max(val) end best,
   max(streak) streak from runs group by who,variant
 ), totals as (
  select who,sum(case when p_game in ('puzzle','jigsaw') then case when variant like '%-hard' then 250 else 100 end
    when p_game='simon' then best*case variant when 'hard' then 3 when 'medium' then 2 else 1 end
    when p_game in ('tic','connect4','mines','reaction') then 1 else best end) score,
   case when p_game='mines' then sum(best) when p_game='reaction' then avg(best)
    when p_game in ('tic','connect4') then max(streak) else 0 end secondary from per_variant group by who
 ), names as (
  select distinct on (who) who,player_name from runs order by who,created_at desc,id desc
 ), ranked as (
  select t.*,n.player_name,row_number() over(order by score desc,
    case when p_game in ('tic','connect4') then -secondary else secondary end,who collate "C") as position
  from totals t join names n using(who)
 )
 select who,ranked.player_name,ranked.position,ranked.score,ranked.secondary
 from ranked where ranked.position<=9 or who=p_player::text order by ranked.position;
$$;
revoke all on function public.ranking_summary(text,uuid) from public;
grant execute on function public.ranking_summary(text,uuid) to anon,authenticated;

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
revoke all on function public.ranking_runs(text,text),public.ranking_detail_page(text,text,int) from public;
grant execute on function public.ranking_runs(text,text),public.ranking_detail_page(text,text,int) to anon,authenticated;
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

-- JGKiD Uno online (1.61.0)
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
 return jsonb_build_object('id',r.id,'code',r.code,'host',r.host,'capacity',r.capacity,'version',r.version,'players',players,'me',p,'status',coalesce(s->>'status','lobby'),'hand',coalesce(s->'hands'->p,'[]'),'legal',legal,'turn',s->>'turn','color',s->>'color','direction',s->'direction','order',coalesce(s->'order','[]'::jsonb),'top',s->'discard'->>(jsonb_array_length(s->'discard')-1),'drawCount',coalesce(jsonb_array_length(s->'deck'),0),'drew',s->'drew','pending',case when s->'pending'<>'null'::jsonb then jsonb_build_object('actor',s->'pending'->>'actor','target',s->'pending'->>'target') else null end,'unoTarget',s->>'uno_target','winner',s->>'winner','notice',s->>'notice','effect',s->>'effect','startedAt',s->>'started_at','endedAt',s->>'ended_at');
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
alter table public.game_settings add constraint valid_setting check(key in ('rewards','radio','puzzleAlbum','moleAppearance','gameAvailability','onetAlbum','jigsawAlbum','minerAlbum','unoAssets','thomDiamondCrops'));
commit;
