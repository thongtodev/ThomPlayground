-- Thơm Playground 1.70.1: allow the Admin crop configuration for Thơm Kim Cương.
-- Run once in Supabase SQL Editor on an existing database.
-- No tables, rows, original images or saved progress are deleted.
BEGIN;
ALTER TABLE public.game_settings DROP CONSTRAINT IF EXISTS valid_setting;
ALTER TABLE public.game_settings ADD CONSTRAINT valid_setting CHECK (
  key IN (
    'rewards', 'radio', 'puzzleAlbum', 'moleAppearance',
    'gameAvailability', 'onetAlbum', 'jigsawAlbum', 'minerAlbum',
    'unoAssets', 'thomDiamondCrops'
  )
);
COMMIT;
