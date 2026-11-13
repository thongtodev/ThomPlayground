import levelData from './data/thomDiamondLevels.json';

export const THOM_DIAMOND_LEVELS = levelData.levels;
export const THOM_DIAMOND_WORLDS = levelData.worlds;
export const THOM_DIAMOND_TILE_IDS = [...new Set(levelData.worlds.flatMap(w => w.tiles))];
export const SPECIAL_LABELS = { rocket: 'Thơm Tên Lửa', bomb: 'Thơm Bom', rainbow: 'Thơm Cầu Vồng', plane: 'Thơm Phi Cơ' };
const SIZE = 7;
const rand = n => Math.floor(Math.random() * n);
const clone = value => JSON.parse(JSON.stringify(value));
const key = (r, c) => r * SIZE + c;
const rc = i => [Math.floor(i / SIZE), i % SIZE];
const inBoard = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const neighbors = i => { const [r,c]=rc(i); return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([rr,cc])=>inBoard(rr,cc)).map(([rr,cc])=>key(rr,cc)); };
let diamondPieceSerial=0;
const pieceFor = (tile, extra={}) => ({ id:++diamondPieceSerial, tile, special: null, direction: null, ice: 0, lock: 0, prop: false, ...extra });
const makeCell = () => ({ piece: null, speaker: 0, dust: 0 });

function applyPlacements(board, level) {
  for (const [type, placements] of Object.entries(level.placements || {})) {
    for (const p of placements) {
      const cell = board[key(p.r,p.c)];
      if (!cell) continue;
      if (type === 'speaker') { cell.speaker = p.layers || 1; cell.piece = null; }
      else if (type === 'dust') cell.dust = p.layers || 1;
      else if (cell.piece && type === 'ice') cell.piece.ice = p.layers || 1;
      else if (cell.piece && type === 'lock') cell.piece.lock = p.layers || 1;
    }
  }
  let props = level.props || 0;
  const exits = level.exitColumns?.length ? level.exitColumns : [2,3,4];
  for (let i=0; i<props; i++) {
    const col = exits[i % exits.length];
    const cell = board[key(0,col)];
    if (cell && !cell.speaker) cell.piece = pieceFor(null,{prop:true});
    else {
      const fallback = board.findIndex((x,idx)=>idx<SIZE*2&&!x.speaker&&!x.piece);
      if (fallback>=0) board[fallback].piece = pieceFor(null,{prop:true});
    }
  }
}

export function findMatchGroups(board) {
  const runs=[];
  for(let r=0;r<SIZE;r++){
    let c=0;
    while(c<SIZE){
      const cell=board[key(r,c)], tile=cell?.piece?.tile;
      if(!tile || cell.piece.prop){c++;continue;}
      let end=c+1;
      while(end<SIZE){const next=board[key(r,end)]?.piece;if(!next||next.prop||next.tile!==tile)break;end++;}
      if(end-c>=3)runs.push({indices:Array.from({length:end-c},(_,n)=>key(r,c+n)),orientation:'h',tile});
      c=end;
    }
  }
  for(let c=0;c<SIZE;c++){
    let r=0;
    while(r<SIZE){
      const cell=board[key(r,c)], tile=cell?.piece?.tile;
      if(!tile || cell.piece.prop){r++;continue;}
      let end=r+1;
      while(end<SIZE){const next=board[key(end,c)]?.piece;if(!next||next.prop||next.tile!==tile)break;end++;}
      if(end-r>=3)runs.push({indices:Array.from({length:end-r},(_,n)=>key(r+n,c)),orientation:'v',tile});
      r=end;
    }
  }
  // Merge intersecting horizontal/vertical runs into one logical match group.
  const groups=[];
  for(const run of runs){
    const hits=groups.filter(g=>run.indices.some(i=>g.indices.includes(i)));
    if(!hits.length)groups.push({indices:[...run.indices],runs:[run],tile:run.tile});
    else {
      const first=hits[0];
      for(const i of run.indices)if(!first.indices.includes(i))first.indices.push(i);
      first.runs.push(run);
      for(const other of hits.slice(1)){for(const i of other.indices)if(!first.indices.includes(i))first.indices.push(i);first.runs.push(...other.runs);groups.splice(groups.indexOf(other),1);}
    }
  }
  // A 2x2 square is a plane match even though no straight line reaches three beyond it.
  for(let r=0;r<SIZE-1;r++)for(let c=0;c<SIZE-1;c++){
    const ids=[key(r,c),key(r,c+1),key(r+1,c),key(r+1,c+1)];
    const tile=board[ids[0]]?.piece?.tile;
    if(tile && ids.every(i=>board[i]?.piece?.tile===tile&&!board[i]?.piece?.prop)){
      const hit=groups.find(g=>ids.some(i=>g.indices.includes(i)));
      if(hit){for(const i of ids)if(!hit.indices.includes(i))hit.indices.push(i);hit.square=true;}
      else groups.push({indices:ids,runs:[],tile,square:true});
    }
  }
  return groups;
}

