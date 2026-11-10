import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('migration, best-per-player pagination, metric ordering and admin-only complete backup', async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.uid',true),'')::uuid$$;
   create schema storage;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid,name text,bucket_id text,metadata jsonb);
   alter table storage.objects enable row level security;
   grant usage on schema public,auth to anon,authenticated;`);
  await db.exec(`create schema realtime;create table realtime.messages(extension text);alter table realtime.messages enable row level security;create function realtime.topic() returns text language sql as $$select ''::text$$;create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$select$$;`);
  await db.exec(readFileSync(new URL('../supabase.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../migrations/1.55.0.sql',import.meta.url),'utf8'));
  await db.exec(`insert into public.game_leaderboards(game_id,variant,variant_label,player_name,player_id,metric_kind,metric_value,metric_label,created_at)
   select 'mines','easy','Easy','Repeated','00000000-0000-4000-8000-000000000001','time',g,'seconds','2026-01-01' from generate_series(1,300) g;
   insert into public.game_leaderboards(game_id,variant,variant_label,player_name,player_id,metric_kind,metric_value,metric_label,created_at)
   select 'mines','easy','Easy','Same name',('00000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,'time',g+400,'seconds','2026-01-02' from generate_series(2,46) g;
   insert into public.game_leaderboards(game_id,variant,variant_label,player_name,metric_kind,metric_value,metric_label)
   values ('mines','hard','Hard','Legacy','time',1,'s'),('mole','normal','Normal','Legacy','score',10,'10'),('mole','normal','Normal',' legacy ','score',20,'20');`);
  await db.exec('set role anon');
  const page=async(offset)=> (await db.query("select * from leaderboard_page('mines','easy','time',$1,20)",[offset])).rows;
  const first=await page(0),second=await page(20),third=await page(40);
  assert.equal(first.length,20);assert.equal(second.length,20);assert.equal(third.length,6);
  assert.equal(new Set([...first,...second,...third].map(x=>x.player_id)).size,46);
  assert.equal(Number(first[0].metric_value),1);
  assert.equal((await db.query("select * from leaderboard_variants('mines')")).rows.length,2);
  const scores=(await db.query("select * from leaderboard_page('mole','normal','score')")).rows;
  assert.equal(scores.length,1);assert.equal(Number(scores[0].metric_value),20);
  await assert.rejects(db.query('select export_game_backup()'),/permission denied/);
  await db.exec('reset role; set role authenticated');
  await assert.rejects(db.query('select export_game_backup()'),/Admin access required/);
  await db.exec(`reset role;insert into auth.users values ('00000000-0000-4000-8000-000000000099');
   insert into game_admins select id from auth.users;
   insert into storage.objects values(null,'orphan.webp','game-images','{}');
   select set_config('app.uid','00000000-0000-4000-8000-000000000099',false);set role authenticated;`);
  const backup=(await db.query('select export_game_backup() as data')).rows[0].data;
  assert.equal(backup.tables.game_leaderboards.length,348);
  assert.equal(backup.storage_objects[0].name,'orphan.webp');
  assert.equal(backup.tables.game_admins.length,1);
 }finally{await db.close();}
});
