import test from 'node:test';
import assert from 'node:assert/strict';
import {createMinerRun,makeMinerBoard,advanceMiner,castMiner,firstMinerCollision,MINER_ITEMS,MINER_HOME,minerStars,validMinerSession} from '../src/minerEngine.js';
import {solve} from './minerSolver.mjs';
import {localRankings} from '../src/gameRankings.js';

const item=(kind,id,x=360,y=300)=>({id,kind,x,y,radius:MINER_ITEMS[kind].radius});
test('the hook captures the first object, including a rock shielding a slipper',()=>{
 const board=[item('gold',1,360,400),item('boulder',2,360,240)];
 assert.equal(firstMinerCollision({x:360,y:130},{x:360,y:500},board).item.id,2);
 let state={...createMinerRun(1),angle:0,items:board};state=castMiner(state);state=advanceMiner(state,.5);
 assert.equal(state.carried.kind,'boulder');assert.equal(state.items.length,1);assert.equal(state.score,0);
});
test('only one cast is accepted while a hook is moving; misses return without score',()=>{
 let state=castMiner({...createMinerRun(1),items:[]});assert.equal(castMiner(state),state);
 state=advanceMiner(state,4);assert.equal(state.score,0);assert.equal(state.motion,'swing');assert.equal(state.casts,1);
});
test('points are awarded only at the surface and reaching the target ends the level immediately',()=>{
 let state={...createMinerRun(1),motion:'in',length:100,carried:item('slipper',0),score:200};
 state=advanceMiner(state,.05);assert.equal(state.score,200);assert.equal(state.phase,'playing');
 state=advanceMiner(state,1);assert.equal(state.score,250);assert.equal(state.phase,'won');assert.equal(state.carried,null);
});
test('heavy rocks pull slower than slippers, while boost accelerates the next two casts',()=>{
 const base={...createMinerRun(1),motion:'in',length:450};
 const light=advanceMiner({...base,carried:item('slipper',1)},.5);
 const heavy=advanceMiner({...base,carried:item('boulder',1)},.5);
 assert.ok(light.length<heavy.length);
 let s=advanceMiner({...base,length:MINER_HOME,carried:item('boost',1)},.01);
 assert.equal(s.boosts,2);s=castMiner(s);assert.equal(s.boosts,1);assert.equal(s.boosted,true);
 s=advanceMiner({...s,motion:'in',length:MINER_HOME,carried:null},.01);s=castMiner(s);assert.equal(s.boosts,0);assert.equal(s.boosted,true);
});
test('clock adds ten seconds, timeout never scores an undelivered object, pause freezes physics',()=>{
 let s={...createMinerRun(4),motion:'in',length:MINER_HOME,carried:item('clock',1)};
 s=advanceMiner(s,.01);assert.ok(s.remaining>createMinerRun(4).remaining+9.9);
 const expired=advanceMiner({...createMinerRun(1),remaining:.01,motion:'in',length:400,carried:item('gold',1)},1);
 assert.equal(expired.phase,'lost');assert.equal(expired.score,0);
 const paused={...s,phase:'paused'};assert.equal(advanceMiner(paused,20),paused);
});
test('magnet targets one nearby valuable but cannot pull through a blocking rock',()=>{
 const base={...createMinerRun(5),motion:'out',angle:0,length:200,magnetic:true};
 const gold=item('gold',1,410,300);
 let s=advanceMiner({...base,items:[gold]},.001);assert.equal(s.carried.kind,'gold');assert.equal(s.items.length,0);
 s=advanceMiner({...base,items:[gold,item('rock',2,387,298)]},.001);
 assert.notEqual(s.carried?.kind,'gold');
});
test('board generation is reproducible, within bounds and contains sufficient value',()=>{
 for(let level=1;level<=10;level++){
  assert.deepEqual(makeMinerBoard(level,42),makeMinerBoard(level,42));
  const s=createMinerRun(level,42);assert.ok(s.items.reduce((sum,i)=>sum+MINER_ITEMS[i.kind].value,0)>=s.target*1.3);
  assert.ok(s.items.every(i=>i.x-i.radius>=0&&i.x+i.radius<=720&&i.y+i.radius<=640));
  assert.ok(validMinerSession(s));assert.ok(validMinerSession({...s,phase:'paused'}));
 }
 assert.equal(Boolean(validMinerSession({version:1})),false);
});
test('all ten levels are beatable by a legal timing strategy across 40 seeds each',()=>{
 for(let level=1;level<=10;level++)for(let seed=1;seed<=40;seed++)assert.equal(solve(level,seed).phase,'won',`level ${level}, seed ${seed}`);
});
test('stars use the exact 20 and 35 second boundaries',()=>{
 assert.equal(minerStars(19.99),1);assert.equal(minerStars(20),2);assert.equal(minerStars(34.99),2);assert.equal(minerStars(35),3);
});
test('miner rankings count only the best winning score per level',()=>{
 const row=(id,variant,n,won)=>({game_id:'miner',id,player_id:'p1',player_name:'Thơm',variant,metric_kind:'score',metric_value:n,details:{won},created_at:'2026-01-01'});
 const result=localRankings('miner',[row(1,'level-1',150,true),row(2,'level-1',190,true),row(3,'level-2',270,true),row(4,'level-3',1000,false)],[],'p1');
 assert.equal(result[0].score,460);
});

test('slippers are set back and every new level adds one stone',()=>{
 for(let level=1;level<=10;level++)for(let seed=1;seed<=40;seed++){
  const board=makeMinerBoard(level,seed);
  const stones=board.filter(i=>i.kind==='rock'||i.kind==='boulder');
  assert.equal(stones.length,level-1);
  if(level===2)assert.equal(stones[0].kind,'rock');
  for(const i of board.filter(i=>['slipper','pair','gold'].includes(i.kind))){
   assert.ok(Math.hypot(i.x-360,i.y-95)>225);
  }
 }
});
