// Pure game rules and bounded AI search for 3×3 Tic Tac Toe and 10×10 Caro.
export const LEVELS = [
  ['easy', 'Dễ'], ['medium', 'Trung bình'], ['hard', 'Khó'], ['impossible', 'Không thể đánh bại'],
];
export const opposite = mark => mark === 'X' ? 'O' : 'X';
export const emptyBoard = size => Array(size * size).fill(null);
const DIRS = [[0,1],[1,0],[1,1],[1,-1]];
const at = (row,col,size) => row >= 0 && col >= 0 && row < size && col < size;

// A run of five OR MORE wins on 10×10, even when blocked at both ends.
export function checkResult(board,size,lastMove=null) {
  const need = size === 3 ? 3 : 5;
  const moves = lastMove === null ? board.map((v,i)=>v?i:null).filter(i=>i!==null) : [lastMove];
  for(const pos of moves) {
    const mark = board[pos];
    if(!mark)continue;
    const row = Math.floor(pos/size), col = pos%size;
    for(const [dr,dc] of DIRS) {
      const line = [pos];
      for(const sign of [-1,1]) {
        let r=row+sign*dr,c=col+sign*dc;
        while(at(r,c,size)&&board[r*size+c]===mark){line.push(r*size+c);r+=sign*dr;c+=sign*dc;}
      }
      if(line.length>=need)return {winner:mark,line:line.sort((a,b)=>a-b)};
    }
  }
  return board.every(Boolean) ? {winner:'draw',line:[]} : null;
}

// Apply one move atomically. Shared by human and AI to avoid inconsistent turns.
export function applyCaroMove(board,size,mark,index){
  if(![3,10].includes(size)||!Array.isArray(board)||board.length!==size*size||
     !['X','O'].includes(mark)||!Number.isInteger(index)||index<0||index>=board.length||
     board[index]!==null||checkResult(board,size)!==null)return null;
  const next=board.slice();next[index]=mark;
  const outcome=checkResult(next,size,index);
  return {board:next,outcome,nextTurn:outcome?mark:opposite(mark)};
}

const emptyCells = b => b.map((v,i)=>v===null?i:null).filter(v=>v!==null);
const randomChoice = items => items[Math.floor(Math.random()*items.length)];

function bestThreeMove(board,level,ai,human) {
  const free = emptyCells(board);
  if(!free.length)return null;
  if(level==='easy')return randomChoice(free);
  const immediate = mark => free.find(i=>{const b=board.slice();b[i]=mark;return checkResult(b,3,i)?.winner===mark;});
  const win=immediate(ai);
  if(win!==undefined)return win;
  const block=immediate(human);
  if(level==='medium') {
    if(block!==undefined)return block;
    return Math.random()<0.6&&board[4]===null?4:randomChoice(free);
  }
  // Impossible uses exhaustive minimax; Hard limits search and can occasionally err.
  const maxDepth=level==='impossible'?9:4;
  function solve(b,turn,depth,alpha,beta) {
    const result=checkResult(b,3);
    if(result)return result.winner==='draw'?0:result.winner===ai?10+depth:-10-depth;
    if(depth===0)return (b[4]===ai?0.35:b[4]===human?-0.35:0);
    const maximizing=turn===ai;
    let best=maximizing?-Infinity:Infinity;
    for(const i of emptyCells(b)) {
      b[i]=turn;
      const score=solve(b,opposite(turn),depth-1,alpha,beta);
      b[i]=null;
      best=maximizing?Math.max(best,score):Math.min(best,score);
      if(maximizing)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);
      if(beta<=alpha)break;
    }
    return best;
  }
  const scored=free.map(i=>{const b=board.slice();b[i]=ai;return {i,score:solve(b,human,maxDepth-1,-Infinity,Infinity)};});
  scored.sort((a,b)=>b.score-a.score);
  if(level==='hard'&&scored.length>1&&Math.random()<0.1)return randomChoice(scored.slice(0,Math.min(3,scored.length))).i;
  return randomChoice(scored.filter(x=>x.score===scored[0].score)).i;
}

function nearMoves(board,size,radius=1) {
  const occupied=[];
  for(let i=0;i<board.length;i++)if(board[i])occupied.push(i);
  if(!occupied.length)return [Math.floor(size/2)*size+Math.floor(size/2)];
  const choices=new Set();
  for(const i of occupied) {
    const r=Math.floor(i/size),c=i%size;
    for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){
      if(!dr&&!dc)continue;
      if(at(r+dr,c+dc,size)) {
        const p=(r+dr)*size+c+dc;
        if(board[p]===null)choices.add(p);
      }
    }
  }
  return [...choices];
}

