import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const onet = readFileSync(new URL('../src/OnetGame.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('homepage banner contains no Trạm Chạy Số logo and keeps the headline', () => {
  assert.doesNotMatch(app, /tram-chay-so-logo|Trạm Chạy Số|hero-partner-mark|hero-title-logo/);
  assert.match(app, /<div className="hero-title-row"><h1>Một chút vui,/);
  assert.match(css, /\.hero-title-row\{display:block/);
});

test('achievement cards are grouped by game and global achievements', () => {
  assert.match(app, /collection-achievement-groups/);
  assert.match(app, /games\.map\(g=>\(\{id:g\.id,title:g\.name,icon:g\.icon,rewards:visibleRewards\.filter\(r=>r\.game===g\.id\)\}\)\)/);
  assert.match(app, /getVisibleRewards\(config\.rewards,games,GAMES\)/);
  assert.match(app, /title:'Thử thách chung'/);
});

test('mobile touch shows a static slipper at the exact touch point', () => {
  assert.match(app, /event\.pointerType!=='touch'/);
  assert.match(app, /x:event\.clientX-rect\.left,y:event\.clientY-rect\.top/);
  assert.match(app, /className="mole-touch-slipper"/);
  assert.match(css, /\.mole-touch-slipper\{[^}]*transform:translate\(-50%,-50%\)/);
  assert.match(css, /@keyframes slipper-touch-appear\{0%\{opacity:0\}12%\{opacity:1\}78%\{opacity:1\}100%\{opacity:0\}\}/);
});

test('successful gift feedback shows +10 with slipper icon', () => {
  assert.match(app, /label:'\+10'/);
  assert.match(app, /\{hitFeedback\.label\}<\/b><img src=\{slipperCursor\} alt="dép"\/>/);
});

test('system-specific explanatory copy is removed from player screens', () => {
  for (const source of [app, onet]) {
    assert.doesNotMatch(source, /Không cần tải ứng dụng|Chơi trực tiếp trên trình duyệt|Tiến trình được lưu trên trình duyệt|Mỗi hình trong bộ sưu tập là một Level riêng/);
  }
});
