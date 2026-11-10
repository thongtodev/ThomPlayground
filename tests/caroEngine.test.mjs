import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBoard,applyCaroMove,checkResult,chooseAiMove,opposite,LEVELS} from '../src/caroEngine.js';

test('3x3: correct turns, X wins and finished board cannot accept more moves',()=>{
  let board=emptyBoard(3),turn='X',outcome=null;
  for(const pos of [0,3,1,4,2]){
    const step=applyCaroMove(board,3,turn,pos);
    assert.ok(step);board=step.board;turn=step.nextTurn;outcome=step.outcome;
  }
  assert.equal(outcome.winner,'X');
  assert.deepEqual(outcome.line,[0,1,2]);
  assert.equal(applyCaroMove(board,3,'O',5),null);
  assert.equal(applyCaroMove(board,3,'X',0),null);
});

test('3x3: detects a draw',()=>{
  const board=['X','O','X','X','O','O','O','X','X'];
  assert.equal(checkResult(board,3)?.winner,'draw');
});

test('10x10: five in a row wins, including when blocked at both ends',()=>{
  const b=emptyBoard(10);
  for(let c=2;c<=6;c++)b[4*10+c]='X';
  b[4*10+1]='O';b[4*10+7]='O';
  assert.equal(checkResult(b,10,46)?.winner,'X');
});

test('rejects invalid moves, dimensions and occupied cells',()=>{
  const b=emptyBoard(3);
  assert.equal(applyCaroMove(b,3,'X',-1),null);
  assert.equal(applyCaroMove(b,3,'X',9),null);
  assert.equal(applyCaroMove(b,3,'Z',0),null);
  assert.equal(applyCaroMove(b,10,'X',0),null);
  assert.equal(applyCaroMove(['X',...b.slice(1)],3,'O',0),null);
  assert.equal(b[0],null);
});

test('all four AI difficulties return legal moves on both boards',()=>{
  for(const size of [3,10])for(const [level] of LEVELS){
    let board=emptyBoard(size);
    for(let n=0;n<Math.min(size*size,12);n++){
      const free=board.findIndex(v=>v===null);
      if(free<0)break;
      const human=applyCaroMove(board,size,'X',free);
      if(!human)break;
      board=human.board;
      if(human.outcome)break;
      const index=chooseAiMove(board,size,level,'O','X');
      assert.ok(Number.isInteger(index)&&board[index]===null,`invalid ${size} ${level} ${index}`);
      const ai=applyCaroMove(board,size,'O',index);
      assert.ok(ai);board=ai.board;
      if(ai.outcome)break;
    }
  }
});

test('3x3 impossible AI never loses against any human move (either starting mark)',()=>{
  const canForceHumanWin=(board,turn,human)=>{
    const result=checkResult(board,3);
    if(result)return result.winner===human;
    if(turn===human){
      for(let i=0;i<9;i++)if(board[i]===null){
        const step=applyCaroMove(board,3,turn,i);
        if(canForceHumanWin(step.board,opposite(turn),human))return true;
      }
      return false;
    }
    const index=chooseAiMove(board,3,'impossible',turn,human);
    const step=applyCaroMove(board,3,turn,index);
    assert.ok(step);
    return canForceHumanWin(step.board,opposite(turn),human);
  };
  for(const human of ['X','O'])for(let n=0;n<12;n++){
    assert.equal(canForceHumanWin(emptyBoard(3),'X',human),false,`AI loses as ${opposite(human)}`);
  }
});

test('AI can open as X when player selects O',()=>{
  for(const size of [3,10])for(const [level] of LEVELS){
    const board=emptyBoard(size);
    const index=chooseAiMove(board,size,level,'X','O');
    assert.ok(Number.isInteger(index)&&index>=0&&index<board.length,`${size} ${level}`);
    const step=applyCaroMove(board,size,'X',index);
    assert.ok(step);
    assert.equal(step.nextTurn,'O');
  }
});
