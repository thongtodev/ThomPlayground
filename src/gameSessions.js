const GAME_SESSIONS_KEY = 'thom-game-sessions-v1';

function readAll(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem(GAME_SESSIONS_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function loadGameSession(gameId, storage = globalThis.localStorage) {
  const value = readAll(storage)[gameId];
  return value && typeof value === 'object' ? value : null;
}

export function saveGameSession(gameId, snapshot, storage = globalThis.localStorage) {
  if (!gameId || !snapshot || !storage) return;
  const all = readAll(storage);
  try {
    storage.setItem(GAME_SESSIONS_KEY, JSON.stringify({
      ...all,
      [gameId]: { ...snapshot, savedAt: new Date().toISOString() },
    }));
  } catch (error) {
    // A full browser storage quota must never interrupt the game itself.
    console.warn('Không thể lưu ván chơi trên thiết bị này.', error);
  }
}

export function clearGameSession(gameId, storage = globalThis.localStorage) {
  if (!gameId || !storage) return;
  const all = readAll(storage);
  if (!(gameId in all)) return;
  delete all[gameId];
  try { storage.setItem(GAME_SESSIONS_KEY, JSON.stringify(all)); } catch {}
}

export function restoredPhase(session) {
  return session ? 'paused' : 'ready';
}

export function resumePhase(session, fallback = 'playing') {
  const phase = session?.resumePhase || session?.phase;
  return phase && !['ready', 'paused', 'won', 'lost', 'result', 'over'].includes(phase) ? phase : fallback;
}
