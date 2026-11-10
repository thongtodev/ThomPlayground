import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFile } from './sourceHelpers.mjs';

test('game album image-library categories are collapsed by default and show selection counts', async () => {
  const component = await readFile(new URL('../src/GameAlbumEditor.jsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(component, /<details className="puzzle-album-group" key=\{group\.id\}>/);
  assert.match(component, /<summary><span>\{group\.label\}<\/span>/);
  assert.match(component, /\{selectedCount\}\/\{group\.images\.length\} ảnh đã chọn/);
  assert.match(component, /<div className="puzzle-album-group-content">/);
  assert.doesNotMatch(component, /<details className="puzzle-album-group"[^>]*\bopen\b/);
  assert.match(css, /\.puzzle-album-group\[open\]>summary::after\{content:"−"\}/);
  assert.match(css, /\.puzzle-album-group>summary::after\{[\s\S]*?content:"\+";/)
});

test('image selection remains available inside each expandable album category', async () => {
  const component = await readFile(new URL('../src/GameAlbumEditor.jsx', import.meta.url), 'utf8');
  assert.match(component, /checked=\{active\}/);
  assert.match(component, /onChange=\{e=>addOrRemove\(im\.id,e\.target\.checked\)\}/);
  assert.match(component, /value\.findIndex\(e=>e\.id===im\.id\)/);
});