function specialForGroup(group, enabled=[]) {
  const n=group.indices.length;
  if(group.square && enabled.includes('plane')) return {type:'plane',direction:null};
  const horizontal=group.runs?.some(x=>x.orientation==='h');
  const vertical=group.runs?.some(x=>x.orientation==='v');
  if(n>=5 && (horizontal!==vertical) && enabled.includes('rainbow')) return {type:'rainbow',direction:null};
  if(n>=5 && horizontal && vertical && enabled.includes('bomb')) return {type:'bomb',direction:null};
  if(n===4 && enabled.includes('rocket')) return {type:'rocket',direction:horizontal?'h':'v'};
  return null;
}

function updateObjectives(objectives, predicate, amount=1) {
  let added=0;
  const next=objectives.map(o=>{
    if(o.current>=o.target || !predicate(o))return o;
    const inc=Math.min(amount,o.target-o.current);added+=inc;return {...o,current:o.current+inc};
  });
  return {objectives:next,added};
}
function objectiveForBlocker(type){return ({dust:'CLEAN',speaker:'BREAK_SPEAKER',ice:'BREAK_ICE',lock:'UNLOCK'})[type];}

export function createLevelState(level, retrySeed=Date.now()) {
  const tileIds=(level.tileSet||[]).slice(0,Math.max(4,level.activeTileCount||4));
  const makeRandom=()=>{
    const board=Array.from({length:SIZE*SIZE},()=>{const cell=makeCell();cell.piece=pieceFor(tileIds[rand(tileIds.length)]);return cell;});
    applyPlacements(board,level);
    return board;
  };
  let board=makeRandom(), tries=0;
  while((findMatchGroups(board).length||!hasPossibleMove(board))&&tries<250){board=makeRandom();tries++;}
  const objectives=(level.objectives||[]).map(o=>({...o,current:0}));
  return {levelId:level.id,board,objectives,movesLeft:level.moveLimit,score:0,phase:'playing',selected:null,seed:retrySeed,cascade:0,boosters:{hammer:1,swap:1,shuffle:1,extra:1}};
}

export function hasPossibleMove(board) {
  for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
    const i=key(r,c), a=board[i]?.piece;
    if(!a||a.prop||a.lock>0||a.ice>0)continue;
    for(const j of [c<SIZE-1?i+1:-1,r<SIZE-1?i+SIZE:-1]){
      if(j<0||!board[j]?.piece||board[j].piece.prop||board[j].piece.lock>0||board[j].piece.ice>0)continue;
      const copy=board.map(x=>({...x,piece:x.piece?{...x.piece}:null}));
      [copy[i].piece,copy[j].piece]=[copy[j].piece,copy[i].piece];
      if(findMatchGroups(copy).length||copy[i].piece?.special==='rainbow'||copy[j].piece?.special==='rainbow'||(copy[i].piece?.special&&copy[j].piece?.special))return true;
    }
  }
  return false;
}

