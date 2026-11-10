import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('Ghép Thơm Đi! win image is portaled to document.body and close passes a fallback result', () => {
  assert.ok(app.includes("phase==='won'&&showWinImage&&createPortal(<div className=\"overlay puzzle-win-overlay\""));
  assert.ok(app.includes('onClick={closeWinImage}'));
  assert.ok(app.includes('const showPendingGameResult=fallbackResult=>{const result=pendingGameResult||fallbackResult'));
});

test('win modal remains scrollable and its close button remains clickable', () => {
  assert.match(css, /\.puzzle-win-overlay\{[\s\S]*?position:fixed!important;[\s\S]*?height:100dvh;[\s\S]*?overflow-y:auto!important;/);
  assert.match(css, /\.puzzle-win-result\{[\s\S]*?max-height:calc\(100dvh - 32px\);[\s\S]*?overflow-y:auto/);
  assert.ok(css.includes('.puzzle-win-close-row{pointer-events:auto!important}'));
  assert.ok(css.includes('.puzzle-win-close-row .image-review-close{pointer-events:auto!important;cursor:pointer}'));
});

test('win image can navigate to the puzzle album section', () => {
  assert.ok(app.includes("import { createPortal } from 'react-dom'"));
  assert.ok(app.includes("onAlbums('puzzle')"));
  assert.match(css, /\.puzzle-collection-overlay\{[\s\S]*?z-index:2200!important/);
});

test('original photo is constrained to viewport height without cropping', () => {
  assert.ok(app.includes('className="puzzle-unlocked-full-image" src={chosen?.url||DEFAULT_IMAGE}'));
  assert.match(css, /\.puzzle-win-result \.puzzle-unlocked-full-image\{[\s\S]*?object-fit:contain/);
});
