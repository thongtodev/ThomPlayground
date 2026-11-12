import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isValidPuzzleBoard,slidePuzzleTile,isPuzzleSolved} from '../src/puzzleEngine.js';

const game=readFileSync(new URL('../src/games/PuzzleGame.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/03-shared-components.css',import.meta.url),'utf8');

for(const n of [3,5]) {
 test(`${n}x${n}: every legal slide preserves all unique pieces and exactly one blank`,()=>{
  const length=n*n,blankValue=length-1;
  let board=Array.from({length},(_,i)=>i);
  for(let step=0;step<1000;step++){
   const blank=board.indexOf(blankValue);
   const neighbors=[blank-n,blank+n,blank-1,blank+1].filter(i=>i>=0&&i<length&&
       (Math.abs(i-blank)===n||(Math.floor(i/n)===Math.floor(blank/n)&&Math.abs(i-blank)===1)));
   const i=neighbors[(step*17+Math.floor(step/7))%neighbors.length];
   const next=slidePuzzleTile(board,n,i);
   assert.ok(next,'a valid adjacent piece must slide');
   assert.equal(next.indexOf(blankValue),i,'blank moves to the selected position');
   assert.ok(isValidPuzzleBoard(next,n));
   assert.deepEqual([...next].sort((a,b)=>a-b),Array.from({length},(_,j)=>j));
   board=next;
  }
 });
 test(`${n}x${n}: illegal moves leave state unchanged`,()=>{
  const board=Array.from({length:n*n},(_,i)=>i);
  const initial=board.slice();
  for(const i of [-1,0,1,n*n-1,n*n]){
   assert.equal(slidePuzzleTile(board,n,i),null);
  }
  assert.deepEqual(board,initial);
 });
}

test('restoring a corrupted game with missing or merged tile IDs is rejected',()=>{
 assert.equal(isValidPuzzleBoard([0,1,2,3,4,5,6,8],3),false);
 assert.equal(isValidPuzzleBoard([0,1,2,3,4,5,6,7,7],3),false);
 assert.equal(isValidPuzzleBoard([0,1,2,3,4,5,6,7,8],3),true);
 assert.equal(isValidPuzzleBoard(Array.from({length:25},(_,i)=>i),5),true);
 assert.equal(isPuzzleSolved([0,1,2,3,4,5,6,7,8]),true);
 assert.equal(isPuzzleSolved([0,1,2,3,4,5,6,8,7]),false);
 assert.match(game,/isValidPuzzleBoard\(snapshot\.tiles,snapshot\.n\)/);
});

test('slide puzzle no longer animates or shakes each tile transform directly',()=>{
 assert.doesNotMatch(game,/usePieceMotion\(/);
 assert.doesNotMatch(game,/type:'shake',element:document\.querySelectorAll\('\.puzzle-tile'\)/);
 assert.match(game,/slidePuzzleTile\(tilesRef\.current,n,i\)/);
 assert.match(game,/tilesRef\.current=next/);
 assert.match(game,/movesRef\.current=nextMoves/);
 assert.match(css,/\.puzzle-board > \.puzzle-tile\.invalid:not\(\.empty\)/);
});
