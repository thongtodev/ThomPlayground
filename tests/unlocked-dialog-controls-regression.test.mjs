import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const onet = readFileSync(new URL('../src/OnetGame.jsx', import.meta.url), 'utf8');
const extra = readFileSync(new URL('../src/NewGames.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('all three image-unlock screens have a working X that passes a fallback result', () => {
  assert.ok(app.includes('onClick={closeWinImage}'));
  assert.ok(onet.includes('onClick={closeWinImage}'));
  assert.ok(extra.includes('onClick={closeWinImage}'));
});

test('all three unlock dialogs navigate to their own album section', () => {
  assert.ok(app.includes("onAlbums('puzzle')"));
  assert.ok(onet.includes("onAlbums('onet')"));
  assert.ok(extra.includes("onAlbums('jigsaw')"));
});

test('Nối Thơm Đi! collection action appears before the optional unlocked-image gallery', () => {
  const resultStart = onet.indexOf('phase===\'won\'&&showWinImage&&createPortal');
  const collectionButton = onet.indexOf('onet-open-collection-button', resultStart);
  const imageGallery = onet.indexOf('onet-unlocked-images', resultStart);
  assert.ok(resultStart >= 0 && collectionButton > resultStart);
  assert.ok(imageGallery > collectionButton);
});

test('collection image previews have their own top-level closeable dialogs', () => {
  assert.ok(app.includes('viewPuzzle&&createPortal(<div className="overlay puzzle-collection-overlay puzzle-collection-preview-overlay"'));
  assert.ok(extra.includes('viewImage&&createPortal(<div className="overlay puzzle-collection-overlay puzzle-collection-preview-overlay"'));
  assert.ok(onet.includes('viewing&&createPortal(<div className="onet-photo-viewer"'));
  assert.match(css, /\.puzzle-collection-preview-overlay\{[\s\S]*?z-index:2300!important/);
  assert.match(css, /\.onet-photo-viewer\{z-index:2300!important/);
});