function specialBlast(board, index, special, partner, level) {
  const [r,c]=rc(index), out=new Set();
  const add=(rr,cc)=>{if(inBoard(rr,cc))out.add(key(rr,cc));};
  const all=(predicate)=>board.forEach((cell,i)=>{if(cell.piece&&predicate(cell.piece,cell))out.add(i);});
  if(partner?.special){
    const a=special,b=partner.special;
    if(a==='rainbow'&&b==='rainbow'){all(p=>!p.prop);return out;}
    if(a==='rocket'&&b==='rocket'){for(let x=0;x<SIZE;x++){add(r,x);add(x,c);}return out;}
    if(a==='bomb'&&b==='bomb'){for(let rr=r-2;rr<=r+2;rr++)for(let cc=c-2;cc<=c+2;cc++)add(rr,cc);return out;}
    if((a==='rocket'&&b==='bomb')||(a==='bomb'&&b==='rocket')){for(let d=-1;d<=1;d++){for(let x=0;x<SIZE;x++){add(r+d,x);add(x,c+d);}}return out;}
    if(a==='rainbow'||b==='rainbow'){
      const other=partner;
      const target=other?.tile;
      if(target)all(p=>p.tile===target);
      else all(p=>!p.prop);
      return out;
    }
    if(a==='plane'&&b==='plane'){
      const targets=board.map((cell,i)=>({cell,i})).filter(x=>x.cell.speaker||x.cell.dust||x.cell.piece?.ice||x.cell.piece?.lock||x.cell.piece&&!x.cell.piece.prop).slice(0,2);
      targets.forEach(x=>out.add(x.i));return out;
    }
    // A plane combined with another special keeps that blast and adds one objective target.
    const other=a==='plane'?b:a;
    const blast=specialBlast(board,index,other,null,level);
    blast.forEach(x=>out.add(x));
    const target=board.findIndex(cell=>cell.speaker||cell.piece?.ice||cell.piece?.lock||cell.dust>0);
    if(target>=0)out.add(target);
    return out;
  }
  if(special==='rocket'){
    if(board[index]?.piece?.direction==='v'){for(let x=0;x<SIZE;x++)add(x,c);}else{for(let x=0;x<SIZE;x++)add(r,x);}
  }else if(special==='bomb'){
    for(let rr=r-1;rr<=r+1;rr++)for(let cc=c-1;cc<=c+1;cc++)add(rr,cc);
  }else if(special==='rainbow'){
    const target=partner?.tile||board.find((cell,i)=>i!==index&&cell.piece?.tile)?.piece?.tile;
    if(target)all(p=>p.tile===target);else all(p=>!p.prop);
  }else if(special==='plane'){
    let target=board.findIndex(cell=>cell.speaker||cell.piece?.ice||cell.piece?.lock||cell.dust>0);
    if(target<0)target=board.findIndex(cell=>cell.piece&&!cell.piece.prop&&cell.piece.special===null);
    if(target>=0)out.add(target);
  }
  out.add(index);
  return out;
}

function comboBlast(board, from, to, level) {
  const a=board[from]?.piece,b=board[to]?.piece,out=new Set([from,to]);
  if(a?.special==='rainbow'&&b?.special==='rainbow'){
    board.forEach((cell,i)=>{if(cell.piece&&!cell.piece.prop)out.add(i);});return out;
  }
  const rainbow=a?.special==='rainbow'?from:b?.special==='rainbow'?to:-1;
  const partner=rainbow===from?b:a;
  if(rainbow>=0&&['rocket','bomb'].includes(partner?.special)){
    const target=partner.tile;
    board.forEach((cell,i)=>{
      if(!cell.piece||cell.piece.prop||cell.piece.tile!==target)return;
      out.add(i);const [r,c]=rc(i);
      if(partner.special==='rocket'){
        if(i%2===0){for(let x=0;x<SIZE;x++)out.add(key(r,x));}
        else {for(let x=0;x<SIZE;x++)out.add(key(x,c));}
      }else for(let rr=r-1;rr<=r+1;rr++)for(let cc=c-1;cc<=c+1;cc++)if(inBoard(rr,cc))out.add(key(rr,cc));
    });
    return out;
  }
  const specialIndex=a?.special?from:to,partnerIndex=specialIndex===from?to:from;
  for(const i of specialBlast(board,specialIndex,board[specialIndex]?.piece?.special,board[partnerIndex]?.piece,level))out.add(i);
  return out;
}

