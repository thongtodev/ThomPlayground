import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileMinerRewards} from '../src/minerCollection.js';
const album=[{id:'a'},{id:'b'},{id:'c'}];
test('one reward per distinct completed level; replays and losses grant nothing extra',()=>{
 let p=reconcileMinerRewards({best:{}},album);assert.deepEqual(p.rewards,{});
 p=reconcileMinerRewards({...p,best:{1:{score:150}}},album);assert.deepEqual(p.rewards,{1:'a'});
 assert.deepEqual(reconcileMinerRewards(p,album),p);
 p=reconcileMinerRewards({...p,best:{...p.best,2:{score:250}}},album);assert.deepEqual(p.rewards,{1:'a',2:'b'});
});
test('late album additions backfill wins; reorder and removal preserve awarded IDs',()=>{
 let p=reconcileMinerRewards({best:{1:{},2:{}}},[]);assert.deepEqual(p.rewards,{});
 p=reconcileMinerRewards(p,album.slice(0,1));assert.deepEqual(p.rewards,{1:'a'});
 p=reconcileMinerRewards(p,[album[2],album[0],album[1]]);assert.deepEqual(p.rewards,{1:'a',2:'c'});
 assert.deepEqual(reconcileMinerRewards(p,[album[1]]).rewards,{1:'a',2:'c'});
});
