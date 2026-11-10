import test from 'node:test';
import assert from 'node:assert/strict';
import {canPlayPuzzleDifficulty,recordPuzzleLevelCompletion,countCollectedPuzzleImages} from '../src/puzzleProgress.js';

test('hard difficulty is locked until the same image is completed on easy',()=>{
  const progress={};
  assert.equal(canPlayPuzzleDifficulty(progress,'photo-1','easy'),true);
  assert.equal(canPlayPuzzleDifficulty(progress,'photo-1','hard'),false);
  const next=recordPuzzleLevelCompletion(progress,{imageId:'photo-1',imageName:'Thom',difficulty:'easy',n:3});
  assert.equal(canPlayPuzzleDifficulty(next,'photo-1','hard'),true);
});

test('each uploaded image is counted once in the collection',()=>{
  let progress={};
  progress=recordPuzzleLevelCompletion(progress,{imageId:'photo-1',difficulty:'easy',n:3});
  progress=recordPuzzleLevelCompletion(progress,{imageId:'photo-1',difficulty:'hard',n:5});
  assert.equal(countCollectedPuzzleImages(progress),1);
  progress=recordPuzzleLevelCompletion(progress,{imageId:'photo-2',difficulty:'easy',n:3});
  assert.equal(countCollectedPuzzleImages(progress),2);
  assert.equal(progress['photo-1'].easy,true);
  assert.equal(progress['photo-1'].hard,true);
});

test('hard completion records the image in the collection and preserves metadata',()=>{
  const progress={};
  const result=recordPuzzleLevelCompletion(progress,{imageId:'photo-3',imageName:'Chú Thơm',difficulty:'hard',n:5});
  assert.equal(result['photo-3'].easy,false);
  assert.equal(result['photo-3'].hard,true);
  assert.equal(countCollectedPuzzleImages(result),1);
  assert.equal(result['photo-3'].name,undefined);
});