function compactAndSpawn(board, level, objectives, score) {
  let next=board.map(cell=>({...cell,piece:cell.piece?{...cell.piece}:null}));
  let delivered=0;
  for(let c=0;c<SIZE;c++){
    let start=0;
    while(start<SIZE){
      if(next[key(start,c)].speaker){start++;continue;}
      let end=start;
      while(end<SIZE&&!next[key(end,c)].speaker)end++;
      const pieces=[];
      for(let r=start;r<end;r++)if(next[key(r,c)].piece)pieces.push(next[key(r,c)].piece);
      for(let r=start;r<end;r++)next[key(r,c)].piece=null;
      const first=end-pieces.length;
      pieces.forEach((piece,i)=>{next[key(first+i,c)].piece=piece;});
      start=end;
    }
  }
  const exits=new Set(level.exitColumns||[2,3,4]);
  for(let c=0;c<SIZE;c++){
    const cell=next[key(SIZE-1,c)];
    if(cell.piece?.prop&&exits.has(c)){cell.piece=null;delivered++;}
  }
  if(delivered){const u=updateObjectives(objectives,o=>o.type==='DELIVER',delivered);objectives=u.objectives;score+=500*delivered;}
  const tileIds=(level.tileSet||[]).slice(0,Math.max(4,level.activeTileCount||4));
  // Fill empty spaces above/inside each gravity segment; blockers remain anchored to cells.
  for(let c=0;c<SIZE;c++){
    let start=0;
    while(start<SIZE){
      if(next[key(start,c)].speaker){start++;continue;}
      let end=start;while(end<SIZE&&!next[key(end,c)].speaker)end++;
      for(let r=start;r<end;r++)if(!next[key(r,c)].piece)next[key(r,c)].piece=pieceFor(tileIds[rand(tileIds.length)]);
      start=end;
    }
  }
  return {board:next,objectives,score,delivered};
}

function resolveOneWave(board, objectives, level, swapped, score) {
  const groups=findMatchGroups(board);
  if(!groups.length)return {board,objectives,score,changed:false,created:0,activated:0};
  const clear=new Set(), preserve=new Map();
  let created=0, activated=0;
  for(const group of groups){
    const special=specialForGroup(group,level.specialsEnabled||[]);
    let keep=-1;
    if(special){keep=swapped?.find(i=>group.indices.includes(i))??group.indices[Math.floor(group.indices.length/2)];preserve.set(keep,special);created++;const u=updateObjectives(objectives,o=>o.type==='CREATE_SPECIAL'&&(o.special==='ANY_SPECIAL'||o.special===special.type.toUpperCase()),1);objectives=u.objectives;score+=({rocket:200,bomb:300,rainbow:400,plane:250})[special.type]||0;}
    for(const i of group.indices)if(i!==keep)clear.add(i);
  }
  // Trigger any existing special caught in a match.
  const queue=[...clear];
  const activatedSet=new Set();
  for(let q=0;q<queue.length;q++){
    const i=queue[q],piece=board[i]?.piece;
    if(!piece?.special||activatedSet.has(i))continue;
    activatedSet.add(i);activated++;
    const u=updateObjectives(objectives,o=>o.type==='ACTIVATE_SPECIAL'&&(o.special==='ANY_SPECIAL'||o.special===piece.special.toUpperCase()||o.special==='SPECIAL_COMBO'),1);objectives=u.objectives;
    score+=60;
    for(const target of specialBlast(board,i,piece.special,null,level))if(!clear.has(target)){clear.add(target);queue.push(target);}
  }
  // A tile carrying a newly created special stays on the board.
  for(const i of preserve.keys())clear.delete(i);
  const hitSpeakers=new Set();
  for(const i of [...clear]){
    const [r,c]=rc(i);
    for(const n of [i,...neighbors(i)])if(board[n]?.speaker>0)hitSpeakers.add(n);
  }
  for(const i of hitSpeakers){board[i].speaker=Math.max(0,board[i].speaker-1);const u=updateObjectives(objectives,o=>o.type==='BREAK_SPEAKER',1);objectives=u.objectives;score+=100;}
  const removed=[];
  for(const i of clear){
    const cell=board[i];
    if(!cell||cell.speaker||!cell.piece||cell.piece.prop)continue;
    const piece=cell.piece;
    if(piece.ice>0){piece.ice--;const u=updateObjectives(objectives,o=>o.type==='BREAK_ICE',1);objectives=u.objectives;score+=100;continue;}
    if(piece.lock>0){piece.lock--;const u=updateObjectives(objectives,o=>o.type==='UNLOCK',1);objectives=u.objectives;score+=100;continue;}
    if(cell.dust>0){cell.dust--;const u=updateObjectives(objectives,o=>o.type==='CLEAN',1);objectives=u.objectives;score+=100;}
    const u=updateObjectives(objectives,o=>o.type==='COLLECT'&&o.tileId===piece.tile,1);objectives=u.objectives;
    score+=60;removed.push(i);cell.piece=null;
  }
  for(const [i,s] of preserve){const p=board[i]?.piece;if(p){p.special=s.type;p.direction=s.direction;}}
  return {board,objectives,score,changed:clear.size>0||hitSpeakers.size>0,created,activated,removed:removed.length,removedIndices:removed,affectedIndices:[...new Set([...clear,...hitSpeakers])],hitIndices:[...hitSpeakers],createdIndices:[...preserve.keys()]};
}