// Score open-ended and blocked runs in all four directions, including double threats.
function moveScore(board,pos,mark,size) {
  const r=Math.floor(pos/size),c=pos%size;
  let total=0;
  for(const [dr,dc] of DIRS) {
    let count=1,open=0;
    for(const sign of [-1,1]) {
      let rr=r+dr*sign,cc=c+dc*sign;
      while(at(rr,cc,size)&&board[rr*size+cc]===mark){count++;rr+=dr*sign;cc+=dc*sign;}
      if(at(rr,cc,size)&&board[rr*size+cc]===null)open++;
    }
    if(count>=5)return 1e8;
    if(count===4)total+=open===2?150000:open===1?40000:1500;
    if(count===3)total+=open===2?9000:open===1?1500:100;
    if(count===2)total+=open===2?450:open===1?100:5;
    if(count===1&&open===2)total+=12;
  }
  return total;
}
function orderedCandidates(board,size,mark,limit=9) {
  const opponent=opposite(mark);
  return nearMoves(board,size).map(i=>{
    board[i]=mark;const attack=moveScore(board,i,mark,size);board[i]=opponent;
    const defense=moveScore(board,i,opponent,size);board[i]=null;
    return {i,attack,defense,score:attack+defense*0.95};
  }).sort((a,b)=>b.score-a.score).slice(0,limit);
}
function immediateWins(board,size,mark) {
  const moves=[];
  for(const i of nearMoves(board,size,1)) {
    board[i]=mark;
    if(checkResult(board,size,i)?.winner===mark)moves.push(i);
    board[i]=null;
  }
  return moves;
}
function positionValue(board,size,mark) {
  const candidates=orderedCandidates(board,size,mark,5);
  if(!candidates.length)return 0;
  const top=candidates[0];
  return top.attack+top.defense*0.9+(candidates[1]?.score||0)*0.18;
}
function bestTenMove(board,level,ai,human) {
  const near=nearMoves(board,10,level==='easy'?1:2);
  if(!near.length)return null;
  if(level==='easy')return randomChoice(near);
  const win=immediateWins(board,10,ai);
  if(win.length)return win[0];
  const threat=immediateWins(board,10,human);
  if(threat.length)return threat[0];
  const ordered=orderedCandidates(board,10,ai,level==='medium'?9:level==='hard'?7:9);
  if(level==='medium') {
    // Medium favors building open threes/fours and blocking visible threats.
    return Math.random()<0.2?randomChoice(ordered.slice(0,Math.min(4,ordered.length))).i:ordered[0].i;
  }
  const depth=level==='impossible'?3:2;
  const cap=level==='impossible'?9:7;
  let nodes=0;
  const budget=level==='impossible'?4800:1800;
  const evaluate=()=>positionValue(board,10,ai)-positionValue(board,10,human)*1.1;
  function search(turn,remaining,alpha,beta,lastMove) {
    nodes++;
    if(lastMove!==null){const w=checkResult(board,10,lastMove);if(w?.winner===ai)return 1e9+remaining;if(w?.winner===human)return -1e9-remaining;if(w?.winner==='draw')return 0;}
    if(!remaining||nodes>=budget)return evaluate();
    const maximizing=turn===ai;
    let best=maximizing?-Infinity:Infinity;
    const moves=orderedCandidates(board,10,turn,cap);
    for(const {i} of moves) {
      board[i]=turn;
      const score=search(opposite(turn),remaining-1,alpha,beta,i);
      board[i]=null;
      best=maximizing?Math.max(best,score):Math.min(best,score);
      if(maximizing)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);
      if(alpha>=beta||nodes>=budget)break;
    }
    return best===Infinity||best===-Infinity?evaluate():best;
  }
  let best=-Infinity,bestMove=ordered[0].i;
  for(const {i,score} of ordered) {
    board[i]=ai;
    const value=search(human,depth-1,-Infinity,Infinity,i)+score*0.00001;
    board[i]=null;
    if(value>best){best=value;bestMove=i;}
  }
  return bestMove;
}
export function chooseAiMove(board,size,level,aiMark,humanMark) {
  if(![3,10].includes(size)||!['X','O'].includes(aiMark)||!['X','O'].includes(humanMark))return null;
  if(!emptyCells(board).length)return null;
  return size===3?bestThreeMove(board,level,aiMark,humanMark):bestTenMove(board.slice(),level,aiMark,humanMark);
}
export function statsKey(size,mode,level) {return `${size}x${size}:${mode}:${mode==='ai'?level:'local'}`;}
export function getCaroStats(){try{return JSON.parse(localStorage.getItem('thom-caro-stats-v2'))||{};}catch{return {};}}
export function updateCaroStats(size,mode,level,winner,humanMark) {
  const key=statsKey(size,mode,level),all=getCaroStats();
  const prev=all[key]||{games:0,X:0,O:0,draw:0,wins:0,losses:0};
  const next={...prev,games:prev.games+1,[winner]:(prev[winner]||0)+1};
  if(mode==='ai'&&winner!=='draw')next[winner===humanMark?'wins':'losses']++;
  all[key]=next;
  try{localStorage.setItem('thom-caro-stats-v2',JSON.stringify(all));}catch{}
  return all;
}
