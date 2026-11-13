import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {levelLabel,migrateLocalLevelRecords} from '../src/levelLabels.js';

test('existing collections and active games reconcile; only valid runs advance revised metrics',async()=>{
 const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
 const store=new Map();
 globalThis.localStorage={getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)};
 try {
  const {mergeConfig,trackEvent,reconcileProgress}=await vite.ssrLoadModule('/src/gameFeatures.js');
  const config=mergeConfig({gameAvailability:{reaction:false,mines:false}});
  const active=Object.keys(config.gameAvailability).filter(id=>config.gameAvailability[id]);
  const old={completed:[...active.slice(1),'reaction','mines'],metrics:{},unlocked:{'connect4-master':true},puzzleCollection:{},jigsawCollection:{}};
  store.set('thom-onet-progress-v1',JSON.stringify({collection:Array.from({length:30},(_,i)=>String(i))}));
  let p=reconcileProgress(old,config,[]);
  const record=event=>{p=trackEvent(p,event,config.rewards,active).progress;};
  assert.equal(p.metrics.active_games_completed,active.length-1);
  assert.ok(!p.unlocked['all-nine']&&!p.unlocked['connect4-master']);
  assert.ok(p.unlocked['onet-collector-30']);
  record({completed:active[0]});assert.ok(p.unlocked['all-nine']);
  for(const best of [0,-1,NaN,undefined,300])record({type:'reaction_finish',best});
  assert.ok(!p.unlocked['reaction-300']);
  record({type:'reaction_finish',best:200});assert.ok(p.unlocked['reaction-300']&&!p.unlocked['reaction-200']);
  record({type:'reaction_finish',best:199});assert.ok(p.unlocked['reaction-200']);
  record({type:'simon_finish',difficulty:'medium',won:true,score:15});assert.equal(p.metrics.simon_best,15);assert.ok(p.unlocked['simon-medium']);
  for(let i=0;i<10;i++)record({type:'connect4_finish',won:true,mode:'local'});
  assert.ok(!p.unlocked['connect4-master']);
  for(let i=0;i<10;i++)record({type:'connect4_finish',won:true,mode:'ai'});
  assert.ok(p.unlocked['connect4-master']);
 }finally{await vite.close();delete globalThis.localStorage;}
});
test('legacy history, personal bests and boards resolve levels without exposing filenames',()=>{
 const albums={puzzle:[{id:'photo-one'},{id:'photo-two'}]};
 for(const key of ['thom-personal-history-v1','thom-personal-records-v1','thom-local-leaderboards-v1']){
  let value=JSON.stringify([{gameId:'puzzle',variant:'photo-two-hard',variantLabel:'long_filename.jpg',summary:'long_filename.jpg',details:{imageName:'long_filename.jpg',moves:4}}]);
  const storage={getItem:k=>k===key?value:null,setItem:(k,v)=>{if(k===key)value=v;}};
  migrateLocalLevelRecords(albums,storage);
  assert.ok(!value.includes('long_filename'));assert.equal(JSON.parse(value)[0].variantLabel,'Level 02 · Khó');
 }
 assert.equal(levelLabel([], 'deleted-easy'),'');
});
test('retired runs disappear from browser history, bests and local rankings while other games and default levels survive',()=>{
 const retired='17d4fe55-9e6d-49a1-ac70-ea239665d71e-easy';
 const rows=[{gameId:'puzzle',variant:retired},{gameId:'puzzle',variant:'default-thom-easy'},{gameId:'mole',variant:'normal'}];
 const values=new Map([['thom-personal-history-v1',JSON.stringify(rows)],['thom-personal-records-v1',JSON.stringify(Object.fromEntries(rows.map(r=>[r.variant,r])))],['thom-local-leaderboards-v1',JSON.stringify(rows.map(r=>({game_id:r.gameId,variant:r.variant})))]]);
 const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 migrateLocalLevelRecords({puzzle:[{id:'active'}],jigsaw:[]},storage);
 for(const [key,v] of values){
  if(key.includes('cleanup'))continue;
  assert.equal(Object.values(JSON.parse(v)).length,2);
  assert.ok(!v.includes(retired));assert.ok(v.includes('Level mặc định'));
 }
 assert.equal(levelLabel([{id:'active'}],retired),'');
});

test('global badge follows home availability, including Uno and zero active games',async()=>{
 const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
 globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
 try{
  const {mergeConfig,reconcileProgress}=await vite.ssrLoadModule('/src/gameFeatures.js');
  const {GAMES}=await vite.ssrLoadModule('/src/games/catalog.js');
  const ids=GAMES.map(g=>g.id);
  const savedReward={id:'all-nine',game:'all',target:9,description:'Hoàn thành cả 9 trò chơi'};
  const check=(enabled,old)=>{
   const config=mergeConfig({gameAvailability:Object.fromEntries(ids.map(id=>[id,enabled.includes(id)])),rewards:[savedReward]});
   const badge=config.rewards.find(r=>r.id==='all-nine');
   assert.equal(badge.target,enabled.length);
   assert.ok(badge.description.includes(String(enabled.length)));
   return reconcileProgress(old,config,[]);
  };
  const partial={completed:ids.filter(id=>id!=='uno'),metrics:{},unlocked:{}};
  let p=check(ids,partial);
  assert.equal(p.metrics.active_games_completed,11);
  assert.ok(!p.unlocked['all-nine']);
  p=check(partial.completed,p);
  assert.ok(p.unlocked['all-nine']);
  p=check(ids,p);
  assert.ok(!p.unlocked['all-nine']);
  p=check(ids,{...p,completed:ids});
  assert.ok(p.unlocked['all-nine']);
  p=check([],p);
  assert.equal(p.metrics.active_games_completed,0);
  assert.ok(!p.unlocked['all-nine']);
 }finally{await vite.close();delete globalThis.localStorage;}
});

test('all preset badges speak to chim cá and saved descriptions upgrade without replacing admin copy',async()=>{
 const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
 try{
  const {DEFAULT_REWARDS,mergeConfig}=await vite.ssrLoadModule('/src/gameFeatures.js');
  for(const reward of DEFAULT_REWARDS)assert.match(reward.description,/chim cá/i,reward.id);
  const mole=DEFAULT_REWARDS.find(r=>r.id==='mole-300');
  const resolve=changes=>mergeConfig({rewards:[{...mole,...changes}]}).rewards.find(r=>r.id===mole.id);
  assert.equal(resolve({description:'Đạt 300 dép trong Tặng dép'}).description,mole.description);
  assert.equal(resolve({description:'Lời nhắn của admin'}).description,'Lời nhắn của admin');
 }finally{await vite.close();}
});
