import test from 'node:test';
import assert from 'node:assert/strict';
import {diamondStars,bonusPerMove,finalizeDiamondWin} from '../src/diamondScoring.js';
const level={moveLimit:20,score2:2000,score3:4000};
test('win bonus is awarded once before star rating and can cross a threshold',()=>{
 const s={phase:'won',score:1800,movesLeft:3};
 const result=finalizeDiamondWin(s,level);
 assert.equal(bonusPerMove(level),100);
 assert.equal(result.score,2100);assert.equal(result.baseScore,1800);
 assert.equal(diamondStars(level,result.score),2);
 assert.equal(finalizeDiamondWin(result,level),result);
 assert.equal(s.score,1800);
});
test('no bonus before victory or after loss, zero moves still permits a one-star win',()=>{
 for(const phase of ['playing','lost']){const s={phase,score:500,movesLeft:5};assert.equal(finalizeDiamondWin(s,level),s);}
 const r=finalizeDiamondWin({phase:'won',score:500,movesLeft:0},level);
 assert.equal(r.moveBonus,0);assert.equal(diamondStars(level,r.score),1);
});
test('extra-move boosters do not inflate remaining-turn rewards',()=>{
 const normal=finalizeDiamondWin({phase:'won',score:900,movesLeft:4},level);
 const boosted=finalizeDiamondWin({phase:'won',score:900,movesLeft:14,extraMovesGranted:10},level);
 assert.equal(boosted.moveBonus,normal.moveBonus);
 assert.equal(finalizeDiamondWin({phase:'won',score:900,movesLeft:3,extraMovesGranted:5},level).moveBonus,0);
});
