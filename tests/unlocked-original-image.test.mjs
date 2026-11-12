import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const newGames = readFileSync(new URL('../src/NewGames.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('sliding puzzle displays the untouched source image after a win', () => {
  const winStart = app.indexOf('createPortal(<div className=', app.indexOf('function PuzzleGame'));
  const winEnd = app.indexOf("{phase==='paused'", winStart);
  const win = app.slice(winStart, winEnd);
  assert.match(win, /className="puzzle-unlocked-full-image" src=\{chosen\?\.url\|\|DEFAULT_IMAGE\}/);
  assert.match(win, /Bộ sưu tập hình ảnh/);
});

test('both puzzle collections open the original source image, not the cropped thumbnail', () => {
  assert.match(app, /<h2>Ảnh đã mở khóa<\/h2><img src=\{viewPuzzle\.url\|\|DEFAULT_IMAGE\}/);
  assert.match(newGames, /<h2>Ảnh đã mở khóa<\/h2><img src=\{viewImage\.url\|\|DEFAULT_IMAGE\}/);
});

test('jigsaw success and its reference-image viewer display the original uploaded image', () => {
  assert.match(newGames, /<h2>Hình gốc cần ghép<\/h2><img src=\{chosen\?\.url\|\|DEFAULT_IMAGE\}/);
  assert.match(newGames, /className="jigsaw-unlocked-full-image" src=\{chosen\?\.url\|\|DEFAULT_IMAGE\}/);
});

test('full-image viewers preserve the original aspect ratio and fit small screens', () => {
  assert.match(css, /\.jigsaw-result>img\{[^}]*aspect-ratio:auto[^}]*object-fit:contain/s);
  assert.match(css, /\.puzzle-unlocked-full-image\{[^}]*aspect-ratio:auto[^}]*object-fit:contain/s);
  assert.match(css, /\.puzzle-collection-preview-overlay \.puzzle-collection-modal>img\{[^}]*aspect-ratio:auto[^}]*object-fit:contain/s);
});
