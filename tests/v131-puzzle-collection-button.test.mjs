import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFile } from './sourceHelpers.mjs';
const read=file=>readFile(new URL(file,import.meta.url),'utf8');

test('Ghép Thơm Đi collection button has a clear Vietnamese label and accessible name',async()=>{
  const app=await read('../src/App.jsx');
  assert.match(app,/Bộ sưu tập hình ảnh/);
  assert.match(app,/aria-label="Bộ sưu tập"/);
  assert.match(app,/onAlbums/);
  assert.doesNotMatch(app,/secondary-button puzzle-open-collection/);
});

test('collection button uses a high-contrast filled style on the light intro card',async()=>{
  const css=await read('../src/styles.css');
  const block=css.slice(css.indexOf('/* v1.31 — Make the in-game collection action'),css.indexOf('.puzzle-game-collection-modal'));
  assert.match(block,/background:linear-gradient\(135deg,#76245f/);
  assert.match(block,/color:#fff!important/);
  assert.match(block,/min-height:54px/);
  assert.match(block,/:hover/);
  assert.match(block,/:active/);
  assert.match(block,/:focus-visible/);
});
