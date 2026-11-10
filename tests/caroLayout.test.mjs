import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('Caro board viewport has a definite width inside the centered flex panel', () => {
  // Without width:100%, the flex item shrinks to the min-content size of its
  // percentage-width child, collapsing the 3×3 board into tiny dots.
  assert.match(css, /\.caro-board-viewport\{[^}]*width:100%;[^}]*flex:0 0 auto;/);
});

test('3×3 board remains a centered, square, three-column grid', () => {
  assert.match(css, /\.tic-board\.caro-board-3\{[^}]*margin-inline:auto;[^}]*aspect-ratio:1;[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test('10×10 board still has scrollable zoom viewport', () => {
  assert.match(css, /\.caro-board-scroll\{[^}]*overflow-x:auto;/);
  assert.match(css, /\.tic-board\.caro-board-10\{[^}]*grid-template-columns:repeat\(10,minmax\(0,1fr\)\)/);
});
