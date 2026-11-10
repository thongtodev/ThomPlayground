import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const onet = readFileSync(new URL('../src/OnetGame.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const extra = readFileSync(new URL('../src/NewGames.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('Nối Thơm Đi imports createPortal and declares the win-result state it uses', () => {
  assert.match(onet, /import \{\s*createPortal\s*\} from 'react-dom';/);
  assert.match(onet, /\[winResult,setWinResult\]=useState\(null\)/);
  assert.ok(onet.includes('postResultActionsRef.current='));
  assert.match(onet, /setWinResult\(result\);[\s\S]*?onEvent\(\{type:'onet_win'/);
});

test('Nối Thơm Đi collection is absent from the level-selection screen', () => {
  const start = onet.indexOf("if(phase==='ready')return");
  const end = onet.indexOf("\n return <main className=\"game-page onet-page\">", start);
  assert.ok(start >= 0 && end > start);
  const ready = onet.slice(start, end);
  assert.doesNotMatch(ready, /onet-level-collection-button/);
  assert.doesNotMatch(ready, /openCollection/);
});

test('all unlocked-image X buttons are direct controls on their result cards', () => {
  assert.match(onet, /<div className="result-card onet-unlocked-card"><button type="button" className="image-review-close" onClick=\{closeWinImage\}/);
  assert.match(app, /<div className="result-card puzzle-win-result"><button type="button" className="image-review-close" onClick=\{closeWinImage\}/);
  assert.match(extra, /<div className="result-card jigsaw-result"><button type="button" className="image-review-close" onClick=\{closeWinImage\}/);
});

test('unlocked-image X buttons receive pointer and touch events above the image content', () => {
  assert.match(css, /\.image-review-close\{[^}]*z-index:50!important;[^}]*pointer-events:auto!important;[^}]*touch-action:manipulation/);
});