export function resolveBoard(inputBoard, inputObjectives, level, swapped=null, startingScore=0, events=null) {
  let board=inputBoard.map(cell=>({...cell,piece:cell.piece?{...cell.piece}:null}));
  let objectives=clone(inputObjectives),score=startingScore,cascade=0,totalCreated=0,totalActivated=0;
  for(let wave=0;wave<24;wave++){
    const groups=findMatchGroups(board);
    if(!groups.length)break;
    const indices=[...new Set(groups.flatMap(g=>g.indices))];
    const specialIndices=indices.filter(i=>board[i]?.piece?.special);
    if(events){
      if(specialIndices.length){
       const targets=new Set(specialIndices);
       for(const i of specialIndices)for(const target of specialBlast(board,i,board[i].piece.special,null,level))targets.add(target);
       events.push({type:'special',board:clone(board),indices:[...targets],origin:specialIndices,special:board[specialIndices[0]]?.piece?.special,wave});
      }
      events.push({type:'match',board:clone(board),indices,wave});
    }
    const beforeDrop=clone(board);
    const result=resolveOneWave(board,objectives,level,swapped,score);
    board=result.board;objectives=result.objectives;score=result.score;
    totalCreated+=result.created;totalActivated+=result.activated;
    if(!result.changed)break;
    if(events)events.push({type:'clear',board:clone(board),previous:beforeDrop,indices:result.affectedIndices,objectives:clone(objectives),score,wave});
    cascade++;
    score+=Math.min(cascade,5)*50;
    const compacted=compactAndSpawn(board,level,objectives,score);
    board=compacted.board;objectives=compacted.objectives;score=compacted.score;
    if(events)events.push({type:'drop',board:clone(board),previous:clone(result.board),objectives:clone(objectives),score,wave});
    swapped=null;
  }
  if(!hasPossibleMove(board)){
    const beforeShuffle=events?clone(board):null;
    const mutable=board.map(x=>({...x,piece:x.piece?{...x.piece}:null}));
    const movable=mutable.map((cell,i)=>({cell,i})).filter(x=>x.cell.piece&&!x.cell.piece.prop&&!x.cell.piece.special&&!x.cell.piece.lock&&!x.cell.piece.ice);
    for(let attempt=0;attempt<80;attempt++){
      const pieces=movable.map(x=>x.cell.piece);
      for(let i=pieces.length-1;i>0;i--){const j=rand(i+1);[pieces[i],pieces[j]]=[pieces[j],pieces[i]];}
      movable.forEach((x,i)=>{mutable[x.i].piece=pieces[i];});
      if(!findMatchGroups(mutable).length&&hasPossibleMove(mutable)){board=mutable;break;}
    }
    if(events&&beforeShuffle&&board!==inputBoard&&board.some((cell,i)=>cell.piece?.id!==beforeShuffle[i].piece?.id)){
      events.push({type:'reshuffle',board:clone(board),previous:beforeShuffle,indices:board.map((_,i)=>i),objectives:clone(objectives),score});
    }
  }
  if(events)events.push({type:'settle',board:clone(board),objectives:clone(objectives),score});
  return {board,objectives,score,cascade,totalCreated,totalActivated};
}

