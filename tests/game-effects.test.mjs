import test from 'node:test';
import assert from 'node:assert/strict';
import {isCelebration,isNewRecord} from '../src/effects/effectRules.js';
test('losses and tied games do not trigger victory confetti',()=>{
 for(const gameId of ['mines','miner','onet','puzzle','jigsaw'])assert.equal(isCelebration({gameId,eligible:false}),false);
 for(const gameId of ['tic','connect4'])assert.equal(isCelebration({gameId,details:{winner:'draw'}}),false);
 assert.equal(isCelebration({gameId:'simon',eligible:true,details:{success:false}}),false);
 assert.equal(isCelebration({gameId:'reaction',eligible:false,details:{validRounds:0}}),false);
});
test('victories, valid reaction runs and records qualify for a single celebration',()=>{
 assert.equal(isCelebration({gameId:'miner',eligible:true}),true);
 assert.equal(isCelebration({gameId:'connect4',details:{winner:'R'}}),true);
 assert.equal(isCelebration({gameId:'simon',details:{success:true}}),true);
 assert.equal(isCelebration({gameId:'reaction',details:{validRounds:2}}),true);
 assert.equal(isCelebration({gameId:'mole',metricValue:0}),false);
 assert.equal(isCelebration({gameId:'mole',isNewBest:true,metricValue:10}),true);
});
test('personal record comparison respects low and high score games and ties',()=>{
 for(const metricKind of ['time','steps','reaction']){
  assert.equal(isNewRecord({eligible:true,metricKind,metricValue:20},{metricValue:30}),true);
  assert.equal(isNewRecord({eligible:true,metricKind,metricValue:30},{metricValue:30}),false);
 }
 assert.equal(isNewRecord({eligible:true,metricKind:'score',metricValue:40},{metricValue:30}),true);
 assert.equal(isNewRecord({eligible:false,metricKind:'score',metricValue:40},null),false);
});
