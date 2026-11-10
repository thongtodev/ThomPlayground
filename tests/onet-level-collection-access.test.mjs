import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const onet = readFileSync(new URL('../src/OnetGame.jsx', import.meta.url), 'utf8');

test('Nối Thơm Đi! keeps its image collection off the level-selection screen', () => {
  const ready = onet.indexOf("if(phase==='ready')return");
  const playing = onet.indexOf('return <main className="game-page onet-page"', ready);
  assert.ok(ready >= 0 && playing > ready, 'level-selection screen should exist');
  const intro = onet.slice(ready, playing);
  assert.match(intro, /Chọn Level/);
  assert.doesNotMatch(intro, /className="puzzle-open-collection onet-level-collection-button" onClick=\{openCollection\}/);
  assert.doesNotMatch(intro, /BỘ SƯU TẬP HÌNH ẢNH/);
  assert.doesNotMatch(intro, /onClick=\{\(\)=>start\(level\)\}[^]*BỘ SƯU TẬP HÌNH ẢNH/);
  assert.ok(onet.includes("onAlbums('onet')"));
});