export function swapAndResolve(state, from, to, level, allowAny=false) {
  if(state.phase!=='playing'||!Number.isInteger(from)||!Number.isInteger(to))return {ok:false,state};
  if(!allowAny&&Math.abs(Math.floor(from/SIZE)-Math.floor(to/SIZE))+Math.abs(from%SIZE-to%SIZE)!==1)return {ok:false,state};
  const a=state.board[from]?.piece,b=state.board[to]?.piece;
  if(!a||!b||a.prop||b.prop||a.lock>0||b.lock>0||a.ice>0||b.ice>0)return {ok:false,state};
  let board=state.board.map(cell=>({...cell,piece:cell.piece?{...cell.piece}:null}));
  [board[from].piece,board[to].piece]=[board[to].piece,board[from].piece];
  const hasCombo=Boolean(board[from].piece?.special&&board[to].piece?.special)||board[from].piece?.special==='rainbow'||board[to].piece?.special==='rainbow';
  if(!findMatchGroups(board).length&&!hasCombo)return {ok:false,state};
  const events=[{type:'swap',board:clone(state.board),indices:[from,to],from,to}];
  let objectives=clone(state.objectives),score=state.score,created=0,activated=0,cascade=0;
  if(hasCombo){
    const blast=comboBlast(board,from,to,level);
    const specialType=board[from].piece?.special==='rainbow'||board[to].piece?.special==='rainbow'?'rainbow':board[from].piece?.special==='bomb'||board[to].piece?.special==='bomb'?'bomb':board[from].piece?.special==='plane'||board[to].piece?.special==='plane'?'plane':'rocket';
    events.push({type:'special',board:clone(board),indices:[...blast],origin:[from,to],special:specialType,combo:true});
    for(const i of [from,to]){
      const p=board[i].piece;
      if(p.special){activated++;const u=updateObjectives(objectives,o=>o.type==='ACTIVATE_SPECIAL'&&(o.special==='ANY_SPECIAL'||o.special===p.special.toUpperCase()||o.special==='SPECIAL_COMBO'),1);objectives=u.objectives;}
    }
    // Clear combo targets as one wave, then settle and cascade.
    const temp=board.map(x=>({...x,piece:x.piece?{...x.piece}:null}));
    for(const i of blast){const cell=temp[i];if(!cell||cell.speaker||!cell.piece||cell.piece.prop)continue;const p=cell.piece;if(p.ice>0){p.ice--;const u=updateObjectives(objectives,o=>o.type==='BREAK_ICE',1);objectives=u.objectives;score+=100;continue;}if(p.lock>0){p.lock--;const u=updateObjectives(objectives,o=>o.type==='UNLOCK',1);objectives=u.objectives;score+=100;continue;}if(cell.dust>0){cell.dust--;const u=updateObjectives(objectives,o=>o.type==='CLEAN',1);objectives=u.objectives;score+=100;}const u=updateObjectives(objectives,o=>o.type==='COLLECT'&&o.tileId===p.tile,1);objectives=u.objectives;cell.piece=null;score+=60;}
    const speakers=new Set();for(const i of blast)for(const n of [i,...neighbors(i)])if(temp[n]?.speaker)speakers.add(n);
    for(const i of speakers){temp[i].speaker=Math.max(0,temp[i].speaker-1);const u=updateObjectives(objectives,o=>o.type==='BREAK_SPEAKER',1);objectives=u.objectives;score+=100;}
    board.splice(0,board.length,...temp);
    events.push({type:'clear',board:clone(board),previous:clone(state.board),indices:[...blast],objectives:clone(objectives),score,wave:0});
    const beforeDrop=clone(board);
    const compact=compactAndSpawn(board,level,objectives,score);board.splice(0,board.length,...compact.board);objectives=compact.objectives;score=compact.score;cascade++;score+=50;
    events.push({type:'drop',board:clone(board),previous:beforeDrop,objectives:clone(objectives),score,wave:0});
    const follow=resolveBoard(board,objectives,level,null,score,events);board=follow.board;objectives=follow.objectives;score=follow.score;created+=follow.totalCreated;activated+=follow.totalActivated;cascade+=follow.cascade;
  }else{
    const result=resolveBoard(board,state.objectives,level,[to,from],score,events);
    board=result.board;objectives=result.objectives;score=result.score;created=result.totalCreated;activated=result.totalActivated;cascade=result.cascade;
  }
  const won=objectives.every(o=>o.current>=o.target);
  const movesLeft=state.movesLeft-1;
  const phase=won?'won':movesLeft<=0?'lost':'playing';
  return {ok:true,state:{...state,board,objectives,score,movesLeft,phase,selected:null,cascade},summary:{created,activated,cascade,won,phase,events}};
}

export function applySwapBooster(state, from, to, level) {
  if(state.phase!=='playing'||from===to||(state.boosters?.swap||0)<=0)return state;
  const a=state.board[from],b=state.board[to];
  if(!a?.piece||!b?.piece||a.speaker||b.speaker||a.piece.prop||b.piece.prop||a.piece.lock>0||b.piece.lock>0||a.piece.ice>0||b.piece.ice>0)return state;
  const result=swapAndResolve(state,from,to,level,true);
  const boosters={...state.boosters,swap:state.boosters.swap-1};
  if(result.ok)return {...result.state,movesLeft:state.movesLeft,phase:result.summary.won?'won':'playing',boosters};
  const board=state.board.map(cell=>({...cell,piece:cell.piece?{...cell.piece}:null}));
  [board[from].piece,board[to].piece]=[board[to].piece,board[from].piece];
  return {...state,board,boosters,selected:null};
}

