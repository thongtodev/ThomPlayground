import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const start = app.indexOf('function TicGame');
const end = app.indexOf('function ReactionGame', start);
const tic = app.slice(start, end);
const features = readFileSync(new URL('../src/gameFeatures.js', import.meta.url), 'utf8');

test('Thơm X Thơm O names its computer opponent as chú Thơm everywhere in the player UI', () => {
  assert.match(tic, /<option value="ai">Bạn đấu với chú Thơm<\/option>/);
  assert.match(tic, /Độ khó của chú Thơm/);
  assert.match(tic, /<label>Chú Thơm<select/);
  assert.match(tic, /Ván này chú thắng nha, làm ván nữa không\?/);
  assert.match(tic, /· Chú Thơm thắng!/);
  assert.match(tic, /' · Đợi chú nghĩ một xíu nha…'/);
  assert.match(tic, /Đấu với chú Thơm · \$\{levelName\}/);
  assert.doesNotMatch(tic, /Người chơi vs Máy|Độ khó AI|<label>AI<select|Máy chiến thắng|Máy thắng|Lượt của Máy/);
});

test('Tic achievements use chú Thơm terminology while preserving their metric IDs', () => {
  assert.match(features, /id:'tic-five',[^\n]*description:'Chim cá thắng chú Thơm tổng cộng 5 ván/);
  assert.match(features, /id:'tic-streak',[^\n]*description:'Chim cá thắng chú Thơm 3 ván X O liền nhau/);
  assert.match(features, /\['tic_ai_wins','Số lần thắng chú Thơm'\]/);
  assert.match(features, /metric:'tic_ai_wins'/);
});

test('older personal records and leaderboard summaries are normalized to chú Thơm', () => {
  assert.match(app, /replace\(\/Thắng AI\/gi,'Thắng chú Thơm'\)/);
  assert.match(app, /replace\(\/Máy thắng/);
  const leaderboard = readFileSync(new URL('../src/Leaderboard.jsx', import.meta.url), 'utf8');
  assert.match(leaderboard, /replace\(\/Thắng AI\/gi,'Thắng chú Thơm'\)/);
});

test('Bốn Quân Nhà Thơm also uses chú Thơm terminology instead of machine/AI labels', () => {
  const extra = readFileSync(new URL('../src/NewGames.jsx', import.meta.url), 'utf8');
  const start = extra.indexOf('function ConnectFourGame');
  const end = extra.indexOf('function SimonSaysGame', start);
  const connect4 = extra.slice(start, end);
  assert.match(connect4, /<option value="ai">Bạn đấu với chú Thơm<\/option>/);
  assert.match(connect4, /Độ khó của chú Thơm/);
  assert.match(connect4, /Đợi chú nghĩ một xíu nha…/);
  assert.match(connect4, /Chú Thơm chiến thắng/);
  assert.match(connect4, /Đấu với chú Thơm ·/);
  assert.doesNotMatch(connect4, /Người chơi vs Máy|Độ khó AI|Máy chiến thắng|Máy đã nối đủ|Máy đang suy nghĩ|Đấu máy|AI ·/);
});
