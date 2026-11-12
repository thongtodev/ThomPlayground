import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {animate} from 'motion';
import confetti from 'canvas-confetti';
import {isCelebration} from './effectRules.js';
import {afterConnectFourDrop} from './connectFourDropTiming.js';

const EVENT='thom-game-effect';
export const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export function gameEffect(detail){
 if(typeof window!=='undefined'&&!document.hidden)window.dispatchEvent(new CustomEvent(EVENT,{detail}));
}
const active=new WeakMap();
export function moveVisual(el,frames,options={}){
 if(!el||reduced()||document.hidden)return;
 active.get(el)?.cancel();
 const control=animate(el,frames,{duration:.25,...options});active.set(el,control);
 return control;
}
const center=el=>{const r=el?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;};
export function GameEffects({playSound,scope}){
 const [items,setItems]=useState([]),sound=useRef(playSound),serial=useRef(0),canvas=useRef(null);
 sound.current=playSound;
 useEffect(()=>{
  const timers=new Set(),controls=new Set();let burst;
  const effect=({detail:d})=>{
   if(document.hidden)return;
   const el=d.element||document.querySelector(d.selector||'.game-heading');
   const point=d.point||center(el)||{x:innerWidth/2,y:innerHeight*.4};
   const id=++serial.current;
   if(d.sound)sound.current?.(d.sound,.07);
   if(d.haptic&&!reduced())navigator.vibrate?.(18);
   if(d.type==='celebrate'&&!reduced()){
    burst ||= confetti.create(canvas.current,{resize:true,disableForReducedMotion:true});
    burst({particleCount:innerWidth<600?28:48,spread:65,startVelocity:24,ticks:95,origin:{x:.5,y:.48},colors:['#efc66d','#8edcc6','#ed9dbe'],gravity:1.1,scalar:.8});
   }
   if(d.type==='shake'){
    const c=moveVisual(el,{x:[0,-5,5,-3,0]});if(c){controls.add(c);c.then(()=>controls.delete(c));}
   }else if(d.type==='pop'){
    const c=moveVisual(el,{scale:[1,1.1,1]});if(c){controls.add(c);c.then(()=>controls.delete(c));}
   }
   if(d.label||['spark','dust','celebrate','ring','line','buff'].includes(d.type)){
    setItems(old=>[...old.filter(item=>!d.label||!item.label).slice(-5),{...d,...point,id}]);
    const t=setTimeout(()=>{setItems(old=>old.filter(i=>i.id!==id));timers.delete(t);},d.duration||(d.type==='line'?600:d.label?1300:650));timers.add(t);
   }
  };
  const clear=()=>{setItems([]);for(const t of timers)clearTimeout(t);timers.clear();for(const c of controls)c.cancel();controls.clear();burst?.reset();};
  const hidden=()=>{if(document.hidden)clear();};
  window.addEventListener(EVENT,effect);document.addEventListener('visibilitychange',hidden);
  return()=>{window.removeEventListener(EVENT,effect);document.removeEventListener('visibilitychange',hidden);clear();};
 },[scope]);
 return createPortal(<div className="game-fx-layer" aria-hidden="true"><canvas ref={canvas} className="game-fx-confetti"/>{items.map(f=><div key={f.id} className={`game-fx-burst fx-${f.type}`} style={{left:Math.max(50,Math.min(innerWidth-50,f.x)),top:f.y}}>{f.type==='line'&&f.end&&<svg className="game-win-line" style={{left:0,top:0}} width={Math.abs(f.end.x-f.x)+10} height={Math.abs(f.end.y-f.y)+10} overflow="visible"><line x1="0" y1="0" x2={f.end.x-f.x} y2={f.end.y-f.y} pathLength="1"/></svg>}{f.type==='buff'&&<span className="fx-miner-flight" style={{'--to-x':`${f.end.x-f.x}px`,'--to-y':`${f.end.y-f.y}px`}}>{f.symbol}</span>}{f.label&&<span className="game-fx-label" style={{animationDuration:`${(f.duration||1300)/1000}s`}}>{f.label}</span>}{['spark','dust','ring'].includes(f.type)&&Array.from({length:f.type==='ring'?1:6},(_,i)=><i key={i} style={{'--dx':`${Math.cos(i*Math.PI/3)*34}px`,'--dy':`${Math.sin(i*Math.PI/3)*30}px`}}/>)}</div>)}</div>,document.body);
}

