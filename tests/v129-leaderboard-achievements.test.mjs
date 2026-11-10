import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFile } from './sourceHelpers.mjs';

const read = file => readFile(new URL(file, import.meta.url), 'utf8');

test('achievement rewards use medal icons and no secret-image reward fields', async () => {
  const features = await read('../src/gameFeatures.js');
  const admin = await read('../src/Admin.jsx');
  const app = await read('../src/App.jsx');
  const defaults = features.slice(features.indexOf('export const DEFAULT_REWARDS'), features.indexOf('export const METRICS'));
  assert.match(defaults, /icon:/);
  assert.match(defaults, /tier:/);
  assert.doesNotMatch(defaults, /imageId/);
  assert.doesNotMatch(admin, /Ảnh thưởng|ảnh mở khóa|reward\.imageId/);
  assert.match(app, /achievement-emblem/);
  assert.doesNotMatch(app, /ảnh bí mật/);
});

test('leaderboard page and result dialog are wired into the app', async () => {
  const app = await read('../src/App.jsx');
  const page = await read('../src/Leaderboard.jsx');
  const service = await read('../src/leaderboards.js');
  assert.match(app, /route==='leaderboard'/);
  assert.match(app, /LeaderboardResultModal/);
  assert.match(app, /savePersonalBest/);
  assert.match(page, /Gửi kỷ lục/);
  assert.match(page, /Kỷ lục cá nhân/);
  assert.match(page, /<RankedBoard/);
  assert.match(service, /game_leaderboards/);
  assert.match(service, /getPersonalBests/);
});

test('all six games produce a game-specific result payload', async () => {
  const app = await read('../src/App.jsx');
  const onet = await read('../src/OnetGame.jsx');
  for (const id of ['mines','mole','tic','reaction','puzzle']) assert.match(app, new RegExp(`gameId:'${id}'`));
  assert.match(onet, /gameId:'onet'/);
  assert.match(app, /metricKind:'time'/);
  assert.match(app, /metricKind:'score'/);
  assert.match(app, /metricKind:'wins'/);
  assert.match(app, /metricKind:'reaction'/);
  assert.match(app, /metricKind:'steps'/);
});

test('Supabase migration creates a public read/insert leaderboard without public update/delete', async () => {
  const sql = await read('../supabase.sql');
  assert.match(sql, /create table if not exists public\.game_leaderboards/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /Public may read game leaderboards/);
  assert.match(sql, /Public may submit game leaderboard entries/);
  assert.match(sql, /grant select, insert on public\.game_leaderboards to anon, authenticated/);
  assert.doesNotMatch(sql, /grant .*update.*game_leaderboards/i);
  assert.doesNotMatch(sql, /grant .*delete.*game_leaderboards/i);
});
