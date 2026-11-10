import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const leaderboard = readFileSync(new URL('../src/Leaderboard.jsx', import.meta.url), 'utf8');
const extra = readFileSync(new URL('../src/NewGames.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('result modal closes from its X button and backdrop without closing on inner clicks', () => {
  assert.match(leaderboard, /className="overlay leaderboard-overlay"[^>]*onClick=\{onClose\}/);
  assert.match(leaderboard, /className="result-card leaderboard-result-card" onClick=\{event=>event\.stopPropagation\(\)\}/);
  assert.match(leaderboard, /className="close-modal leaderboard-result-close" onClick=\{onClose\} aria-label="Đóng bảng thành tích"/);
  assert.match(css, /\.leaderboard-result-close\{position:absolute;top:10px;right:10px/);
});

test('Ghép Thơm Đi! shows the full original image with working X and collection actions', () => {
  const start = app.indexOf('createPortal(<div className=', app.indexOf('function PuzzleGame'));
  const end = app.indexOf("{phase==='paused'", start);
  const win = app.slice(start, end);
  assert.match(win, /alt="Ảnh gốc đầy đủ đã mở khóa"/);
  assert.ok(win.includes('onClick={closeWinImage}'));
  assert.ok(win.includes('onClick={openCollection}>Bộ sưu tập hình ảnh</button>'));
  assert.ok(app.includes("onAlbums('puzzle')"));
  assert.ok(app.includes('const showPendingGameResult=fallbackResult=>{const result=pendingGameResult||fallbackResult'));
  assert.match(app, /onResultReady=\{showPendingGameResult\}/);
});

test('Mảnh Ghép Nhà Thơm follows the same two-action image-first flow with portaled dialogs', () => {
  const start = extra.indexOf('createPortal(<div className="overlay jigsaw-unlocked-overlay"');
  const end = extra.indexOf("{phase==='paused'", start);
  const win = extra.slice(start, end);
  assert.match(win, /alt="Ảnh gốc đầy đủ đã mở khóa"/);
  assert.match(win, /<div className="result-card jigsaw-result"><button type="button" className="image-review-close" onClick=\{closeWinImage\}/);
  assert.match(win, /onClick=\{openCollection\}>Bộ sưu tập hình ảnh<\/button>/);
  assert.equal((win.match(/<button\b/g)||[]).length, 3);
  assert.doesNotMatch(win, /Xem thành tích|Quay lại danh sách Level|Ghép lại Level này/);
  assert.ok(extra.includes('postResultActionsRef.current='));
  assert.match(extra, /setWinResult\(result\);[\s\S]*?onEvent\(\{type:'jigsaw_level_win'/);
  assert.ok(extra.includes("onAlbums('jigsaw')"));
});

test('the result board is immediate for all games except the two image-review games', () => {
  assert.match(app, /if\(event\.type==='puzzle_level_win'\|\|event\.type==='jigsaw_level_win'\|\|event\.type==='onet_win'\)\{setPendingGameResult\(result\);\}else\{setPendingGameResult\(null\);setGameResult\(result\);\}/);
});

test('the original jigsaw image is displayed without cropping and the X remains accessible', () => {
  assert.match(css, /\.jigsaw-unlocked-full-image\{display:block;width:min\(100%,min\(84vw,500px\)\)/);
  assert.match(css, /\.image-review-close\{position:absolute;top:10px;right:10px/);
});