// FLIP only moved game pieces. No animation loop or layout read on clock ticks.
export function usePieceMotion(selector,revision,enabled=true){
 const previous=useRef(new Map());
 useLayoutEffect(()=>{
  const now=new Map(),controls=[];
  for(const el of document.querySelectorAll(selector)){
   const key=el.dataset.juicePiece,r=el.getBoundingClientRect();
   const pos={x:r.left+scrollX,y:r.top+scrollY};now.set(key,pos);
   const old=previous.current.get(key);
   if(enabled&&old&&(Math.abs(old.x-pos.x)>1||Math.abs(old.y-pos.y)>1)){
    const c=moveVisual(el,{x:[old.x-pos.x,0],y:[old.y-pos.y,0]},{duration:.2,ease:'easeOut'});if(c)controls.push(c);
   }
  }
  previous.current=now;
  return()=>controls.forEach(c=>c.cancel());
 },[selector,revision,enabled]);
}

export function useGameJuice(game,state){
 const previous=useRef(null);
 useLayoutEffect(()=>{
  const p=previous.current;previous.current=state;
  if(!p||p.phase==='ready'||state.phase==='ready'||p.phase==='paused'||state.phase==='paused')return;
  const all=s=>Array.from(document.querySelectorAll(s));
  const pop=(el)=>moveVisual(el,{scale:[.85,1.08,1]});
  if(game==='mole'&&state.hit&&state.hit!==p.hit){
   const hole=all('.mole-hole')[state.hit.index];
   gameEffect({type:state.hit.kind==='bomb'?'shake':'spark',element:hole?.querySelector('.mole-hit-feedback'),point:center(hole),haptic:state.hit.kind==='bomb'});
   if(state.combo===3||state.combo===5)gameEffect({type:'spark',element:hole,label:'Chim cá tặng chuẩn quá, chú nhận không kịp luôn!',duration:2200,sound:state.combo===3?880:1040});
  }
  if(game==='tic'&&state.board!==p.board){
   all('.tic-token.fx-last-move').forEach(el=>el.classList.remove('fx-last-move'));
   all('.tic-cell').forEach((el,i)=>{if(state.board[i]&&!p.board[i])el.querySelector('.tic-token')?.classList.add('fx-last-move');});
   all('.tic-cell').forEach((el,i)=>{if(state.board[i]&&!p.board[i])pop(el.querySelector('.tic-token'));});
  }
  if(game==='connect4'&&state.board!==p.board){
   all('.connect4-token.fx-last-move').forEach(el=>el.classList.remove('fx-last-move'));
   let dropAnimation;
   all('.connect4-cell').forEach((el,i)=>{
    const r=Math.floor(i/7),c=i%7;
    if(state.board[r]?.[c]&&!p.board[r]?.[c]){
     const token=el.querySelector('.connect4-token');
     token?.classList.add('fx-last-move');
     dropAnimation=moveVisual(token,{y:[-(r+1)*el.clientHeight,0,-5,0]},{duration:.32});
    }
   });
   // A successful move is not settled visually until the disc reaches its slot.
   // For reduced motion / hidden tabs, there is no animation to wait for.
   if(state.onDiscLanded){
    const landed=()=>state.onDiscLanded(state.dropId);
    afterConnectFourDrop(dropAnimation,landed);
   }
  }
  if((game==='tic'||game==='connect4')&&state.outcome&&!p.outcome){
   const cells=all(game==='tic'?'.tic-cell':'.connect4-cell');
   const indexes=game==='tic'?state.outcome.line||[]:(state.outcome.line||[]).map(([r,c])=>r*7+c);
   indexes.forEach((idx,i)=>{const el=cells[idx]?.querySelector(game==='tic'?'.tic-token':'.connect4-token');moveVisual(el,{scale:[1,1.15,1]},{delay:.3+i*.1,duration:.35});});
   if(indexes.length>1){const a=center(cells[indexes[0]]),b=center(cells[indexes.at(-1)]);if(a&&b)gameEffect({type:'line',point:a,end:b});}
  }
  if(game==='mines'&&state.board!==p.board){
   const cells=all('.mine-cell'),newly=state.board.filter((c,i)=>c.open&&!p.board[i]?.open);
   newly.slice(0,32).forEach((c,i)=>moveVisual(cells[c.i],{opacity:[.35,1],scale:[.82,1]},{delay:Math.min(i,14)*.012,duration:.2}));
   if(state.phase==='lost'&&p.phase!=='lost')gameEffect({type:'ring',element:cells[state.lastCell],haptic:true});
   if(state.phase==='won'&&p.phase!=='won')cells.forEach(el=>pop(el.firstElementChild));
   state.board.forEach((c,i)=>{if(c.flag&&!p.board[i]?.flag)pop(cells[i]?.firstElementChild);});
  }
  if(game==='puzzle'&&state.tiles!==p.tiles&&state.moves>p.moves){
   state.tiles.forEach((v,i)=>{if(v===i&&p.tiles[i]!==v&&v!==state.tiles.length-1)gameEffect({type:'spark',element:document.querySelector(`.puzzle-tile[data-juice-piece="${v}"]`)});});
  }
  if(game==='jigsaw'&&state.moves>p.moves){
   state.placements.forEach((v,i)=>{if(v===i&&!(state.rotations[v]%360)&&(p.placements[i]!==v||p.rotations[v]%360))gameEffect({type:'spark',element:document.querySelector(`.jigsaw-piece-button[data-juice-piece="${v}"]`)});});
  }
  if(game==='simon'){
   if(state.active>=0&&state.active!==p.active)pop(all('.simon-pad-image')[state.active]);
   if(state.wrong>=0&&state.wrong!==p.wrong)gameEffect({type:'shake',element:all('.simon-pad-image')[state.wrong]});
   if(state.completed>p.completed&&state.completed%3===0)gameEffect({type:'spark',selector:'.simon-status',label:'Chim cá nhớ đỉnh quá ta!'});
  }
  if(game==='reaction'&&state.status!==p.status){
   if(state.status==='go')moveVisual(document.querySelector('.reaction-zone .mascot-image'),{scale:[1,1.05,1]},{duration:.18});
   if(state.status==='measured')gameEffect({type:'ring',point:state.point,selector:'.reaction-zone h2',label:state.best?'Nhanh dữ ta!':undefined});
   if(['early','bomb-hit'].includes(state.status))gameEffect({type:'shake',selector:'.reaction-zone-inner',haptic:state.status==='bomb-hit'});
   if(state.status==='measured')pop(document.querySelector('.reaction-zone h2'));
  }
  if(game==='miner'){
   if(state.carried&&!p.carried)gameEffect({type:'dust',selector:'.miner-carried',sound:['rock','boulder'].includes(state.carried.kind)?180:360,label:['rock','boulder'].includes(state.carried.kind)?'Cục này hơi nặng, đợi chú kéo lên nha!':undefined,duration:1800});
   if(state.gain&&state.gain!==p.gain)gameEffect({type:'spark',selector:'.miner-character-art'});
   if(state.motion==='swing'&&p.motion==='in'&&!p.carried)gameEffect({type:'pop',selector:'.miner-hook path',label:'Hụt xíu thôi, chim cá canh lại nha!',duration:1800});
  }
 });
}

