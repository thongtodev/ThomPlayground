import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {localRankings} from '../src/gameRankings.js';
import {GAMES} from '../src/games/catalog.js';

test('Diamond migration and local board agree on best winning score for levels 1–100',async()=>{
 assert.deepEqual(GAMES.slice(9,12).map(game=>game.id),['miner','uno','thom-diamond']);
 const db=new PGlite();
 try{
  await db.exec('create table game_settings(key text,value jsonb); create table game_images(id uuid); create table game_leaderboards(id bigint,game_id text,player_id uuid,player_name text,variant text,metric_kind text,metric_value numeric,details jsonb,created_at timestamptz)');
  const sql=readFileSync(new URL('../migrations/1.70.9.sql',import.meta.url),'utf8');
  await db.exec(sql);await db.exec(sql);
  const schema=readFileSync(new URL('../supabase.sql',import.meta.url),'utf8');
  await db.exec(schema.match(/create or replace function public\.ranking_summary\([\s\S]*?\$\$;/)[0]);
  const id='00000000-0000-4000-8000-000000000001',rows=[];
  for(const [level,score,won] of [[100,90,true],[2,20,true],[2,50,true],[3,700,false],[101,800,true]]){
   const row={game_id:'thom-diamond',player_id:id,player_name:'Thơm',variant:'level-'+level,metric_kind:'score',metric_value:score,details:{won}};
   rows.push(row);
   await db.query('insert into game_leaderboards(game_id,player_id,player_name,variant,metric_kind,metric_value,details) values($1,$2,$3,$4,$5,$6,$7)',Object.values(row).map(v=>typeof v==='object'?JSON.stringify(v):v));
  }
  const local=localRankings('thom-diamond',rows,[],id);
  assert.equal(local[0].score,140);
  const totals=await db.query("select score from ranking_summary('thom-diamond',$1)",[id]);
  assert.equal(Number(totals.rows[0].score),140);
  const details=await db.query("select variant from ranking_detail_page('thom-diamond',$1,0)",[id]);
  assert.deepEqual(details.rows.map(r=>r.variant),['level-2','level-100']);
 }finally{await db.close();}
});

test('first clear, replay and three-star rewards use the remaining inventory',async()=>{
 const {diamondLoot}=await import('../src/diamondScoring.js');
 const empty={hammer:0,swap:0,shuffle:0,extra:0};
 for(const [index,key] of ['hammer','swap','shuffle','extra'].entries())
  assert.equal(diamondLoot(index+1,0,1,empty).boosters[key],1);
 assert.equal(diamondLoot(1,0,3,empty).boosters.hammer,2);
 assert.equal(diamondLoot(1,3,3,empty).boosters.hammer,1);
 assert.deepEqual(diamondLoot(1,1,2,empty).loot,[]);
 assert.equal(empty.hammer,0);
});

test('existing clear records unlock shared achievements and replays count once',async()=>{
 const {createServer}=await import('vite');
 const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
 const store=new Map();
 globalThis.localStorage={getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)};
 try{
  const {mergeConfig,reconcileProgress,trackEvent}=await vite.ssrLoadModule('/src/gameFeatures.js');
  const config=mergeConfig({rewards:[]});
  store.set('thom-kim-cuong-progress-v1',JSON.stringify({results:{1:{stars:3}}}));
  const old=reconcileProgress({metrics:{},unlocked:{},completed:[]},config,[]);
  assert.ok(old.unlocked['diamond-first']&&old.unlocked['diamond-stars']);
  const record=count=>trackEvent(old,{type:'thom_diamond_level_win',levelCount:count,perfectCount:1},config.rewards).progress;
  assert.equal(record(1).metrics.diamond_levels,1);
  assert.ok(record(25).unlocked['diamond-25']);
  assert.ok(!record(49).unlocked['diamond-50']);
  assert.ok(record(50).unlocked['diamond-50']);
  assert.ok(!record(74).unlocked['diamond-75']);
  assert.ok(record(75).unlocked['diamond-75']);
  assert.ok(record(100).unlocked['diamond-master']);
 }finally{await vite.close();delete globalThis.localStorage;}
});
