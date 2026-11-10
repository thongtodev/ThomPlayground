import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('SQL sums one normalized best per level and ranks all twenty levels together',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;
  create table game_leaderboards(id serial,game_id text,variant text,player_id uuid,player_name text,created_at timestamptz default now(),metric_kind text,metric_value numeric,details jsonb);
  insert into game_leaderboards(game_id,variant,player_name,metric_kind,metric_value,details) values
   ('onet','level-1','A','score',4200,'{}'),('onet','level-1','A','score',2800,'{"scoreVersion":2}'),
   ('onet','level-20','A','score',3200,'{"scoreVersion":2}'),('onet','level-4','B','score',3000,'{"scoreVersion":2}');`);
  const sql=readFileSync(new URL('../migrations/1.57.0.sql',import.meta.url),'utf8');
  await db.exec(sql);await db.exec(sql);
  const rows=(await db.query('select * from onet_total_page(0,1)')).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].player_name,'A');assert.equal(+rows[0].metric_value,6100);
  assert.deepEqual(rows[0].levels,{'1':2900,'20':3200});
  assert.equal((await db.query('select * from onet_total_page(1,1)')).rows[0].player_name,'B');
 }finally{await db.close();}
});
