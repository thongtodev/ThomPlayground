import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {gameEffect,moveVisual,reduced} from './GameEffects';
import {countdownCue,tileOrigins,hasNews,clearNews} from './progressRules';
export {markNews,hasNews} from './progressRules';
export const seePhoto=(game,id)=>{clearNews('photo',game,id);window.dispatchEvent(new Event('thom-photo-seen'));};
export function NewPhotoBadge({game,id}){
 const [fresh,setFresh]=useState(()=>hasNews('photo',game,id));
 useEffect(()=>{const sync=()=>setFresh(hasNews('photo',game,id));window.addEventListener('thom-photo-seen',sync);return()=>window.removeEventListener('thom-photo-seen',sync);},[game,id]);
 return fresh?<span className="fx-new-photo">Mới nhận nè!</span>:null;
}
export function UnlockMarker({game,id}){
 const [fresh,setFresh]=useState(()=>hasNews('level',game,id));
 useEffect(()=>{if(!fresh)return;const t=setTimeout(()=>{clearNews('level',game,id);setFresh(false);},2000);return()=>clearTimeout(t);},[game,id,fresh]);
 return fresh?<span className="fx-unlock-marker" aria-label="Level vừa mở khóa">🔓</span>:null;
}
export function useRoundFeedback(phase,seconds,selector='.game-heading',roundKey=''){
 const previous=useRef(null),lastCue=useRef(new Set());
 useEffect(()=>{
  const old=previous.current;previous.current={phase,seconds,roundKey};
  const active=['playing','playback','input'].includes(phase);
  if(!old||phase==='ready'){lastCue.current.clear();return;}
  if(active&&(['ready','won','lost','result','over'].includes(old.phase)||old.roundKey!==roundKey)){
   lastCue.current.clear();const title=document.querySelector('.game-heading h1')?.textContent;gameEffect({type:'message',selector,label:`${title?title+' · ':''}Chim cá sẵn sàng chưa? Chơi cùng chú nào!`,duration:2200});
  }else if(active&&old.phase==='paused')gameEffect({type:'message',selector,label:'Chim cá về rồi, mình chơi tiếp nha!',duration:1800});
  if(!active||!['playing','playback','input'].includes(old.phase))return;
  const cue=countdownCue(old.seconds,seconds),id=String(seconds);
  if(cue&&!lastCue.current.has(id)){
   lastCue.current.add(id);
   gameEffect({type:'pop',selector:'.fx-clock',label:cue==='warning'?'Còn 10 giây nè chim cá ơi!':undefined,sound:cue==='tick'?660:undefined,duration:1800});
  }
 },[phase,seconds,roundKey,selector]);
}
export function useNearFinish(phase,remaining){
 const said=useRef(false);
 useEffect(()=>{if(['ready','won','lost'].includes(phase)){said.current=false;return;}if(phase==='playing'&&remaining>0&&remaining<=3&&!said.current){said.current=true;gameEffect({type:'message',selector:'.game-heading',label:'Sắp thấy nguyên chú rồi, cố thêm xíu nha chim cá!',duration:2200});}},[phase,remaining]);
}
export function useOnetMotion(board,phase){
 const old=useRef(null);
 useLayoutEffect(()=>{
  const els=Array.from(document.querySelectorAll('.onet-cell')),rects=els.map(el=>el.getBoundingClientRect()),controls=[];
  if(phase==='playing'&&old.current?.phase==='playing'&&board!==old.current.board){
   tileOrigins(old.current.board,board).forEach((j,i)=>{
    if(j==null||j===i||!rects[i]||!old.current.rects[j])return;
    // Animate the tile, not its <img>; image transforms can leave blank tiles on mobile.
    const a=old.current.rects[j],b=rects[i],tile=els[i];
    const c=moveVisual(tile,{x:[a.left-b.left,0],y:[a.top-b.top,0]},{duration:.22});if(c)controls.push(c);
   });
  }
  old.current={board,rects,phase};return()=>controls.forEach(c=>c.cancel());
 },[board,phase]);
}
export function TurnClock({remaining,total}){
 const ratio=Math.max(0,Math.min(1,remaining/total));
 return <svg className={`fx-turn-clock ${remaining<=5?'urgent':''}`} viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20"/><circle cx="22" cy="22" r="20" pathLength="1" style={{strokeDasharray:'1',strokeDashoffset:1-ratio}}/></svg>;
}
