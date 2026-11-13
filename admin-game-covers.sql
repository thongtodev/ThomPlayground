-- Run once in Supabase SQL Editor to enable the two new home-card slots.
BEGIN;
alter table public.game_assets drop constraint if exists valid_slot;
alter table public.game_assets add constraint valid_slot check (slot in (
 'card-uno','card-thom-diamond',
 'card-miner','icon-miner','miner-character','miner-slipper','miner-pair','miner-gold','miner-mic','miner-rock','miner-boulder','miner-clock','miner-magnet','miner-boost',
 'hero','card-mines','card-mole','card-tic','card-reaction','card-puzzle','card-onet','card-connect4','card-simon','card-jigsaw','mines','mole','mole-bomb','mole-trap','tic-x','tic-o','reaction','reaction-bomb','puzzle-1','puzzle-2','puzzle-3','connect4-red','connect4-yellow','simon-1','simon-2','simon-3','simon-4',
 'icon-logo','icon-home','icon-onet','icon-connect4','icon-simon','icon-jigsaw','card-onet','icon-slipper','icon-sound-on','icon-sound-off','icon-bomb','icon-mines','icon-mole','icon-tic','icon-reaction','icon-puzzle','icon-trophy','icon-gallery','icon-radio','icon-flag','icon-play','icon-pause','icon-reset','icon-lock','icon-micro'
));
COMMIT;
