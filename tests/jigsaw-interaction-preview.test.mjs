import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const app = readFileSync(new URL('../src/NewGames.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('reference image modal is constrained to viewport and its card', () => {
  assert.match(app, /jigsaw-sample-overlay/);
  assert.match(css, /\.jigsaw-sample-modal\s*\{[^}]*max-height:calc\(100dvh - 32px\)[^}]*overflow:auto/s);
  assert.match(css, /\.jigsaw-sample-modal>img\s*\{[^}]*max-width:100%[^}]*object-fit:contain/s);
  assert.match(css, /\.jigsaw-result>img\s*\{[^}]*max-width:100%[^}]*object-fit:contain/s);
  assert.match(css, /\.puzzle-collection-preview-overlay \.puzzle-collection-modal>img\s*\{[^}]*max-width:100%[^}]*object-fit:contain/s);
});

test('jigsaw uses classic select-then-rotate-left/right controls', () => {
  assert.match(app, /const rotateSelected=direction=>/);
  assert.match(app, /normalizeJigsawRotation\(\(rotations\[piece\]\|\|0\)\+direction\)/);
  assert.match(app, /const selectTrayPiece=piece=>\{/);
  assert.match(app, /swapSelectedWith\(\{source:'tray',id:piece\}\)/);
  assert.match(app, /onClick=\{\(\)=>rotateSelected\(-90\)\}/);
  assert.match(app, /onClick=\{\(\)=>rotateSelected\(90\)\}/);
  assert.match(app, /Xoay trái/);
  assert.match(app, /Xoay phải/);
  assert.match(app, /chạm mảnh khác để hoán đổi vị trí/);
});

test('mobile jigsaw supports direct pointer drag from tray to target slots', () => {
  assert.match(app, /onPointerDown=\{handleTouchPointerDown\(piece,'tray'\)\}/);
  assert.match(app, /onPointerMove=\{handleTouchPointerMove\}/);
  assert.match(app, /onPointerUp=\{handleTouchPointerUp\}/);
  assert.match(app, /document\.elementFromPoint\(e\.clientX,e\.clientY\)/);
  assert.match(app, /data-jigsaw-slot=\{slot\}/);
  assert.match(app, /touchDragRef\.current=null;[\s\S]*?movePieceToBoard\(drag\.id,Number\(slotElement\.dataset\.jigsawSlot\)\)/);
  assert.match(css, /\.jigsaw-piece-button\s*\{[^}]*touch-action:none!important/s);
  assert.match(app, /chạm mảnh khác để hoán đổi vị trí/);
});

test('touch tap selects a jigsaw piece; actual drag only moves it', () => {
  const up = app.slice(app.indexOf('const handleTouchPointerUp'), app.indexOf('const handleTouchPointerCancel'));
  const tapBranch = up.slice(up.indexOf('if(!drag.moved)'), up.indexOf('suppressTouchClickRef.current=Date.now()'));
  assert.match(tapBranch, /setDragged\(null\);\s*return/);
  assert.doesNotMatch(tapBranch, /rotateSelected|rotatePiece/);
  const dragBranch = up.slice(up.indexOf('const target=document.elementFromPoint'), up.lastIndexOf('setDragged(null);'));
  assert.match(dragBranch, /movePieceToBoard\(drag\.id,Number\(slotElement\.dataset\.jigsawSlot\)\)/);
  assert.doesNotMatch(dragBranch, /rotateSelected|rotatePiece/);
  assert.match(app, /const selectTrayPiece=piece=>\{/);
  assert.match(app, /swapSelectedWith\(\{source:'tray',id:piece\}\)/);
  assert.match(app, /swapSelectedWith\(\{source:'board',id:piece,index:slot\}\)/);
});

test('jigsaw supports both rotation directions only after selecting a piece', () => {
  assert.match(app, /rotateSelected\(-90\)/);
  assert.match(app, /rotateSelected\(90\)/);
  assert.match(app, /onClick=\{handlePieceClick\(\(\)=>selectTrayPiece\(piece\)\)\}/);
  assert.match(app, /onClick=\{handlePieceClick\(\(\)=>selectBoardSlot\(slot\)\)\}/);
  assert.match(app, /Date\.now\(\)-suppressTouchClickRef\.current<250/);
});

test('jigsaw rotation controls are explicit left and right buttons', () => {
  assert.match(app, /<Icon name="rotate-ccw" size=\{16\}\/> Xoay trái/);
  assert.match(app, /<Icon name="rotate-cw" size=\{16\}\/> Xoay phải/);
});


test('tap-to-swap exchanges jigsaw piece positions and keeps rotation unchanged', () => {
  const swap = app.slice(app.indexOf('const swapSelectedWith='), app.indexOf('const selectTrayPiece='));
  assert.match(swap, /swapJigsawPiecePositions\(placements,tray,selectedPiece,target\)/);
  assert.match(swap, /setPlacements\(swapped\.placements\)/);
  assert.match(swap, /setTray\(swapped\.tray\)/);
  assert.match(swap, /complete\(swapped\.placements,rotations,count\)/);
  assert.doesNotMatch(swap, /setRotations/);
  assert.match(app, /chạm mảnh khác để hoán đổi vị trí/);
});
