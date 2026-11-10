import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
const migration=readFileSync(new URL('../migration-1.61.0.sql',import.meta.url),'utf8');
const cards=JSON.parse(readFileSync(new URL('../src/uno/cards.json',import.meta.url)));
const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004'];
test('UNO authoritative room, rules, privacy and reconnect contracts',async t=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create schema realtime;create table realtime.messages(extension text);alter table realtime.messages enable row level security;create function realtime.topic() returns text language sql as $$select current_setting('test.topic',true)$$;create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$select$$;create table public.game_settings(key text primary key,value jsonb);`);
 await db.exec(migration);await db.exec(migration);
 await db.exec(readFileSync(new URL('../migration-1.61.3.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../migration-1.61.3.sql',import.meta.url),'utf8'));
 const actor=async id=>db.query("select set_config('test.uid',$1,false)",[id]);
 const rpc=async (action,code='',args={},version=null)=>{const {rows}=await db.query('select public.uno_room($1,$2,$3,$4,gen_random_uuid()) s',[action,code,JSON.stringify(args),version]);return rows[0].s;};
 const step=async(s,p,action,args={})=>(await db.query('select uno_private.step($1,$2,$3,$4) s',[JSON.stringify(s),p,action,JSON.stringify(args)])).rows[0].s;
 const state=(hands,extra={})=>({status:'playing',order:Object.keys(hands),turn:Object.keys(hands)[0],direction:1,hands,deck:['yellow_7_a','blue_8_a','green_9_a','red_8_a','blue_0','yellow_0','green_0','red_9_b'],discard:['red_5_a'],color:'red',pending:null,drew:false,drawn:null,uno_target:null,...extra});
 await t.test('108 unique manifest-mapped cards with exact distributions',async()=>{assert.equal(cards.length,108);assert.equal(new Set(cards.map(c=>c.id)).size,108);for(const color of ['red','blue','green','yellow']){assert.equal(cards.filter(c=>c.color===color).length,25);for(const value of ['1','2','3','4','5','6','7','8','9','skip','reverse','draw2'])assert.equal(cards.filter(c=>c.color===color&&c.value===value).length,2);assert.equal(cards.filter(c=>c.color===color&&c.value==='0').length,1);}assert.equal(cards.filter(c=>c.color==='wild').length,8);for(const c of cards)assert.ok(readFileSync(new URL('../public'+c.image,import.meta.url)).length>0);});
 let room;
 await t.test('create, join four seats, readiness, server deal, private snapshots',async()=>{
  await actor(ids[0]);room=await rpc('create','',{name:'A',capacity:4});assert.equal(room.me,ids[0]);
  for(let i=1;i<4;i++){await actor(ids[i]);room=await rpc('join',room.code,{name:'P'+i});room=await rpc('ready',room.code,{ready:true},room.version);}
  await actor(ids[0]);room=await rpc('snapshot',room.code);room=await rpc('start',room.code,{},room.version);
  assert.equal(room.hand.length,7);assert.equal(room.players.length,4);assert.ok(cards.find(c=>c.id===room.top).value.match(/^\d$/));assert.equal(room.drawCount,79);
  assert.equal(room.hands,undefined);assert.equal(room.deck,undefined);assert.equal(room.pending,null);assert.equal(room.legal.every(c=>room.hand.includes(c)),true);
  await actor('00000000-0000-4000-8000-000000000099');await assert.rejects(rpc('snapshot',room.code),/không thuộc/);
  await db.exec('set role authenticated');await assert.rejects(db.query('select * from uno_private.rooms'),/permission denied/);await db.exec('reset role');
 });
 await t.test('stale versions and off-turn plays fail',async()=>{await actor(ids[0]);await assert.rejects(rpc('play',room.code,{card:room.hand[0]},-1),/Trạng thái/);await assert.rejects(step(state({a:['red_1_a'],b:['red_2_a']}),'b','play',{card:'red_2_a'}),/Chưa đến lượt/);});
 await t.test('lobby rejects gameplay; duplicate request does not draw twice',async()=>{
  await assert.rejects(step({},'a','draw'),/Ván chưa/);
  const s=state({a:['blue_1_a'],b:['red_2_a']},{uno_target:null});await assert.rejects(step(s,'a','uno'),/Không có lượt/);
  await actor(ids[0]);let snap=await rpc('snapshot',room.code);const owner=snap.turn;await actor(owner);snap=await rpc('snapshot',room.code);
  const rid='00000000-0000-4000-8000-000000001111';
  const query=()=>db.query('select public.uno_room($1,$2,$3,$4,$5) s',['draw',room.code,'{}',snap.version,rid]);
  const first=(await query()).rows[0].s,again=(await query()).rows[0].s;assert.equal(first.version,again.version);assert.deepEqual(first.hand,again.hand);
 });
 await t.test('normal match, illegal match and only drawn card after draw',async()=>{let s=state({a:['red_1_a','blue_2_a'],b:['red_2_a']});await assert.rejects(step(s,'a','play',{card:'blue_2_a'}),/không hợp lệ/);s.deck=['red_7_a',...s.deck];s=await step(s,'a','draw');assert.equal(s.drawn,'red_7_a');await assert.rejects(step(s,'a','play',{card:'red_1_a'}),/không hợp lệ/);await assert.rejects(step(s,'a','draw'),/một lần/);s=await step(s,'a','pass');assert.equal(s.turn,'b');});
 await t.test('unplayable draw passes atomically; matching and wild draws keep the turn',async()=>{
  for(const drawn of ['yellow_7_a','blue_8_a']){const s=await step(state({a:['red_1_a'],b:['blue_2_a']},{deck:[drawn]}),'a','draw');assert.equal(s.turn,'b');assert.equal(s.drew,false);assert.equal(s.drawn,null);assert.equal(s.hands.a.length,2);await assert.rejects(step(s,'a','draw'),/Chưa đến lượt/);}
  for(const drawn of ['red_7_a','blue_5_a','wild_01','wild_draw4_01']){const s=await step(state({a:['blue_2_a'],b:['red_2_a']},{deck:[drawn]}),'a','draw');assert.equal(s.turn,'a');assert.equal(s.drew,true);assert.equal(s.drawn,drawn);const played=await step(s,'a','play',{card:drawn,color:'blue'});assert.equal(played.hands.a.length,1);}
 });
 await t.test('skip/reverse with two players; reverse and draw2 with four',async()=>{for(const card of ['red_skip_a','red_reverse_a']){const s=await step(state({a:[card,'blue_2_a'],b:['red_2_a']}),'a','play',{card});assert.equal(s.turn,'a');}let s=await step(state({a:['red_reverse_a','blue_2_a'],b:['red_2_a'],c:['red_3_a'],d:['red_4_a']}),'a','play',{card:'red_reverse_a'});assert.equal(s.turn,'d');assert.equal(s.direction,-1);s=await step(state({a:['red_draw2_a','blue_2_a'],b:['red_2_a'],c:['red_3_a']}),'a','play',{card:'red_draw2_a'});assert.equal(s.turn,'c');assert.equal(s.hands.b.length,3);});
 await t.test('wild selection and private draw4 challenge success/failure',async()=>{
 let s=state({a:['wild_draw4_01','red_1_a'],b:['blue_2_a']});s=await step(s,'a','play',{card:'wild_draw4_01',color:'blue'});assert.equal(s.pending.illegal,true);assert.equal(s.color,'blue');s=await step(s,'b','challenge');assert.equal(s.hands.a.length,5);assert.equal(s.turn,'b');
 s=await step(state({a:['wild_draw4_01','green_1_a'],b:['blue_2_a']}),'a','play',{card:'wild_draw4_01',color:'green'});s=await step(s,'b','challenge');assert.equal(s.hands.b.length,7);assert.equal(s.turn,'a');
 await assert.rejects(step(state({a:['wild_01'],b:['blue_2_a']}),'a','play',{card:'wild_01',color:'pink'}),/bốn màu/);
 });
 await t.test('UNO can be called/caught until next action, not afterward',async()=>{let s=await step(state({a:['red_1_a','blue_2_a'],b:['red_2_a','green_1_a']}),'a','play',{card:'red_1_a'});assert.equal(s.uno_target,'a');const caught=await step(s,'b','catch');assert.equal(caught.hands.a.length,3);const called=await step(s,'a','uno');assert.equal(called.uno_target,null);await assert.rejects(step(called,'b','catch'),/Không có lỗi/);s=await step(s,'b','draw');await assert.rejects(step(s,'b','catch'),/Không có lỗi/);});
 await t.test('last +2 resolves before win; last +4 waits for challenge',async()=>{let s=await step(state({a:['red_draw2_a'],b:['red_2_a']}),'a','play',{card:'red_draw2_a'});assert.equal(s.status,'finished');assert.equal(s.hands.b.length,3);s=await step(state({a:['wild_draw4_01'],b:['red_2_a']}),'a','play',{card:'wild_draw4_01',color:'blue'});assert.equal(s.status,'playing');assert.equal(s.pending.candidate,'a');s=await step(s,'b','accept');assert.equal(s.status,'finished');assert.equal(s.winner,'a');assert.equal(s.hands.b.length,5);});
 await t.test('recycle discard while keeping top; empty deck still allows passing',async()=>{let s=state({a:['red_1_a'],b:['blue_2_a']},{deck:[],discard:['green_3_a','red_5_a']});s=await step(s,'a','draw');assert.equal(s.turn,'b');assert.equal(s.drawn,null);assert.ok(s.hands.a.includes('green_3_a'));assert.deepEqual(s.discard,['red_5_a']);s=await step(state({a:['red_1_a'],b:['blue_2_a']},{deck:[]}),'a','draw');assert.equal(s.drawn,null);assert.equal(s.turn,'b');assert.equal(s.drew,false);});
 await t.test('complete 2/3/4-player games conserve all 108 cards',async()=>{
 for(const n of [2,3,4]){
  let s=(await db.query('select uno_private.start($1) s',[JSON.stringify(ids.slice(0,n))])).rows[0].s;
  for(let turn=0;turn<1500&&s.status==='playing';turn++){
   const p=s.turn;
   if(s.pending){s=await step(s,p,'accept');continue;}
   if(s.uno_target){s=await step(s,s.uno_target,'uno');}
   let legal=[];for(const card of s.hands[p]){const ok=(await db.query('select uno_private.legal($1,$2,$3) ok',[JSON.stringify(s),p,card])).rows[0].ok;if(ok)legal.push(card);}
   if(legal.length)s=await step(s,p,'play',{card:legal[0],color:'red'});else s=await step(s,p,s.drew?'pass':'draw');
   const all=[...s.deck,...s.discard,...Object.values(s.hands).flat()];assert.equal(all.length,108);assert.equal(new Set(all).size,108);
  }assert.equal(s.status,'finished',`${n} players`);assert.ok(s.winner);
 }
 });
 await t.test('reconnect retains hand; disconnected player forfeits and host transfers',async()=>{await actor(ids[1]);let snap=await rpc('snapshot',room.code);const hand=snap.hand;assert.deepEqual((await rpc('snapshot',room.code)).hand,hand);await db.query("update uno_private.rooms set players=jsonb_set(players,'{0,seen}',to_jsonb((now()-interval '100 seconds')::text)) where code=$1",[room.code]);snap=await rpc('snapshot',room.code);assert.equal(snap.players[0].left,true);assert.equal(snap.host,ids[1]);assert.equal(snap.players.filter(p=>!p.left).length,3);});
 }finally{await db.close();}
});
