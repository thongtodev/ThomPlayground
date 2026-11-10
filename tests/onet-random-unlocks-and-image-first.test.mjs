import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';
import { createBoard } from '../src/onetEngine.js';

const onet = readFileSync(new URL('../src/OnetGame.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const config = readFileSync(new URL('../src/gameFeatures.js', import.meta.url), 'utf8');
const albumEditor = readFileSync(new URL('../src/GameAlbumEditor.jsx', import.meta.url), 'utf8');

test('Onet board remains 24 pairs while using the selected number of random image types', () => {
  for (const [level,typeCount] of [[1,6],[3,8],[6,12],[10,24]]) {
    const board = createBoard(level,typeCount);
    assert.equal(board.length,48);
    const counts = new Map();
    for (const tile of board) if (tile!==null) counts.set(tile,(counts.get(tile)||0)+1);
    assert.equal(counts.size,typeCount);
    assert.equal([...counts.values()].reduce((sum,n)=>sum+n,0),48);
    for (const count of counts.values()) assert.equal(count,48/typeCount);
  }
});

test('each new level samples images randomly from the configured album and saves the sample for resume', () => {
  assert.match(onet, /const shuffledPhotos=\[\.\.\.availablePhotos\]/);
  assert.match(onet, /const photoCount=availablePhotos\.length\?Math\.min\(c\.types,availablePhotos\.length\):c\.types/);
  assert.match(onet, /setRoundPhotoIds\(selectedPhotos\.map\(photo=>photo\.id\)\)/);
  assert.match(onet, /photoIds:roundPhotoIds/);
  assert.match(onet, /const roundPhotos=useMemo/);
});

test('reward draws use the full album and collection is saved uniquely', () => {
  assert.match(onet,/drawOnetPhotos\(availablePhotos,latest.collection,level\)/);
  assert.match(onet,/collection:nextCollection/);
});

test('the newly unlocked original images appear before the leaderboard and collection is available', () => {
  assert.match(onet, /newlyUnlocked\.map\(\(photo,draw\)=><button type="button" className="onet-unlocked-image-button" key=\{draw\} onClick=\{\(\)=>setViewingUnlockedPhoto\(photo\)\}/);
  assert.match(onet, /<div className="result-card onet-unlocked-card"><button type="button" className="image-review-close" onClick=\{closeWinImage\}/);
  assert.match(onet, /onClick=\{openCollection\}>Bộ sưu tập hình ảnh<\/button>/);
  assert.match(onet, /phase==='won'&&showWinImage&&createPortal\(<div className="overlay onet-unlocked-overlay"/);
  assert.ok(onet.includes("onAlbums('onet')"));
  assert.ok(onet.includes('postResultActionsRef.current='));
  assert.match(onet, /setWinResult\(result\);[\s\S]*?onEvent\(\{type:'onet_win'/);
  assert.match(app, /event\.type==='puzzle_level_win'\|\|event\.type==='jigsaw_level_win'\|\|event\.type==='onet_win'\)\{setPendingGameResult\(result\);\}/);
  assert.match(app, /onResultReady=\{showPendingGameResult\}/);
});

test('Onet collection keeps locked images blurred and reveals originals when unlocked', () => {
  assert.match(onet, /function OnetAlbum/);
  assert.match(onet, /className=\{`onet-collection-tile \$\{isUnlocked\?'unlocked':'locked'\}`\}/);
  assert.match(css, /\.onet-collection-tile\.locked img\{filter:blur/);
  assert.match(css, /\.onet-photo-viewer img\{display:block;width:100%;height:auto/);
});

test('the admin can maintain a collection larger than 24 photos while each board remains capped', () => {
  assert.match(config, /onetAlbum:normalizeAlbum\(c\?\.onetAlbum\)/);
  assert.match(albumEditor, /max=isMiner\?10:Infinity/);
  assert.match(albumEditor, /Thêm bao nhiêu ảnh tùy ý vào bộ sưu tập/);
  assert.match(albumEditor, /Math\.max\(24,value\.length\)/);
});
