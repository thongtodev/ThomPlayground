import test from 'node:test';
import assert from 'node:assert/strict';
import {swapJigsawPiecePositions} from '../src/jigsawEngine.js';

test('tap swapping two pieces already on the board only exchanges their positions', () => {
  const result = swapJigsawPiecePositions([3, 7, null], [0, 1, 2], 
    {source:'board', id:3, index:0}, {source:'board', id:7, index:1});
  assert.equal(result.changed, true);
  assert.deepEqual(result.placements, [7, 3, null]);
  assert.deepEqual(result.tray, [0, 1, 2]);
});

test('tap swapping two pieces in the tray only exchanges their order', () => {
  const result = swapJigsawPiecePositions([null, 4], [0, 1, 2],
    {source:'tray', id:0}, {source:'tray', id:2});
  assert.equal(result.changed, true);
  assert.deepEqual(result.placements, [null, 4]);
  assert.deepEqual(result.tray, [2, 1, 0]);
});

test('tap swapping a tray piece with a placed board piece exchanges both pieces', () => {
  const result = swapJigsawPiecePositions([4, null], [0, 1, 2],
    {source:'tray', id:1}, {source:'board', id:4, index:0});
  assert.equal(result.changed, true);
  assert.deepEqual(result.placements, [1, null]);
  assert.deepEqual(result.tray, [0, 4, 2]);
});

test('placing a tray piece into an empty board slot removes it from the tray without changing other pieces', () => {
  const result = swapJigsawPiecePositions([null, 4], [0, 1, 2],
    {source:'tray', id:1}, {source:'board', index:0});
  assert.equal(result.changed, true);
  assert.deepEqual(result.placements, [1, 4]);
  assert.deepEqual(result.tray, [0, 2]);
});

test('swapping a board piece with a tray piece works regardless of tap order', () => {
  const result = swapJigsawPiecePositions([4, null], [0, 1, 2],
    {source:'board', id:4, index:0}, {source:'tray', id:1});
  assert.equal(result.changed, true);
  assert.deepEqual(result.placements, [1, null]);
  assert.deepEqual(result.tray, [0, 4, 2]);
});

test('same-position or invalid swaps do not change the board or tray', () => {
  const placements = [0, null, 2];
  const tray = [1];
  const result = swapJigsawPiecePositions(placements, tray,
    {source:'board', id:0, index:0}, {source:'board', id:0, index:0});
  assert.equal(result.changed, false);
  assert.deepEqual(result.placements, placements);
  assert.deepEqual(result.tray, tray);
});
