export const CONNECT_ROWS = 6;
export const CONNECT_COLS = 7;
export const emptyConnectBoard = () => Array.from({length: CONNECT_ROWS}, () => Array(CONNECT_COLS).fill(null));
export const legalConnectColumns = board => Array.from({length: CONNECT_COLS}, (_, col) => col).filter(col => board[0][col] == null);

export function dropConnectDisc(board, col, player) {
  if (!Number.isInteger(col) || col < 0 || col >= CONNECT_COLS || !['R', 'Y'].includes(player) || board[0][col] != null) return null;
  const next = board.map(row => [...row]);
  for (let row = CONNECT_ROWS - 1; row >= 0; row--) {
    if (next[row][col] == null) {
      next[row][col] = player;
      return next;
    }
  }
  return null;
}

export function connectFourWinner(board) {
  for (let r = 0; r < CONNECT_ROWS; r++) for (let c = 0; c < CONNECT_COLS; c++) {
    const p = board[r][c]; if (!p) continue;
    for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
      const cells = Array.from({length:4}, (_,i) => [r + dr*i, c + dc*i]);
      if (cells.every(([rr,cc]) => rr >= 0 && rr < CONNECT_ROWS && cc >= 0 && cc < CONNECT_COLS && board[rr][cc] === p)) return {winner:p, cells};
    }
  }
  return null;
}
export const connectBoardFull = board => board.every(row => row.every(Boolean));

function winningDrop(board, col, player) {
  const next = dropConnectDisc(board, col, player);
  return next && connectFourWinner(next)?.winner === player;
}
function evaluateWindow(window, ai) {
  const opponent = ai === 'R' ? 'Y' : 'R';
  const own = window.filter(x => x === ai).length;
  const other = window.filter(x => x === opponent).length;
  const empty = window.filter(x => x == null).length;
  if (own === 4) return 100000;
  if (other === 4) return -100000;
  if (own === 3 && empty === 1) return 120;
  if (own === 2 && empty === 2) return 16;
  if (other === 3 && empty === 1) return -145;
  if (other === 2 && empty === 2) return -18;
  return 0;
}
export function evaluateConnectBoard(board, ai) {
  let score = 0;
  for (let r = 0; r < CONNECT_ROWS; r++) if (board[r][3] === ai) score += 7;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < CONNECT_ROWS; r++) for (let c = 0; c < CONNECT_COLS; c++) for (const [dr,dc] of dirs) {
    const window = Array.from({length:4},(_,i)=>[r+dr*i,c+dc*i]);
    if (window.every(([rr,cc])=>rr>=0&&rr<CONNECT_ROWS&&cc>=0&&cc<CONNECT_COLS)) score += evaluateWindow(window.map(([rr,cc])=>board[rr][cc]), ai);
  }
  return score;
}
function orderedColumns(board) { return legalConnectColumns(board).sort((a,b)=>Math.abs(a-3)-Math.abs(b-3)); }
function minimax(board, depth, alpha, beta, maximizing, ai, opponent) {
  const win = connectFourWinner(board);
  if (win) return win.winner === ai ? 100000 + depth : -100000 - depth;
  if (depth === 0 || connectBoardFull(board)) return evaluateConnectBoard(board, ai);
  const cols = orderedColumns(board);
  if (maximizing) {
    let value = -Infinity;
    for (const col of cols) { const next = dropConnectDisc(board,col,ai); value = Math.max(value,minimax(next,depth-1,alpha,beta,false,ai,opponent)); alpha=Math.max(alpha,value); if(alpha>=beta)break; }
    return value;
  }
  let value = Infinity;
  for (const col of cols) { const next = dropConnectDisc(board,col,opponent); value = Math.min(value,minimax(next,depth-1,alpha,beta,true,ai,opponent)); beta=Math.min(beta,value); if(alpha>=beta)break; }
  return value;
}
export function chooseConnectFourMove(board, ai, difficulty='medium', random=Math.random) {
  const legal = legalConnectColumns(board); if (!legal.length) return -1;
  const opponent = ai === 'R' ? 'Y' : 'R';
  if (difficulty === 'easy') return legal[Math.floor(random()*legal.length)];
  for (const col of legal) if (winningDrop(board,col,ai)) return col;
  for (const col of legal) if (winningDrop(board,col,opponent)) return col;
  if (difficulty === 'medium') return [...legal].sort((a,b)=>Math.abs(a-3)-Math.abs(b-3))[0];
  let best = -Infinity, choices = [];
  for (const col of orderedColumns(board)) {
    const score = minimax(dropConnectDisc(board,col,ai),4,-Infinity,Infinity,false,ai,opponent);
    if (score > best) { best=score; choices=[col]; } else if (score===best) choices.push(col);
  }
  return choices[Math.floor(random()*choices.length)];
}
