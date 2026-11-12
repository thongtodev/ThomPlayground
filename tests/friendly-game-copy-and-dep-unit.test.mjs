import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/App.jsx');
const onet = read('../src/OnetGame.jsx');
const extra = read('../src/NewGames.jsx');
const features = read('../src/gameFeatures.js');
const leaderboard = read('../src/Leaderboard.jsx');

test('all nine game cards use the friendlier Thơm Playground descriptions', () => {
  for (const phrase of [
    'Một bàn cờ đầy ô bí ẩn',
    'Tặng dép thật nhanh',
    'Đấu trí với chú Thơm',
    'đủ nhanh tay và tinh mắt',
    'Bức hình của chú Thơm bị xáo trộn',
    'nối thật khéo',
    'đừng để đối thủ vượt mặt nhé!',
    'thứ tự bí mật',
    'nhiều mảnh lộn xộn',
  ]) assert.ok(app.includes(phrase), `missing home copy: ${phrase}`);
  for (const phrase of ['Một cuộc đấu trí bắt đầu!', 'một thứ tự bí mật', 'xoay và ghép lại']) {
    assert.ok(extra.includes(phrase), `missing new-game copy: ${phrase}`);
  }
});

test('each game introduction explains its core interaction in friendly language', () => {
  for (const phrase of ['số trong ô cho biết', 'Bàn 3×3, chim cá', 'Chạm quá sớm', 'Chạm ô cạnh chỗ trống để trượt nha']) {
    assert.ok(app.includes(phrase), `missing intro guide: ${phrase}`);
  }
  for (const phrase of ['tối đa 2 góc rẽ', 'Kéo thả hoặc chạm hai mảnh để đổi chỗ', 'Chọn mảnh rồi xoay trái hoặc phải']) {
    assert.ok(onet.includes(phrase) || extra.includes(phrase), `missing guide: ${phrase}`);
  }
});

test('player-facing point labels and achievement descriptions use dép', () => {
  assert.ok(app.includes("label:'Dép',value:score"));
  assert.ok(onet.includes("<small>Dép</small>"));
  assert.ok(features.includes('Đạt 300 dép trong Tặng dép'));
  assert.ok(features.includes('Đạt 3.000 dép trong một Level'));
  assert.ok(features.includes("['mole_best','Dép Tặng dép cao nhất']"));
  assert.ok(read('../src/gameRankings.js').includes("?'thử thách':'dép'"));
  assert.ok(read('../src/RankedBoard.jsx').includes('rankUnit(game)'));
  assert.ok(leaderboard.includes('asDepText(run.metricLabel)'));
});

test('legacy Supabase achievement text and saved leaderboard labels are normalized to dép', () => {
  assert.ok(features.includes("replace(/điểm/gi,'dép')"));
  assert.ok(app.includes('asDepText(records?.[g.id]?.label)'));
  assert.ok(leaderboard.includes("value.replace(/điểm/gi,'dép')"));
});
