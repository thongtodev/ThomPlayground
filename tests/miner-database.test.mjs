import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {localRankings} from '../src/gameRankings.js';

test('miner migration is repeatable, preserves existing scores, accepts new assets and ranks wins',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
   create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid,name text,bucket_id text,metadata jsonb);alter table storage.objects enable row level security;`);
  await db.exec(`create schema realtime;create table realtime.messages(extension text);alter table realtime.messages enable row level security;create function realtime.topic() returns text language sql as $$select ''::text$$;create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$select$$;`);
  await db.exec(readFileSync(new URL('../supabase.sql',import.meta.url),'utf8'));
  await db.exec(`insert into game_leaderboards(game_id,variant,player_name,metric_kind,metric_value,metric_label) values ('mole','classic-30','Thơm','score',300,'300 dép');`);
  // Reproduce the prior version's constraints and ranking function before upgrading.
  await db.exec("alter table game_images drop constraint valid_image_category;alter table game_images add constraint valid_image_category check(category in ('shared','home','mines','mole','tic','reaction','puzzle','onet','connect4','simon','jigsaw'));alter table game_leaderboards drop constraint valid_leaderboard_game;alter table game_leaderboards add constraint valid_leaderboard_game check(game_id in ('mines','mole','tic','reaction','puzzle','onet','connect4','simon','jigsaw')); ");
  await db.exec(readFileSync(new URL('../migrations/1.58.1.sql',import.meta.url),'utf8'));
  const migration=readFileSync(new URL('../migrations/1.59.0.sql',import.meta.url),'utf8');
  await db.exec(migration);await db.exec(migration);
  await db.exec("alter table game_settings drop constraint valid_setting;alter table game_settings add constraint valid_setting check(key in ('rewards','radio','puzzleAlbum','moleAppearance','gameAvailability','onetAlbum','jigsawAlbum'));insert into game_settings(key,value) values ('radio','{}') on conflict do nothing;");
  const albumMigration=readFileSync(new URL('../migrations/1.59.1.sql',import.meta.url),'utf8');
  await db.exec(albumMigration);await db.exec(albumMigration);
  await db.exec(`insert into game_settings(key,value) values ('minerAlbum','[{"id":"photo-1"}]');`);
  assert.equal((await db.query("select count(*)::int n from game_settings where key in ('radio','minerAlbum')")).rows[0].n,2);
  const id='00000000-0000-4000-8000-000000000001';
  await db.query("insert into game_images(id,name,image_url,storage_path,category) values ($1,'Thơm','https://example.com/a.webp','a.webp','miner')",[id]);
  for(const slot of ['card-miner','icon-miner','miner-character','miner-gold','miner-rock','miner-clock','miner-magnet','miner-boost'])await db.query('insert into game_assets(slot,image_id) values ($1,$2)',[slot,id]);
  const rows=[];
  for(const [variant,value,won] of [['level-1',150,true],['level-1',190,true],['level-2',270,true],['level-3',900,false]]){
   await db.query("insert into game_leaderboards(game_id,variant,player_name,player_id,metric_kind,metric_value,metric_label,details) values ('miner',$1,'Thơm',$2,'score',$3,'dép',$4)",[variant,id,value,JSON.stringify({won})]);
   rows.push({game_id:'miner',variant,player_id:id,player_name:'Thơm',metric_kind:'score',metric_value:value,details:{won},created_at:'2026-01-01'});
  }
  const online=(await db.query("select * from ranking_summary('miner',$1)",[id])).rows;
  assert.equal(Number(online[0].score),localRankings('miner',rows,[],id)[0].score);
  const details=(await db.query("select * from ranking_detail_page('miner',$1,0)",[id])).rows;
  assert.deepEqual(details.map(x=>x.variant),['level-1','level-2']);
  assert.equal((await db.query("select count(*)::int n from game_leaderboards where game_id='mole'")).rows[0].n,1);
 }finally{await db.close();}
});
