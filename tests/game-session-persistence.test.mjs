import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';
import { loadGameSession, saveGameSession, clearGameSession, restoredPhase, resumePhase } from '../src/gameSessions.js';

function memoryStorage() {
  const values = new Map();
  return { getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value), removeItem:key=>values.delete(key) };
}

test('game sessions save, load and clear independently per game', () => {
  const storage = memoryStorage();
  saveGameSession('mines', { phase:'playing', board:[{i:0,open:true}], seconds:18 }, storage);
  saveGameSession('puzzle', { phase:'playing', tiles:[1,0,2], moves:7 }, storage);
  assert.equal(loadGameSession('mines', storage).seconds, 18);
  assert.deepEqual(loadGameSession('puzzle', storage).tiles, [1,0,2]);
  clearGameSession('mines', storage);
  assert.equal(loadGameSession('mines', storage), null);
  assert.deepEqual(loadGameSession('puzzle', storage).tiles, [1,0,2]);
});

test('restored games wait in a paused state and preserve their original active phase', () => {
  const session = { phase:'input', resumePhase:'input' };
  assert.equal(restoredPhase(session), 'paused');
  assert.equal(resumePhase(session), 'input');
  assert.equal(restoredPhase(null), 'ready');
});

test('all nine games persist their in-progress board and game settings', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const onet = readFileSync(new URL('../src/OnetGame.jsx', import.meta.url), 'utf8');
  const extra = readFileSync(new URL('../src/NewGames.jsx', import.meta.url), 'utf8');
  for (const id of ['mines','mole','tic','reaction','puzzle']) {
    assert.ok(app.includes("loadGameSession('"+id+"')"), id+' restores saved state');
    assert.ok(app.includes("saveGameSession('"+id+"'"), id+' saves state');
  }
  assert.match(onet, /loadGameSession\('onet'\)/);
  assert.match(onet, /saveGameSession\('onet'/);
  for (const id of ['connect4','simon','jigsaw']) {
    assert.ok(extra.includes("loadGameSession('"+id+"')"), id+' restores saved state');
    assert.ok(extra.includes("saveGameSession('"+id+"'"), id+' saves state');
  }
  assert.match(app, /Chơi tiếp ván trước/);
  assert.match(onet, /Chơi tiếp ván trước/);
  assert.match(extra, /Chơi tiếp ván trước/);
});

test('the release includes the configured Supabase public client template', () => {
  const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  assert.match(env, /^VITE_SUPABASE_URL=https:\/\/trxcrclvdwcuqljczava\.supabase\.co$/m);
  assert.match(env, /^VITE_SUPABASE_ANON_KEY=sb_publishable_/m);
  assert.doesNotMatch(env, /service_role|SERVICE_ROLE/);
});
