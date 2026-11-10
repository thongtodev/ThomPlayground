// Image IDs confirmed retired in the November 6 backup.
const retiredImages=new Set([
  '17d4fe55-9e6d-49a1-ac70-ea239665d71e',
  '246e7eba-3585-46ed-8611-5656289988a8',
  '363191d7-ac1c-44de-a1f4-44e8d7249736',
  '65d8505d-55c7-4819-8b4c-b7e5fd83b826',
  '681cb479-4dfd-433d-94ec-a22374229362',
  '7295b8b8-c722-4eed-b002-0acee679da74',
  'a36c691c-5455-483e-b908-a280d8618c33',
  'f6e362d5-84d3-46fe-bcc9-6ca890860390',
]);

// Keep the image ID in the ranking key so reordering the album never mixes records.
export function levelLabel(album, variant) {
  const match = /^(.*)-(easy|hard)$/.exec(variant || '');
  if (!match) return '';
  const index = album.findIndex(image => image.id === match[1]);
  if (index < 0 && match[1] !== 'default-thom') return '';
  const level = index >= 0 ? 'Level ' + String(index + 1).padStart(2, '0')
    : album.length ? 'Level mặc định' : 'Level 01';
  return level + ' · ' + (match[2] === 'hard' ? 'Khó' : 'Dễ');
}

export function migrateLocalLevelRecords(albums, storage = globalThis.localStorage) {
  const cleanupKey = 'thom-retired-level-cleanup-v1';
  const cleanup = !storage.getItem(cleanupKey);
  for (const key of ['thom-personal-history-v1','thom-personal-records-v1','thom-local-leaderboards-v1']) {
    let records;
    try { records = JSON.parse(storage.getItem(key)); } catch { continue; }
    if (!records || typeof records !== 'object') continue;
    let changed = false;
    for (const [id,row] of Object.entries(records)) {
      const album = albums[row?.gameId || row?.game_id];
      if (!album) continue;
      const label = levelLabel(album, row.variant);
      if (!label) {
        if (cleanup && retiredImages.has(String(row.variant).replace(/-(easy|hard)$/, ''))) {
          delete records[id]; changed = true;
        }
        continue;
      }
      const field = row.game_id ? 'variant_label' : 'variantLabel';
      if (row[field] !== label) { row[field] = label; changed = true; }
      if (row.details && 'imageName' in row.details) { delete row.details.imageName; changed = true; }
      if (row.summary && !row.summary.startsWith(label + ' · ')) {
        row.summary = label + ' · ' + (row.metricLabel || 'Đã hoàn thành');
        changed = true;
      }
    }
    if (changed) storage.setItem(key, JSON.stringify(Array.isArray(records) ? records.filter(Boolean) : records));
  }
  if (cleanup) storage.setItem(cleanupKey, '1');
}