export function RewardReveal({stars=0}){
 return <div className="game-reward-seal" aria-hidden="true"><span>🔓</span>{stars>0&&<div>{Array.from({length:stars},(_,i)=><i key={i} style={{animationDelay:`${i*.16}s`}}>★</i>)}</div>}</div>;
}
export function ResultEffects({result,playSound}){
 const ref=useRef(null);
 useEffect(()=>{
  if(ref.current===result)return;ref.current=result;
  if(isCelebration(result))gameEffect({type:'celebrate',duration:2200,label:result.isNewBest?'Chim cá vượt kỷ lục của mình rồi nè!':undefined});
  if(result.isNewBest)playSound?.(1040,.12);
 },[result,playSound]);
 return result.isNewBest?<div className="game-record-badge">✦ Kỷ lục mới!</div>:null;
}
export function useResultDelay(result){
 const [shown,setShown]=useState(null);
 useEffect(()=>{
  setShown(null);if(!result)return;
  const t=setTimeout(()=>setShown(result),reduced()?0:650);
  return()=>clearTimeout(t);
 },[result]);
 return shown===result?shown:null;
}
export function CountUp({value}){
 const ref=useRef(null);
 useEffect(()=>{
  if(!ref.current)return;
  if(reduced()){ref.current.textContent=Number(value).toLocaleString('vi-VN');return;}
  const control=animate(0,Number(value)||0,{duration:.6,onUpdate:v=>{if(ref.current)ref.current.textContent=Math.round(v).toLocaleString('vi-VN');}});
  return()=>control.stop();
 },[value]);
 return <span ref={ref}>{value}</span>;
}