export function applyBooster(state, type, index, level) {
  if(state.phase!=='playing'||(state.boosters?.[type]||0)<=0)return state;
  let board=state.board.map(cell=>({...cell,piece:cell.piece?{...cell.piece}:null}));
  let objectives=clone(state.objectives),score=state.score,boosters={...state.boosters};
  let boosterTransition=null;
  if(type==='hammer'){
    const cell=board[index];if(!cell)return state;
    let needsRefill=false;
    if(cell.speaker>0){
      cell.speaker--;
      // A destroyed speaker stops being a gravity barrier. The empty square
      // must be refilled even when the hammer does not cause a match.
      needsRefill=cell.speaker===0;
      const u=updateObjectives(objectives,o=>o.type==='BREAK_SPEAKER',1);objectives=u.objectives;score+=100;
    }
    else if(!cell.piece)return state;
    else if(cell.piece.ice>0){cell.piece.ice--;const u=updateObjectives(objectives,o=>o.type==='BREAK_ICE',1);objectives=u.objectives;score+=100;}
    else if(cell.piece.lock>0){cell.piece.lock--;const u=updateObjectives(objectives,o=>o.type==='UNLOCK',1);objectives=u.objectives;score+=100;}
    else {if(cell.dust>0){cell.dust--;const u=updateObjectives(objectives,o=>o.type==='CLEAN',1);objectives=u.objectives;score+=100;}const u=updateObjectives(objectives,o=>o.type==='COLLECT'&&o.tileId===cell.piece.tile,1);objectives=u.objectives;cell.piece=null;score+=60;needsRefill=true;}
    boosters.hammer--;
    if(needsRefill){
      // Match-3 gravity is independent of a match: hammer removals also drop
      // existing pieces, deliver props, and spawn a new tile into every gap.
      const impactBoard=clone(board);
      const settled=compactAndSpawn(board,level,objectives,score);
      board=settled.board;objectives=settled.objectives;score=settled.score;
      boosterTransition={impactBoard,dropBoard:clone(board)};
    }
  }else if(type==='shuffle'){
    const movable=board.map((cell,i)=>({cell,i})).filter(x=>x.cell.piece&&!x.cell.piece.prop&&!x.cell.piece.special&&!x.cell.piece.lock&&!x.cell.piece.ice);
    const pieces=movable.map(x=>x.cell.piece);
    for(let attempt=0;attempt<80;attempt++){
      const p=[...pieces];for(let i=p.length-1;i>0;i--){const j=rand(i+1);[p[i],p[j]]=[p[j],p[i]];}
      movable.forEach((x,i)=>{board[x.i].piece=p[i];});
      if(!findMatchGroups(board).length&&hasPossibleMove(board))break;
    }
    boosters.shuffle--;
  }else if(type==='extra'){
    boosters.extra--;return {...state,boosters,movesLeft:state.movesLeft+5,extraMovesGranted:(state.extraMovesGranted||0)+5};
  }else return state;
  const resolved=resolveBoard(board,objectives,level,null,score);
  const won=resolved.objectives.every(o=>o.current>=o.target);
  return {...state,...resolved,boosters,phase:won?'won':'playing',selected:null,...(boosterTransition?{boosterTransition}:{})};
}

export function worldForLevel(levelId){return Math.floor((levelId-1)/25)+1;}
export function loadThomDiamondProgress(){
  try{const p=JSON.parse(localStorage.getItem('thom-kim-cuong-progress-v1'))||{};return {unlockedLevel:Math.max(1,Math.min(100,Number(p.unlockedLevel)||1)),results:p.results||{},boosters:{hammer:1,swap:1,shuffle:1,extra:1,...p.boosters}};}catch{return {unlockedLevel:1,results:{},boosters:{hammer:1,swap:1,shuffle:1,extra:1}};}
}
export function saveThomDiamondProgress(progress){localStorage.setItem('thom-kim-cuong-progress-v1',JSON.stringify(progress));}
