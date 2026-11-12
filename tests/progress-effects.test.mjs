import test from 'node:test';
import assert from 'node:assert/strict';
import {countdownCue,tileOrigins,rankGain,markNews,hasNews,clearNews} from '../src/effects/progressRules.js';
import {getDealEffects} from '../src/uno/dealEffects.js';
test('countdown cues only cross thresholds, never on increments or zero',()=>{
 assert.equal(countdownCue(11,10),'warning');assert.equal(countdownCue(12,9),'warning');
 assert.equal(countdownCue(4,3),'tick');assert.equal(countdownCue(3,2),'tick');
 for(const [a,b] of [[3,3],[10,20],[1,0],[undefined,10],[10,9]])assert.equal(countdownCue(a,b),null);
});
test('duplicate Onet tiles preserve stationary cells and never reuse an origin',()=>{
 const before=[0,1,0,2,1,2],after=[null,1,2,null,1,2],origins=tileOrigins(before,after);
 assert.equal(origins[1],1);assert.equal(origins[4],4);assert.equal(origins[5],5);assert.equal(origins[2],3);
 const assigned=origins.filter(x=>x!=null);assert.equal(new Set(assigned).size,assigned.length);
 const shuffled=[2,0,1,2,0,1];tileOrigins(before,shuffled).forEach((j,i)=>assert.equal(before[j],shuffled[i]));
});
test('new photos survive reload and clear independently on first view',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 markNews('photo','onet',['a','b'],storage);assert.equal(hasNews('photo','onet','a',storage),true);
 clearNews('photo','onet','a',storage);assert.equal(hasNews('photo','onet','a',storage),false);
 assert.equal(hasNews('photo','onet','b',storage),true);assert.equal(hasNews('photo','jigsaw','b',storage),false);
 markNews('level','onet',[2],storage);assert.equal(hasNews('level','onet',2,storage),true);
});
test('rank gain requires a known valid prior position',()=>{
 assert.equal(rankGain(8,3),5);for(const a of [undefined,NaN,0,-1])assert.equal(rankGain(a,3),0);
 assert.equal(rankGain(3,3),0);assert.equal(rankGain(3,5),0);
});
const lobby={id:'r',status:'lobby',version:4};
const playing={id:'r',status:'playing',version:5,me:'a',turn:'a',order:['a','b','c','d'],players:['a','b','c','d'].map(id=>({id,count:7})),hand:['private-card']};
test('deal emits seven alternating face-down flights per participant',()=>{
 const fx=getDealEffects(lobby,playing);assert.equal(fx.flights.length,28);
 assert.deepEqual(fx.flights.slice(0,4).map(x=>x.to),['hand','player:b','player:c','player:d']);
 assert.ok(fx.flights.every(x=>x.card===null));assert.equal(fx.flights.at(-1).delay,945);
});
test('joining, reconnecting and repeated snapshots cannot replay the deal',()=>{
 assert.equal(getDealEffects(null,playing),null);assert.equal(getDealEffects(playing,playing),null);
 assert.equal(getDealEffects({...lobby,id:'other'},playing),null);
 assert.equal(getDealEffects({...playing,version:4},playing),null);
});
