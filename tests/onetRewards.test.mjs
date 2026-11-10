import test from 'node:test';
import assert from 'node:assert/strict';
import {getOnetUnlockCount,drawOnetPhotos,onetScore,onetProgress,totalOnetScore,migrateOnetScores} from '../src/onetRewards.js';
import {ONET_LEVELS,gravityAt,applyGravity,createBoard,availablePairs,removePair,shuffleBoard} from '../src/onetEngine.js';
test('independent draws with replacement count distinct newly acquired IDs',()=>{
 for(let level=1;level<=20;level++)assert.equal(getOnetUnlockCount(level,1),level<=10?1:2);
 const album=[{id:'a'}];
 assert.deepEqual(drawOnetPhotos(album,[],11).map(p=>p.isNew),[true,false]);
 assert.deepEqual(drawOnetPhotos(album,['a'],20).map(p=>p.isNew),[false,false]);
 assert.deepEqual(drawOnetPhotos([],[],20),[]);
});
test('time bonuses are proportional and old Level 10 winners can immediately enter Level 11',()=>{
 assert.equal(onetScore(1,180),2900);assert.equal(onetScore(20,78),2800);
 const progress=onetProgress({unlocked:10,best:{1:4200,10:3180}});
 assert.equal(progress.unlocked,11);assert.equal(totalOnetScore(progress.best),5700);
 assert.deepEqual(onetProgress(progress),progress);
 const db=new Map([['thom-onet-progress-v1',JSON.stringify({unlocked:10,best:{1:4200,10:3180}})]]);
 const storage={getItem:k=>db.get(k),setItem:(k,v)=>db.set(k,v)};
 assert.deepEqual(migrateOnetScores(storage),progress);assert.deepEqual(migrateOnetScores(storage),progress);
});
test('advanced levels use stated boundaries and pack each region independently',()=>{
 assert.equal(ONET_LEVELS.length,20);
 assert.deepEqual([0,4,8].map(n=>gravityAt(15,n)),['out','in','out']);
 assert.deepEqual([0,8,16,18,20,22].map(n=>gravityAt(20,n)),['rows','in','zones0','zones1','zones2','zones3']);
 const b=Array(48).fill(null);b[1]=1;b[4]=2;
 assert.deepEqual(applyGravity(b,'in').slice(0,6),[null,null,1,2,null,null]);
 assert.deepEqual(applyGravity(b,'out').slice(0,6),[1,null,null,null,null,2]);
 for(let level=11;level<=20;level++){
  let board=createBoard(level);
  for(let matched=0;matched<24;matched++){
   const moves=availablePairs(board,1);
   if(!moves.length)board=shuffleBoard(board,level,matched);
   const [pair]=availablePairs(board,1);assert.ok(pair);
   board=removePair(board,pair.a,pair.b,level,matched);
   assert.equal(board.filter(v=>v!=null).length,46-2*matched);
  }
 }
});
