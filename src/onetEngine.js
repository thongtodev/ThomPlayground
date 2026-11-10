/** Onet/Pikachu engine: 6 columns, 8 rows, paths of at most two bends. */
export const ONET_COLS=6, ONET_ROWS=8, ONET_SIZE=48;
export const ONET_LEVELS=[
 {time:360,hints:5,types:6,gravity:'none',shuffles:2},
 {time:330,hints:4,types:6,gravity:'none',shuffles:2},
 {time:300,hints:4,types:8,gravity:'none',shuffles:2},
 {time:285,hints:3,types:8,gravity:'left',shuffles:2},
 {time:270,hints:3,types:12,gravity:'right',shuffles:2},
 {time:255,hints:2,types:12,gravity:'down',shuffles:2},
 {time:240,hints:2,types:12,gravity:'up',shuffles:2},
 {time:225,hints:2,types:24,gravity:['left','right'],shuffles:1},
 {time:210,hints:1,types:24,gravity:['up','down'],shuffles:1},
 {time:195,hints:1,types:24,gravity:['left','right','up','down'],shuffles:1},
 ...['rows','columns','out','in','halves','zones','rotate6','rotate4','axes','final'].map(gravity=>({
   time:195,hints:1,types:24,shuffles:1,gravity
 })),
];
export const levelConfig=n=>ONET_LEVELS[Math.max(0,Math.min(ONET_LEVELS.length-1,n-1))];
export function gravityAt(level,matched){
 const g=levelConfig(level).gravity;
 if(Array.isArray(g))return g[matched%g.length];
 switch(g){
  case 'halves':return Math.floor(matched/4)%2?'in':'out';
  case 'zones':return 'zones0';
  case 'rotate6':return 'zones'+Math.floor(matched/6)%4;
  case 'rotate4':return 'zones'+Math.floor(matched/4)%4;
  case 'axes':return Math.floor(matched/4)%2?'columns':'rows';
  case 'final':return matched<8?'rows':matched<16?'in':'zones'+Math.floor((matched-16)/2)%4;
  default:return g;
 }
}
export function gravityPreview(level,matched){
 const mode=gravityAt(level,matched);
 let next=matched+1;
 while(next<24&&gravityAt(level,next)===mode)next++;
 return next<24?next-matched:0;
}
export const zoneDirections=mode=>{
 const compass=['up','right','down','left'];
 return [0,1,3,2].map(start=>compass[(start+Number(mode.slice(-1)))%4]);
};
const randomSort=(a,rng=Math.random)=>{const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
/** Return path as board coordinates (including the outside border), or null. */
export function findPath(board,a,b){
 if(a===b||a<0||b<0||a>=ONET_SIZE||b>=ONET_SIZE||board[a]==null||board[a]!==board[b])return null;
 const h=ONET_ROWS+2,w=ONET_COLS+2;
 const at=(r,c)=>r*w+c;
 const grid=Array(h*w).fill(null);
 for(let i=0;i<ONET_SIZE;i++)grid[at(Math.floor(i/ONET_COLS)+1,i%ONET_COLS+1)]=board[i];
 const sr=Math.floor(a/ONET_COLS)+1,sc=a%ONET_COLS+1,er=Math.floor(b/ONET_COLS)+1,ec=b%ONET_COLS+1;
 const dirs=[[0,1],[1,0],[0,-1],[-1,0]];
 const queue=[];const best=new Map();
 for(let d=0;d<4;d++){const state={r:sr,c:sc,d,t:0,path:[[sr,sc]]};queue.push(state);best.set(`${sr},${sc},${d}`,0);}
 for(let head=0;head<queue.length;head++){
  const cur=queue[head];
  for(let nd=0;nd<4;nd++){
   const nt=cur.t+(nd!==cur.d?1:0);if(nt>2)continue;
   const nr=cur.r+dirs[nd][0],nc=cur.c+dirs[nd][1];if(nr<0||nr>=h||nc<0||nc>=w)continue;
   if(!(nr===er&&nc===ec)&&grid[at(nr,nc)]!=null)continue;
   const nextPath=[...cur.path,[nr,nc]];
   if(nr===er&&nc===ec){
    const turns=[nextPath[0]];
    for(let k=1;k<nextPath.length-1;k++){
     const prev=nextPath[k-1],here=nextPath[k],next=nextPath[k+1];
     if((here[0]-prev[0])!==(next[0]-here[0])||(here[1]-prev[1])!==(next[1]-here[1]))turns.push(here);
    }
    turns.push(nextPath[nextPath.length-1]);return turns.map(([r,c])=>({r:r-1,c:c-1}));
   }
   const key=`${nr},${nc},${nd}`;
   if(best.has(key)&&best.get(key)<=nt)continue;
   best.set(key,nt);queue.push({r:nr,c:nc,d:nd,t:nt,path:nextPath});
  }
 }
 return null;
}
export function availablePairs(board,limit=Infinity){
 const byType=new Map();board.forEach((v,i)=>{if(v!=null){if(!byType.has(v))byType.set(v,[]);byType.get(v).push(i);}});
 const out=[];for(const indices of byType.values())for(let x=0;x<indices.length;x++)for(let y=x+1;y<indices.length;y++){
  const a=indices[x],b=indices[y],path=findPath(board,a,b);if(path){out.push({a,b,path});if(out.length>=limit)return out;}
 }return out;
}
export function applyGravity(board,direction){
 if(['rows','columns','out','in'].includes(direction)||direction?.startsWith('zones')){
  const out=[...board];
  const compact=(indices,end)=>{
   const tiles=indices.map(i=>board[i]).filter(v=>v!=null);
   const gaps=Array(indices.length-tiles.length).fill(null);
   const line=end?[...gaps,...tiles]:[...tiles,...gaps];
   indices.forEach((idx,k)=>{out[idx]=line[k];});
  };
  const row=(r,c,width)=>Array.from({length:width},(_,i)=>r*6+c+i);
  const col=(r,c,height)=>Array.from({length:height},(_,i)=>(r+i)*6+c);
  if(direction==='rows')for(let r=0;r<8;r++)compact(row(r,0,6),r%2===1);
  else if(direction==='columns')for(let c=0;c<6;c++)compact(col(0,c,8),c%2===1);
  else if(direction==='out'||direction==='in'){
   for(let r=0;r<8;r++){compact(row(r,0,3),direction==='in');compact(row(r,3,3),direction==='out');}
  }else{
   zoneDirections(direction).forEach((d,z)=>{
    const top=z<2?0:4,left=(z%2)*3;
    if(d==='left'||d==='right')for(let r=top;r<top+4;r++)compact(row(r,left,3),d==='right');
    else for(let c=left;c<left+3;c++)compact(col(top,c,4),d==='down');
   });
  }
  return out;
 }
 if(!direction||direction==='none')return [...board];
 const next=[...board];
 if(direction==='left'||direction==='right'){
  for(let r=0;r<ONET_ROWS;r++){
   const start=r*ONET_COLS,values=next.slice(start,start+ONET_COLS).filter(v=>v!=null),pad=Array(ONET_COLS-values.length).fill(null);
   next.splice(start,ONET_COLS,...(direction==='left'?[...values,...pad]:[...pad,...values]));
  }
 }else{
  for(let c=0;c<ONET_COLS;c++){
   const values=Array.from({length:ONET_ROWS},(_,r)=>next[r*ONET_COLS+c]).filter(v=>v!=null);
   const pad=Array(ONET_ROWS-values.length).fill(null),column=direction==='up'?[...values,...pad]:[...pad,...values];
   for(let r=0;r<ONET_ROWS;r++)next[r*ONET_COLS+c]=column[r];
  }
 }return next;
}
export function removePair(board,a,b,level,matched){const next=[...board];next[a]=null;next[b]=null;return applyGravity(next,gravityAt(level,matched));}
/** A bounded full-board search. null means inconclusive, not necessarily impossible. */
export function hasFullSolution(board,level,matched=0,budget=2500){
 const seen=new Set();let visited=0;
 const dfs=(state,count)=>{
  if(state.every(x=>x==null))return true;
  const key=state.map(v=>v==null?'.':String.fromCharCode(65+v)).join('')+','+count;
  if(seen.has(key))return false;
  if(++visited>budget)return null;
  const moves=availablePairs(state);
  for(const m of moves){const answer=dfs(removePair(state,m.a,m.b,level,count),count+1);if(answer===true)return true;if(answer===null)return null;}
  seen.add(key);return false;
 };
 return dfs(board,matched);
}
/** Pairs placed side by side, guaranteeing a valid initial move. */
function pairedLayout(types,remaining=ONET_SIZE){
 const pairs=[];for(let i=0;i<remaining/2;i++)pairs.push(types[i%types.length]);
 const shuffled=randomSort(pairs);return [...shuffled.flatMap(v=>[v,v]),...Array(ONET_SIZE-remaining).fill(null)];
}
export function createBoard(level,typeCount=levelConfig(level).types){
 const safeTypeCount=Math.max(1,Math.min(24,Math.floor(typeCount)||levelConfig(level).types));
 const types=Array.from({length:safeTypeCount},(_,i)=>i);
 const pool=Array.from({length:24},(_,i)=>types[i%types.length]);
 if(level>10)return constructSolvableBoard(randomSort(pool),level);
 // For each level, exactly 24 pairs and 48 cells. Try varied layouts,
 // retaining only ones that can be solved under that level's gravity rule.
 const base=pool.flatMap(v=>[v,v]);
 for(let tries=0;tries<14;tries++){
  const board=tries<9?randomSort(base):pairedLayout(pool);
  if(hasFullSolution(board,level,0,tries<9?2500:1500)===true)return board;
 }
 return pairedLayout(pool);
}
/** Shuffle while preserving all remaining tiles and even counts. */
export function shuffleBoard(board,level,matched=0){
 const remaining=board.filter(v=>v!=null);
 if(remaining.length<2)return [...board];
 if(level>10){
  const sorted=remaining.sort((a,b)=>a-b);
  return constructSolvableBoard(randomSort(sorted.filter((_,i)=>i%2===0)),level,matched);
 }
 for(let tries=0;tries<14;tries++){
  const out=Array(ONET_SIZE).fill(null),positions=randomSort(Array.from({length:ONET_SIZE},(_,i)=>i));
  const shuffled=randomSort(remaining);positions.slice(0,remaining.length).forEach((p,i)=>out[p]=shuffled[i]);
  if(hasFullSolution(out,level,matched,1800)===true)return out;
 }
 // A guaranteed playable fallback, with the same image counts.
 const pairs=[];const count=new Map();for(const v of remaining)count.set(v,(count.get(v)||0)+1);
 for(const [v,n] of count)for(let i=0;i<n/2;i++)pairs.push(v);
 return pairedLayout(randomSort(pairs),remaining.length);
}

// Plan legal removals using original cell IDs; assign a matching photo to each planned pair.
export function constructSolvableBoard(pairTypes,level,matched=0){
 const occupied=randomSort(Array.from({length:ONET_SIZE},(_,i)=>i)).slice(0,pairTypes.length*2);
 let ids=Array(ONET_SIZE).fill(null);
 occupied.forEach(i=>{ids[i]=i;});
 const board=Array(ONET_SIZE).fill(null);
 for(const type of pairTypes){
  const mask=ids.map(id=>id==null?null:0);
  const positions=randomSort(ids.map((id,i)=>id==null?-1:i).filter(i=>i>=0));
  let pair;
  for(let a=0;a<positions.length&&!pair;a++){
   for(let b=a+1;b<positions.length;b++){
    if(findPath(mask,positions[a],positions[b])){pair=[positions[a],positions[b]];break;}
   }
  }
  const [a,b]=pair;
  board[ids[a]]=type;board[ids[b]]=type;
  ids=removePair(ids,a,b,level,matched++);
 }
 return board;
}
