// Pure slide-puzzle rules. The last number represents the single empty cell.
// Keep this independent from React and DOM animations to prevent tile state drift.
export function isValidPuzzleBoard(tiles, n) {
  if (!Number.isInteger(n) || ![3, 5].includes(n) || !Array.isArray(tiles) || tiles.length !== n * n) return false;
  const seen = new Set(tiles);
  return seen.size === n * n && tiles.every(value => Number.isInteger(value) && value >= 0 && value < n * n);
}

export function slidePuzzleTile(tiles, n, index) {
  if (!isValidPuzzleBoard(tiles, n) || !Number.isInteger(index) || index < 0 || index >= n * n) return null;
  const empty = tiles.indexOf(n * n - 1);
  const sameRow = Math.floor(index / n) === Math.floor(empty / n);
  if (!((sameRow && Math.abs(index - empty) === 1) || Math.abs(index - empty) === n)) return null;
  const next = tiles.slice();
  [next[index], next[empty]] = [next[empty], next[index]];
  return next;
}

export function isPuzzleSolved(tiles) {
  return Array.isArray(tiles) && tiles.every((value, index) => value === index);
}
