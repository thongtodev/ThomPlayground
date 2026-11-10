export function shuffleJigsaw(size, random=Math.random, steps=size*size*18) {
  const total=size*size; const tiles=Array.from({length:total},(_,i)=>i);
  for(let step=0;step<steps;step++){
    const options=[];
    for(let i=0;i<total;i++){
      const row=Math.floor(i/size),col=i%size;
      if(row>0)options.push([i,i-size]);
      if(row<size-1)options.push([i,i+size]);
      if(col>0)options.push([i,i-1]);
      if(col<size-1)options.push([i,i+1]);
    }
    const [a,b]=options[Math.floor(random()*options.length)];
    [tiles[a],tiles[b]]=[tiles[b],tiles[a]];
  }
  if(tiles.every((v,i)=>v===i)) return shuffleJigsaw(size,random,steps+3);
  return tiles;
}
export function swapJigsawTiles(tiles, from, to) {
  if(!Array.isArray(tiles)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=tiles.length||to>=tiles.length||from===to)return tiles;
  const next=[...tiles];[next[from],next[to]]=[next[to],next[from]];return next;
}
export const isJigsawSolved = tiles => Array.isArray(tiles)&&tiles.every((tile,index)=>tile===index);


// Swap two selected jigsaw pieces by position only. Rotation metadata is intentionally
// kept outside this helper so exchanging pieces can never rotate either piece.
export function swapJigsawPiecePositions(placements, tray, first, second) {
  if (!Array.isArray(placements) || !Array.isArray(tray) || !first || !second) {
    return { placements, tray, changed: false };
  }
  const nextPlacements = [...placements];
  const nextTray = [...tray];
  const locate = (source, item, originalPlacements, originalTray) => {
    if (source === 'board') {
      return Number.isInteger(item.index) ? item.index : originalPlacements.indexOf(item.id);
    }
    if (source === 'tray') {
      return Number.isInteger(item.index) ? item.index : originalTray.indexOf(item.id);
    }
    return -1;
  };
  if (first.source === second.source) {
    const source = first.source;
    const from = locate(source, first, placements, tray);
    const to = locate(source, second, placements, tray);
    const list = source === 'board' ? nextPlacements : nextTray;
    if (!['board', 'tray'].includes(source) || from < 0 || to < 0 ||
        from >= list.length || to >= list.length || from === to) {
      return { placements, tray, changed: false };
    }
    [list[from], list[to]] = [list[to], list[from]];
    return { placements: nextPlacements, tray: nextTray, changed: true };
  }
  const boardItem = first.source === 'board' ? first : second;
  const trayItem = first.source === 'tray' ? first : second;
  if (boardItem.source !== 'board' || trayItem.source !== 'tray') {
    return { placements, tray, changed: false };
  }
  const boardIndex = locate('board', boardItem, placements, tray);
  const trayIndex = locate('tray', trayItem, placements, tray);
  if (boardIndex < 0 || trayIndex < 0 ||
      boardIndex >= nextPlacements.length || trayIndex >= nextTray.length) {
    return { placements, tray, changed: false };
  }
  const displaced = nextPlacements[boardIndex];
  nextPlacements[boardIndex] = nextTray[trayIndex];
  if (displaced == null) nextTray.splice(trayIndex, 1);
  else nextTray[trayIndex] = displaced;
  return { placements: nextPlacements, tray: nextTray, changed: true };
}
