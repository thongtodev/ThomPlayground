// Server order determines clockwise seats. The local player always sits at the bottom.
export function tableSeats(room){
 if(!room)return [];
 const active=room.players.filter(p=>!p.left),ids=(room.order||[]).filter(id=>active.some(p=>p.id===id));
 for(const p of active)if(!ids.includes(p.id))ids.push(p.id);
 const me=ids.indexOf(room.me),rotated=me<0?ids:[...ids.slice(me+1),...ids.slice(0,me)];
 const others=rotated.filter(id=>id!==room.me).map(id=>active.find(p=>p.id===id));
 const slots=others.length===1?['top']:others.length===2?['left','right']:['left','top','right'];
 return others.slice(0,3).map((p,i)=>({...p,seat:slots[i]}));
}
// The same fullscreen control must both enter and exit fullscreen.
// Some browsers expose the older WebKit API; orientation locking is optional.
export function isFullscreenActive(documentObject=globalThis.document){
 return Boolean(documentObject?.fullscreenElement||documentObject?.webkitFullscreenElement);
}
export async function toggleLandscape(element,screenObject=globalThis.screen,documentObject=globalThis.document){
 if(isFullscreenActive(documentObject)){
  try{
   if(typeof documentObject.exitFullscreen==='function')await documentObject.exitFullscreen();
   else if(typeof documentObject.webkitExitFullscreen==='function')await documentObject.webkitExitFullscreen();
   else return true; // Do not unlock the orientation if fullscreen cannot be exited.
  }catch{return true;}
  try{screenObject?.orientation?.unlock?.();}catch{}
  return false;
 }
 let requested=false;
 try{
  if(typeof element?.requestFullscreen==='function'){
   await element.requestFullscreen();requested=true;
  }else if(typeof element?.webkitRequestFullscreen==='function'){
   await element.webkitRequestFullscreen();requested=true;
  }
 }catch{} // Orientation locking may still be supported when fullscreen is blocked.
 if(typeof screenObject?.orientation?.lock==='function'){
  try{await screenObject.orientation.lock('landscape');return true;}catch{}
 }
 return requested||isFullscreenActive(documentObject);
}
// Preserve the existing export for callers that still use the older name.
export const enterLandscape=toggleLandscape;
