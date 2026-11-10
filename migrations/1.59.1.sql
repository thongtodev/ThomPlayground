-- Run after migration-1.59.0.sql, before deploying 1.59.1.
begin;
alter table public.game_settings drop constraint if exists valid_setting;
alter table public.game_settings add constraint valid_setting check (key in ('rewards','radio','puzzleAlbum','moleAppearance','gameAvailability','onetAlbum','jigsawAlbum','minerAlbum'));
commit;
