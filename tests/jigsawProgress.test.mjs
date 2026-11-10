import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFile } from './sourceHelpers.mjs';
import {canPlayJigsawDifficulty,recordJigsawLevelCompletion,countCollectedJigsawImages} from '../src/puzzleProgress.js';

test('Jigsaw hard level is locked until the same image is completed on easy',()=>{
  const empty={};
  assert.equal(canPlayJigsawDifficulty(empty,'photo-1','easy'),true);
  assert.equal(canPlayJigsawDifficulty(empty,'photo-1','hard'),false);
  const afterEasy=recordJigsawLevelCompletion(empty,{imageId:'photo-1',imageName:'Thom 01',difficulty:'easy',n:3});
  assert.equal(canPlayJigsawDifficulty(afterEasy,'photo-1','hard'),true);
  assert.equal(canPlayJigsawDifficulty(afterEasy,'photo-2','hard'),false);
});

test('Jigsaw collection unlocks one image after easy or hard completion and retains both badges',()=>{
  const easy=recordJigsawLevelCompletion({}, {imageId:'photo-1',imageName:'Thom 01',difficulty:'easy',n:3});
  assert.equal(countCollectedJigsawImages(easy),1);
  const hard=recordJigsawLevelCompletion(easy, {imageId:'photo-1',imageName:'Thom 01',difficulty:'hard',n:5});
  assert.deepEqual({easy:hard['photo-1'].easy,hard:hard['photo-1'].hard},{easy:true,hard:true});
  assert.equal(countCollectedJigsawImages(hard),1);
});

test('Mảnh Ghép Nhà Thơm uses per-image levels, easy/hard unlock, image review and collection',async()=>{
  const app=await readFile(new URL('../src/NewGames.jsx',import.meta.url),'utf8');
  const features=await readFile(new URL('../src/gameFeatures.js',import.meta.url),'utf8');
  const route=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.match(app,/Mảnh Ghép Nhà Thơm/);
  assert.match(app,/Dễ · 3×3/);
  assert.match(app,/Khó · 5×5/);
  assert.match(app,/Xem hình mẫu/);
  assert.match(app,/Bộ sưu tập hình ảnh/);
  assert.match(app,/Hoàn thành để mở khóa/);
  assert.match(app,/jigsaw_level_win/);
  assert.match(features,/jigsawCollection/);
  assert.match(route,/jigsawProgress=\{progress\.jigsawCollection\|\|\{\}\}/);
});
