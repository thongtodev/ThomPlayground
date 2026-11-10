/** Local player progress for each image-level in Ghép Thơm Đi! */
export function canPlayPuzzleDifficulty(collection, imageId, difficulty) {
  if (difficulty !== 'hard') return true;
  return Boolean(collection?.[imageId]?.easy);
}

export function recordPuzzleLevelCompletion(collection, event) {
  if (!event?.imageId) return { ...(collection || {}) };
  const previous = collection?.[event.imageId] || {};
  const easy = Boolean(previous.easy || event.difficulty === 'easy' || event.n === 3);
  const hard = Boolean(previous.hard || event.difficulty === 'hard' || event.n === 5);
  return {
    ...(collection || {}),
    [event.imageId]: {
      ...previous,
      easy,
      hard,
      lastCompletedAt: new Date().toISOString(),
    },
  };
}

export function countCollectedPuzzleImages(collection) {
  return Object.values(collection || {}).filter(item => item?.easy || item?.hard).length;
}


/** Local player progress for each image-level in Mảnh Ghép Nhà Thơm. */
export function canPlayJigsawDifficulty(collection, imageId, difficulty) {
  if (difficulty !== 'hard') return true;
  return Boolean(collection?.[imageId]?.easy);
}

export function recordJigsawLevelCompletion(collection, event) {
  if (!event?.imageId) return { ...(collection || {}) };
  const previous = collection?.[event.imageId] || {};
  const easy = Boolean(previous.easy || event.difficulty === 'easy' || event.n === 3);
  const hard = Boolean(previous.hard || event.difficulty === 'hard' || event.n === 5);
  return {
    ...(collection || {}),
    [event.imageId]: {
      ...previous,
      easy,
      hard,
      lastCompletedAt: new Date().toISOString(),
    },
  };
}

export function countCollectedJigsawImages(collection) {
  return Object.values(collection || {}).filter(item => item?.easy || item?.hard).length;
}
