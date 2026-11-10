import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const source = readFileSync(new URL('../src/OnetGame.jsx', import.meta.url), 'utf8');

test('Nối Thơm Đi! album grid supports opening and closing a full-image preview', () => {
  const start = source.indexOf('function OnetAlbum');
  const end = source.indexOf('\n}', start);
  const modal = source.slice(start, end);
  assert.match(modal, /onet-collection-grid/);
  assert.match(modal, /\{viewing&&createPortal\(<div className="onet-photo-viewer"/);
  assert.match(modal, /onClick=\{\(\)=>setViewing\(null\)\}/);
  assert.match(modal, /aria-label="Đóng hình"/);
});
