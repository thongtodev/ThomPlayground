import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFile } from './sourceHelpers.mjs';
const read=file=>readFile(new URL(file,import.meta.url),'utf8');

test('Ghép Thơm Đi opens its image collection directly from the game page',async()=>{
  const app=await read('../src/App.jsx');
  assert.match(app,/onClick=\{openCollection\}>Bộ sưu tập hình ảnh/);
  assert.ok(app.includes("onAlbums('puzzle')"));
  assert.match(app,/aria-label="Bộ sưu tập"/);
  const collection=app.slice(app.indexOf('function Collection('),app.indexOf('function RadioPlayer('));
  assert.doesNotMatch(collection,/puzzle-collection-section/);
});

test('hidden games are filtered from achievements and leaderboard routes',async()=>{
  const app=await read('../src/App.jsx');
  assert.match(app,/getVisibleGames\(GAMES,config\.gameAvailability\)/);
  assert.match(app,/getVisibleRewards\(config\.rewards,games,GAMES\)/);
  assert.match(app,/<Collection[^>]+games=\{availableGames\}/);
  assert.match(app,/<LeaderboardPage games=\{availableGames\.filter\(game=>game\.id!=='uno'\)\}/);
});

test('each game result is saved to per-run history, not only personal best',async()=>{
  const app=await read('../src/App.jsx');
  const service=await read('../src/leaderboards.js');
  const history=await read('../src/personalHistory.js');
  const page=await read('../src/Leaderboard.jsx');
  assert.match(app,/savePersonalRun\(event\.result\)/);
  assert.match(service,/personalHistory/);
  assert.match(history,/history\.unshift\(run\)/);
  assert.match(page,/Lịch sử từng ván/);
  assert.match(page,/getPersonalHistory\(gameId/);
});
