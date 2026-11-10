import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {localRankings,movement,recordAiOutcome} from '../src/gameRankings.js';

test('online and local rankings use the same submitted bests for all nine games',async()=>{
 const db=new PGlite();
 const user=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const album=[{id:user(100)}],viewer=user(12),rows=[];
 const run=(game_id,variant,metric_kind,metric_value,details={},n=12)=>rows.push({id:rows.length+1,game_id,variant,metric_kind,metric_value,details,player_id:user(n),player_name:'Player '+n,created_at:'2026-01-01'});
 for(const game of ['puzzle','jigsaw']){
  run(game,user(100)+'-easy','steps',80);run(game,user(100)+'-easy','steps',50);
  run(game,user(100)+'-hard','steps',120);run(game,'obsolete-hard','steps',30);run(game,'default-thom-easy','steps',40);
 }
 run('jigsaw',user(100)+'-easy','steps',12,{layout:'board'});
 run('onet','level-1','score',4200);run('onet','level-1','score',2800,{scoreVersion:2});run('onet','level-20','score',3200,{scoreVersion:2});
 run('tic','3-medium','wins',3,{mode:'ai'});run('tic','10-impossible','wins',4,{mode:'ai',aiStreak:2});run('tic','3-local','wins',50,{mode:'local'});
 run('connect4','ai-hard','score',87,{aiStreak:3});run('connect4','local-local','score',99,{mode:'local'});
 run('mines','easy','time',22);run('mines','easy','time',15);run('mines','expert','time',90);
 run('reaction','classic','reaction',210);run('reaction','bomb','reaction',250);run('reaction','classic','reaction',0);
 run('simon','medium','score',8);run('simon','hard','score',10);
 for(let n=1;n<=12;n++)run('mole','classic-30','score',300-n,{},n);
 run('mole','classic-30','score',100);
 const cols='id bigint,game_id text,variant text,metric_kind text,metric_value numeric,details jsonb,player_id uuid,player_name text,created_at timestamptz';
 try{
  await db.exec('create role anon;create role authenticated;create table game_leaderboards('+cols+');create table game_settings(key text,value jsonb);create table game_images(id uuid);');
  await db.query('insert into game_leaderboards select * from jsonb_to_recordset($1) as r('+cols+')',[JSON.stringify(rows)]);
  await db.query('insert into game_images values ($1)',[album[0].id]);
  await db.query("insert into game_settings values ('puzzleAlbum',$1),('jigsawAlbum',$1)",[JSON.stringify(album)]);
  const sql=readFileSync(new URL('../migrations/1.58.0.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
  const popupSql=readFileSync(new URL('../migrations/1.58.1.sql',import.meta.url),'utf8');
  await db.exec(popupSql);await db.exec(popupSql);
  await db.exec(readFileSync(new URL('../migrations/1.60.0.sql',import.meta.url),'utf8'));
  const easy=(await db.query('select * from jigsaw_detail_page($1)',[viewer])).rows.find(r=>r.variant.endsWith('-easy'));
  assert.equal(+easy.board_best,12);assert.equal(+easy.tray_best,50);
  const expected={puzzle:[350,0],jigsaw:[350,0],onet:[6100,0],tic:[2,2],connect4:[1,3],mines:[2,105],reaction:[2,230],simon:[46,0],mole:[288,0]};
  for(const [game,[score,secondary]] of Object.entries(expected)){
   const online=(await db.query('select * from game_rankings($1,$2)',[game,viewer])).rows;
   const summary=(await db.query('select * from ranking_summary($1,$2)',[game,viewer])).rows;
   assert.deepEqual(summary,online.map(({breakdown,...r})=>r));
   const details=(await db.query('select * from ranking_detail_page($1,$2,0)',[game,viewer])).rows;
   assert.deepEqual(Object.fromEntries(details.map(r=>[r.variant,+r.best])),online.find(r=>r.id===viewer).breakdown);
   const local=localRankings(game,rows,album,viewer);
   assert.deepEqual(online.map(r=>[r.id,+r.position,+r.score,+r.secondary,r.breakdown]),local.map(r=>[r.id,r.position,r.score,r.secondary,r.breakdown]),game);
   const me=online.find(r=>r.id===viewer);assert.equal(+me.score,score);assert.equal(+me.secondary,secondary);
   if(game==='mole'){assert.equal(online.length,10);assert.equal(+me.position,12);}
  }
  assert.equal((await db.query("select * from game_rankings('mole',$1)",[user(1)])).rows.length,9);
  assert.equal((await db.query("select * from game_rankings('mole',$1)",[user(99)])).rows.length,9);
  await db.query(`insert into game_leaderboards(id,game_id,variant,player_id,player_name,metric_kind,metric_value,details,created_at)
   select 1000+g,'mole','test-'||g,$1,'Player 12','score',g,'{}',now() from generate_series(1,2500) g`,[viewer]);
  const first=(await db.query("select * from ranking_detail_page('mole',$1,0)",[viewer])).rows;
  const second=(await db.query("select * from ranking_detail_page('mole',$1,12)",[viewer])).rows;
  const last=(await db.query("select * from ranking_detail_page('mole',$1,2496)",[viewer])).rows;
  assert.equal(first.length,13);assert.equal(first[12].variant,second[0].variant);assert.equal(last.length,5);
 }finally{await db.close();}
});
test('rank movement and AI streaks are independent of previously submitted wins',()=>{
 assert.deepEqual([movement(null,12),movement(12,9),movement(5,7),movement(5,5)],['Mới','Tăng 3 hạng','Giảm 2 hạng','Giữ hạng']);
 const m=new Map(),storage={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 assert.deepEqual([true,true,false,true].map(w=>recordAiOutcome('tic',w,storage)),[1,2,0,1]);assert.equal(recordAiOutcome('connect4',true,storage),1);
});
