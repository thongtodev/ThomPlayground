import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyConnectBoard,dropConnectDisc,connectFourWinner,legalConnectColumns,chooseConnectFourMove} from '../src/connectFourEngine.js';
import {shuffleJigsaw,swapJigsawTiles,isJigsawSolved} from '../src/jigsawEngine.js';

test('Connect Four drops discs to the lowest available cell and rejects full columns',()=>{
 let board=emptyConnectBoard();
 board=dropConnectDisc(board,2,'R');
 assert.equal(board[5][2],'R');
 board=dropConnectDisc(board,2,'Y');
 assert.equal(board[4][2],'Y');
 for(let i=0;i<5;i++)board=dropConnectDisc(board,0,i%2?'Y':'R');
 board=dropConnectDisc(board,0,'R');
 assert.equal(dropConnectDisc(board,0,'Y'),null);
 assert.deepEqual(legalConnectColumns(board).includes(0),false);
});

test('Connect Four detects horizontal, vertical and diagonal four-in-a-row',()=>{
 let b=emptyConnectBoard();
 for(let c=0;c<4;c++)b=dropConnectDisc(b,c,'R');
 assert.equal(connectFourWinner(b)?.winner,'R');
 b=emptyConnectBoard();for(let i=0;i<4;i++)b=dropConnectDisc(b,3,'Y');
 assert.equal(connectFourWinner(b)?.winner,'Y');
 b=emptyConnectBoard();
 const seq=[[0,'R'],[1,'Y'],[1,'R'],[2,'Y'],[2,'Y'],[2,'R'],[3,'Y'],[3,'Y'],[3,'Y'],[3,'R']];
 for(const [c,p] of seq)b=dropConnectDisc(b,c,p);
 assert.equal(connectFourWinner(b)?.winner,'R');
});

test('Connect Four medium and hard AI take a winning move and block an immediate loss',()=>{
 let b=emptyConnectBoard();for(let c=0;c<3;c++)b=dropConnectDisc(b,c,'R');
 assert.equal(chooseConnectFourMove(b,'R','medium'),3);
 b=emptyConnectBoard();for(let c=0;c<3;c++)b=dropConnectDisc(b,c,'Y');
 assert.equal(chooseConnectFourMove(b,'R','medium'),3);
});

test('Jigsaw shuffle keeps every piece and produces a solvable permutation',()=>{
 const tiles=shuffleJigsaw(4,()=>0.37,60);
 assert.equal(tiles.length,16);
 assert.deepEqual([...tiles].sort((a,b)=>a-b),Array.from({length:16},(_,i)=>i));
 assert.equal(isJigsawSolved(tiles),false);
});

test('Jigsaw swapping restores solved state and ignores invalid moves',()=>{
 const solved=Array.from({length:9},(_,i)=>i);
 const swapped=swapJigsawTiles(solved,0,1);
 assert.equal(isJigsawSolved(swapped),false);
 assert.equal(isJigsawSolved(swapJigsawTiles(swapped,0,1)),true);
 assert.equal(swapJigsawTiles(solved,0,0),solved);
 assert.equal(swapJigsawTiles(solved,-1,2),solved);
});

test('Connect Four hard AI uses the tactical search path and returns a legal move',()=>{
 let board=emptyConnectBoard();
 for(let c=0;c<3;c++)board=dropConnectDisc(board,c,'Y');
 const move=chooseConnectFourMove(board,'R','hard');
 assert.equal(move,3);
 board=emptyConnectBoard();
 for(let c=0;c<2;c++)board=dropConnectDisc(board,c,'R');
 const next=chooseConnectFourMove(board,'R','hard');
 assert.ok(legalConnectColumns(board).includes(next));
});
