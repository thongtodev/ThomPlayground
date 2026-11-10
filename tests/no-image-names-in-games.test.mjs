import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const extra = readFileSync(new URL('../src/NewGames.jsx', import.meta.url), 'utf8');
const onet = readFileSync(new URL('../src/OnetGame.jsx', import.meta.url), 'utf8');

test('player-facing puzzle games never render uploaded image names', () => {
  for (const [id, source] of [['Ghép Thơm Đi!', app], ['Mảnh Ghép Nhà Thơm', extra], ['Nối Thơm Đi!', onet]]) {
    assert.doesNotMatch(source, /chosen\??\.name/, `${id} must not show the image filename`);
  }
});

test('jigsaw toolbar and win result show game progress only, not image name', () => {
  assert.match(extra, /<div className="jigsaw-game-toolbar"><span>\{total\} mảnh jigsaw<\/span><\/div>/);
  assert.match(extra, /<p>\{difficultyName\[difficulty\]\} · \{moves\} thao tác · \{fmt\(seconds\)\}<\/p>/);
});

test('new puzzle achievement labels and summaries do not expose uploaded image names', () => {
  assert.match(app, /variantLabel=levelLabel\(/);
  assert.doesNotMatch(app, /imageName:chosen\.name/);
  assert.match(extra, /variantLabel=levelLabel\(/);
  assert.doesNotMatch(extra, /imageName:chosen\.name/);
  assert.doesNotMatch(extra, /summary:`\$\{chosen\.name\}/);
});
