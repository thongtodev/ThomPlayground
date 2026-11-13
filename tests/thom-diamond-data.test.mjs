import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const data=JSON.parse(readFileSync(resolve(root,'src/data/thomDiamondLevels.json'),'utf8'));
const manifest=JSON.parse(readFileSync(resolve(root,'src/data/thomDiamondManifest.json'),'utf8'));

test('Thơm Kim Cương contains 100 levels across four 25-level worlds',()=>{
 assert.equal(data.levels.length,100);
 assert.equal(data.worlds.length,4);
 for(let world=1;world<=4;world++)assert.equal(data.levels.filter(level=>level.world===world).length,25);
 assert.deepEqual(data.worlds.map(world=>world.name),['Ngõ Nhà Thơm','Góc Phòng Thu','Sau Cánh Gà','Dưới Ánh Đèn']);
});

test('every level has a valid 7x7 board, moves, six mapped tiles and objectives',()=>{
 const ids=new Set(manifest.map(item=>item.tile_id));
 for(const level of data.levels){
  assert.equal(level.rows,7,`level ${level.id} rows`);
  assert.equal(level.cols,7,`level ${level.id} cols`);
  assert.ok(level.moveLimit>0,`level ${level.id} move limit`);
  assert.equal(level.tileSet.length,6,`level ${level.id} tile set`);
  assert.ok(level.tileSet.every(id=>ids.has(id)),`level ${level.id} tile mapping`);
  assert.ok(level.objectives.length>0,`level ${level.id} objectives`);
 }
});

test('all 24 original images are included and the gameplay thumbnails are full-frame assets',()=>{
 assert.equal(manifest.length,24);
 for(const item of manifest){
  assert.ok(existsSync(resolve(root,'public/thom-kim-cuong',item.original_file)),`${item.tile_id} original`);
  assert.ok(existsSync(resolve(root,'public/thom-kim-cuong/tiles',`${item.tile_id}.webp`)),`${item.tile_id} thumbnail`);
  assert.equal(item.crop_applied,'NO');
 }
});

test('Admin crop settings are wired separately from immutable source files',()=>{
 const admin=readFileSync(resolve(root,'src/ThomDiamondAdmin.jsx'),'utf8');
 const features=readFileSync(resolve(root,'src/gameFeatures.js'),'utf8');
 assert.match(admin,/sourceFile:item\.original_file/);
 assert.match(admin,/Đặt lại ảnh gốc/);
 assert.match(features,/thomDiamondCrops/);
});
