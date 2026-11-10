import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const onet = readFileSync(new URL('../src/OnetGame.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const jigsaw = readFileSync(new URL('../src/NewGames.jsx', import.meta.url), 'utf8');

const cases = [
  ['Nối Thơm Đi!', onet, 'onet-unlocked-overlay'],
  ['Ghép Thơm Đi!', app.slice(app.indexOf('function PuzzleGame('), app.indexOf('\nfunction PuzzleCollectionTile')), 'puzzle-win-overlay'],
  ['Mảnh Ghép Nhà Thơm', jigsaw.slice(jigsaw.indexOf('function JigsawGame')), 'jigsaw-unlocked-overlay']
];

for (const [name, source, overlay] of cases) {
  test(`${name}: X removes the image-review layer before opening the leaderboard`, () => {
    assert.match(source, /\[showWinImage,setShowWinImage\]=useState\(false\)/);
    assert.match(source, /const closeWinImage=event=>\{event\?\.preventDefault\?\.\(\);event\?\.stopPropagation\?\.\(\);setShowWinImage\(false\);onResultReady\?\.\(winResult\);\};/);
    assert.ok(source.includes(`phase==='won'&&showWinImage&&createPortal(<div className="overlay ${overlay}"`));
    assert.match(source, /setShowWinImage\(true\);setPhase\('won'\)/);
    assert.ok(source.includes('onClick={closeWinImage}'));
  });
}

test('Nối Thơm Đi!: the level picker leaves album access to the navbar', () => {
  const ready = onet.slice(onet.indexOf("if(phase==='ready')return"), onet.indexOf('return <main className="game-page onet-page"'));
  assert.ok(!ready.includes('onClick={openCollection}'));
  assert.doesNotMatch(ready, /openCollection/);
  assert.match(onet, /const openCollection=event=>\{event\?\.preventDefault\?\.\(\);event\?\.stopPropagation\?\.\(\);onAlbums\('onet'\);\};/);
});
