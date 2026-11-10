import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJigsawPiecePath,getJigsawPieceEdges,isJigsawSolved,normalizeJigsawRotation} from '../src/jigsawShapes.js';
import { readFeatureSource as readFile } from './sourceHelpers.mjs';

test('Jigsaw piece paths contain curved tabs rather than square tile geometry',()=>{
 const path=buildJigsawPiecePath(4,3);
 assert.match(path,/C /);
 assert.match(path,/Z$/);
 assert.notEqual(path,'M 0 0 L 1 0 L 1 1 L 0 1 Z');
});

test('Adjacent jigsaw pieces expose complementary shared edges',()=>{
 const size=4;
 for(let row=0;row<size;row++)for(let col=0;col<size-1;col++){
  const left=getJigsawPieceEdges(row*size+col,size).right;
  const right=getJigsawPieceEdges(row*size+col+1,size).left;
  assert.equal(left,-right);
 }
 for(let row=0;row<size-1;row++)for(let col=0;col<size;col++){
  const top=getJigsawPieceEdges(row*size+col,size).bottom;
  const bottom=getJigsawPieceEdges((row+1)*size+col,size).top;
  assert.equal(top,-bottom);
 }
});

test('Jigsaw completion requires correct placement and upright rotation',()=>{
 const solved=Array.from({length:9},(_,i)=>i);
 assert.equal(isJigsawSolved(solved,{}),true);
 assert.equal(isJigsawSolved(solved,{4:90}),false);
 assert.equal(isJigsawSolved([1,0,2,3,4,5,6,7,8],{}),false);
 assert.equal(normalizeJigsawRotation(-90),270);
 assert.equal(normalizeJigsawRotation(450),90);
});

test('Mảnh Ghép Nhà Thơm renders real shaped pieces with select, rotate and mobile drag placement',async()=>{
 const app=await readFile(new URL('../src/NewGames.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.match(app,/JigsawPieceGraphic/);
 assert.match(app,/const rotateSelected=direction=>/);
 assert.match(app,/Xoay trái/);
 assert.match(app,/Xoay phải/);
 assert.match(app,/Chọn mảnh rồi xoay trái hoặc phải/);
 assert.match(app,/jigsaw-real-board/);
 assert.match(app,/jigsaw-real-tray/);
 assert.match(css,/\.jigsaw-piece-svg/);
 assert.match(css,/\.jigsaw-piece-tools/);
});
