const PERSONAL_HISTORY_KEY = 'thom-personal-history-v1';

function readHistory(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem(PERSONAL_HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function savePersonalRun(entry, storage = globalThis.localStorage, now = new Date()) {
  if (!entry?.gameId || !storage) return null;
  const run = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
    gameId: entry.gameId,
    gameName: entry.gameName || entry.gameId,
    title: entry.title || 'Ván chơi kết thúc',
    summary: entry.summary || '',
    variant: entry.variant || 'default',
    variantLabel: entry.variantLabel || 'Mặc định',
    metricKind: entry.metricKind || '',
    metricValue: Number.isFinite(Number(entry.metricValue)) ? Number(entry.metricValue) : null,
    metricLabel: entry.metricLabel || 'Chưa có kết quả',
    eligible: Boolean(entry.eligible),
    details: entry.details && typeof entry.details === 'object' ? entry.details : {},
    playedAt: now.toISOString(),
  };
  const history = readHistory(storage);
  history.unshift(run);
  try { storage.setItem(PERSONAL_HISTORY_KEY, JSON.stringify(history.slice(0, 500))); } catch {}
  return run;
}

export function getPersonalHistory(gameId = '', variant = '', storage = globalThis.localStorage) {
  return readHistory(storage)
    .filter(run => (!gameId || run.gameId === gameId) && (!variant || run.variant === variant))
    .sort((a, b) => new Date(b.playedAt || 0) - new Date(a.playedAt || 0));
}
