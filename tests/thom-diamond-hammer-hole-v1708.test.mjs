import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Execute the real, unmodified engine logic: only replace its JSON import
// because native Node does not support Vite's JSON import syntax without attributes.
const source=readFileSync(new URL('../src/thomDiamondEngine.js',import.meta.url),'utf8');
const levelData=JSON.parse(readFileSync(new URL('../src/data/thomDiamondLevels.json',import.meta.url),'utf8'));
const body=source.replace(/^import levelData from '.\/data\/thomDiamondLevels\.json';\s*/,'').replace(/^export /gm,'');
const {createLevelState,applyBooster}=new Function('levelData',body+'\nreturn {createLevelState,applyBooster};')(levelData);
const level=levelData.levels[25];

function makeState(index, speakerLayers=0){
 const state=createLevelState(level);
 state.boosters={hammer:3,swap:0,shuffle:0,extra:0};
 state.objectives=[{type:'BREAK_SPEAKER',target:5,current:0}];
 state.movesLeft=12;
 if(speakerLayers){state.board[index]={piece:null,speaker:speakerLayers,dust:0};}
 return state;
}
function assertNoUnblockedGaps(board){
 board.forEach((cell,index)=>assert.ok(cell.speaker>0||cell.piece,`blank unlocked square at ${index}`));
}

test('hammer destroys final speaker layer and immediately refills the square, even without a subsequent match',()=>{
 for(const index of [0,3,24,35,48]){
  const before=makeState(index,1);
  const after=applyBooster(before,'hammer',index,level);
  assert.equal(after.board[index].speaker,0,`speaker at ${index} must be removed`);
  assert.ok(after.board[index].piece,`destroyed speaker at ${index} must become a tile`);
  assertNoUnblockedGaps(after.board);
  assert.ok(after.objectives[0].current>=1,'the hammer contributes at least one speaker layer to the objective');
  assert.equal(after.movesLeft,12,'hammer does not cost a move');
  assert.equal(after.boosters.hammer,2);
  assert.equal(after.boosterTransition.impactBoard[index].piece,null);
  assert.ok(after.boosterTransition.dropBoard[index].piece);
 }
});

test('hammer removes one speaker layer without creating a tile while a speaker remains',()=>{
 const before=makeState(24,2);
 const after=applyBooster(before,'hammer',24,level);
 assert.equal(after.board[24].speaker,1);
 assert.equal(after.board[24].piece,null);
 assert.equal(after.objectives[0].current,1);
 assert.equal(after.boosters.hammer,2);
 assert.equal(after.boosterTransition,undefined);
 assertNoUnblockedGaps(after.board);
});

test('hammer removing a normal Thơm tile also settles gravity and refills the board',()=>{
 const before=makeState(24);
 before.board[24].speaker=0;
 before.board[24].piece={id:199999,tile:level.tileSet[0],special:null,direction:null,ice:0,lock:0,prop:false};
 const after=applyBooster(before,'hammer',24,level);
 assert.ok(after.board[24].piece);
 assertNoUnblockedGaps(after.board);
 assert.equal(after.boosters.hammer,2);
 assert.equal(after.movesLeft,12);
 assert.equal(after.boosterTransition.impactBoard[24].piece,null);
});

test('after destroying the lower speaker, pieces fall only within their valid gravity segments',()=>{
 const before=makeState(31,1);
 before.board[10]={piece:null,speaker:2,dust:0};
 const after=applyBooster(before,'hammer',31,level);
 // A later cascade can legitimately damage the upper speaker. Check gravity at the drop frame.
 const dropped=after.boosterTransition.dropBoard;
 assert.equal(dropped[10].speaker,2);
 assert.equal(dropped[10].piece,null);
 assert.ok(dropped[31].piece);
 assertNoUnblockedGaps(dropped);
 assertNoUnblockedGaps(after.board);
});

test('hammer impact and gravity animation are rendered in order, without shifting the board',()=>{
 const game=readFileSync(new URL('../src/games/ThomDiamondGame.jsx',import.meta.url),'utf8');
 assert.match(game,/const transition=updated\.boosterTransition/);
 assert.match(game,/stage:'impact',[^\n]*transition\?\.impactBoard/);
 assert.match(game,/type:'drop',board:transition\.dropBoard,previous:transition\.impactBoard/);
 assert.match(game,/await sleep\(reduced\(\)\?0:220\)/);
 assert.match(game,/setView\(null\);setState\(updated\)/);
});
