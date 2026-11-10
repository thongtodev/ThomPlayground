import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const onet = readFileSync(new URL('../src/OnetGame.jsx', import.meta.url), 'utf8');
const extra = readFileSync(new URL('../src/NewGames.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('newly unlocked Onet images open the same full-size viewer used by the collection', () => {
  assert.match(onet, /className="onet-unlocked-image-button"[^>]*onClick=\{\(\)=>setViewingUnlockedPhoto\(photo\)\}/);
  assert.match(onet, /viewingUnlockedPhoto&&createPortal\(<div className="onet-photo-viewer"/);
  assert.match(onet, /src=\{viewingUnlockedPhoto\.url\}/);
});

test('newly unlocked Sliding Puzzle image opens a full-size preview and returns to the win screen', () => {
  assert.match(app, /puzzle-unlocked-full-image"[^>]*onClick=\{\(\)=>setShowWinImagePreview\(true\)\}/);
  assert.match(app, /showWinImagePreview&&chosen&&createPortal/);
  assert.match(app, /unlocked-image-preview-overlay/);
  assert.match(app, /setShowWinImagePreview\(false\)/);
});

test('newly unlocked Jigsaw image opens a full-size preview and returns to the win screen', () => {
  assert.match(extra, /jigsaw-unlocked-full-image"[^>]*onClick=\{\(\)=>setShowWinImagePreview\(true\)\}/);
  assert.match(extra, /showWinImagePreview&&chosen&&createPortal/);
  assert.match(extra, /unlocked-image-preview-overlay/);
  assert.match(extra, /setShowWinImagePreview\(false\)/);
});

test('closing the leaderboard asks whether to play the next level or choose another', () => {
  assert.match(app, /const closeLeaderboardResult=\(\)=>\{const result=gameResult;setGameResult\(null\);if\(result&&\['onet','puzzle','jigsaw','miner'\]\.includes\(result\.gameId\)\)\{setPostResultPrompt/);
  assert.match(app, /Bạn muốn thử thách ở level tiếp theo hay chọn một level khác/);
  assert.match(app, /choosePostResultAction\('next'\)/);
  assert.match(app, /choosePostResultAction\('choose'\)/);
  assert.match(app, /postResultActionsRef=\{postResultActionsRef\}/);
});

test('Onet next-level action advances to the next level and wraps after Level 20', () => {
  assert.match(onet, /nextLabel:level<20\?`Chơi Level \$\{level\+1\}`:'Chơi lại từ Level 1'/);
  assert.match(onet, /next:\(\)=>start\(level<20\?level\+1:1\)/);
  assert.match(onet, /choose:chooseLevels/);
});

test('Sliding Puzzle and Jigsaw advance from easy to hard, then to the next image', () => {
  assert.match(app, /const nextImage=difficulty==='easy'\?chosen:levels\[\(currentIndex\+1\+levels\.length\)%levels\.length\]/);
  assert.match(app, /const nextMode=difficulty==='easy'\?'hard':'easy'/);
  assert.match(extra, /const nextImage=difficulty==='easy'\?chosen:album\[\(currentIndex\+1\+album\.length\)%album\.length\]/);
  assert.match(extra, /const nextMode=difficulty==='easy'\?'hard':'easy'/);
});

test('full-size preview and post-result choice stay above the game overlays', () => {
  assert.match(css, /\.unlocked-image-preview-overlay\{\s*z-index:2400!important/);
  assert.match(css, /\.post-result-choice-overlay\{\s*z-index:2500!important/);
});
