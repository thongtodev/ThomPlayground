import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const component=readFileSync(new URL('../src/NewGames.jsx', import.meta.url),'utf8');
const styles=readFileSync(new URL('../src/styles.css', import.meta.url),'utf8');

test('Nhớ Lời Thơm buttons show only the full-cell image, without visible captions or symbols',()=>{
  const start=component.indexOf('function SimonSaysGame');
  const end=component.indexOf('async function renderSquareImage',start);
  const simon=component.slice(start,end);
  assert.match(simon,/className="simon-pad-image"/);
  assert.match(simon,/aria-label=\{`Biểu cảm \$\{index\+1\}`\}/);
  assert.doesNotMatch(simon,/'Nắng'|'Hoa'|'Tim'|'Nhạc'|simon-pad-symbol|labels\[index\]/);
  assert.match(styles,/\.simon-pad-button\{[^}]*aspect-ratio:1/s);
  assert.match(styles,/\.simon-pad-image\{display:block;width:100%;height:100%;object-fit:cover/s);
});
