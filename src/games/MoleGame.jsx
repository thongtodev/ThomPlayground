import { DEFAULT_IMAGE } from '../assetStore';
import React, { useEffect, useRef, useState } from 'react';
import { makeGameCursor } from '../cursorImage';
import Icon from '../Icon';
import { loadGameSession, saveGameSession, clearGameSession, restoredPhase, resumePhase } from '../gameSessions';
import { GameIntro, GameFrame, SiteIcon } from '../components/GameUI.jsx';
import { GAMES } from './catalog.js';

function MoleGame({onHome,playSound,saveRecord,images,onEvent,appearance,onRestart}) {
 const savedRef=useRef(loadGameSession('mole'));const saved=savedRef.current;const resumeRef=useRef(resumePhase(saved));
 const [phase,setPhase]=useState(()=>restoredPhase(saved)),[duration,setDuration]=useState(()=>saved?.duration||30),[left,setLeft]=useState(()=>saved?.left??saved?.duration??30);
 const [score,setScore]=useState(()=>saved?.score||0),[hits,setHits]=useState(()=>saved?.hits||0),[miss,setMiss]=useState(()=>saved?.miss||0),[combo,setCombo]=useState(()=>saved?.combo||0),[bombHits,setBombHits]=useState(()=>saved?.bombHits||0);
 const [target,setTarget]=useState(()=>saved?.target||null),[mode,setMode]=useState(()=>saved?.mode||'classic'),[hitFeedback,setHitFeedback]=useState(null),[touchSlipper,setTouchSlipper]=useState(null);
 const lastIndex=useRef(saved?.lastIndex??-1),hitLock=useRef(false),finished=useRef(false),spawnSequence=useRef(saved?.spawnSequence||0),touchSlipperTimer=useRef(null);
 useEffect(()=>{if(phase!=='paused'&&phase!=='ready'&&phase!=='result')resumeRef.current=phase;},[phase]);
 useEffect(()=>{if(phase==='playing'||phase==='paused')saveGameSession('mole',{phase:phase==='paused'?resumeRef.current:phase,resumePhase:resumeRef.current,duration,left,score,hits,miss,combo,bombHits,target,mode,lastIndex:lastIndex.current,spawnSequence:spawnSequence.current});else clearGameSession('mole');},[phase,duration,left,score,hits,miss,combo,bombHits,target,mode]);
 // Normalize uploaded slipper images, including older images with opaque backgrounds.
 // The image is used as a native cursor, not an overlay or an element in the board.
 const [slipperCursor,setSlipperCursor]=useState('/assets/slipper-cursor.png');
 useEffect(()=>{
  let active=true;
  const source=images['icon-slipper'];
  // The bundled cursor is already a transparent, optimized PNG. Reuse its
  // stable URL instead of generating a new data URI during game startup.
  if(!source){setSlipperCursor('/assets/slipper-cursor.png');return()=>{active=false;};}
  makeGameCursor(source).then(url=>{if(active)setSlipperCursor(url);}).catch(()=>{
   if(active)setSlipperCursor('/assets/slipper-cursor.png');
  });
  return()=>{active=false;};
 },[images['icon-slipper']]);
 useEffect(()=>{if(!hitFeedback)return;const t=setTimeout(()=>setHitFeedback(null),460);return()=>clearTimeout(t);},[hitFeedback]);
 const start=()=>{resumeRef.current='playing';setHitFeedback(null);setTouchSlipper(null);if(touchSlipperTimer.current)clearTimeout(touchSlipperTimer.current);finished.current=false;lastIndex.current=-1;hitLock.current=false;spawnSequence.current=0;setLeft(duration);setScore(0);setHits(0);setMiss(0);setCombo(0);setBombHits(0);setTarget(null);setPhase('playing');};
 useEffect(()=>{if(phase!=='playing')return;const id=setInterval(()=>setLeft(v=>Math.max(0,v-1)),1000);return()=>clearInterval(id);},[phase]);
 useEffect(()=>{if(phase==='playing'&&left===0){setTarget(null);setPhase('result');}},[phase,left]);
 useEffect(()=>{if(phase!=='playing')return;
  if(!target){const id=setTimeout(()=>{let index=Math.floor(Math.random()*9);if(index===lastIndex.current)index=(index+1+Math.floor(Math.random()*8))%9;lastIndex.current=index;hitLock.current=false;setTarget({id:++spawnSequence.current,index,kind:Math.random()<(mode==='traps'?.38:.22)?'bomb':'thom'});},240);return()=>clearTimeout(id);}
  const speed=mode==='speed'?Math.max(430,900-(duration-left)*8):mode==='traps'?680:880;
  const id=setTimeout(()=>{if(target.kind==='thom'){setMiss(m=>m+1);setCombo(0);}setTarget(null);},speed);
  return()=>clearTimeout(id);
 },[phase,target,mode,duration]);
 useEffect(()=>{if(phase!=='result'||finished.current)return;finished.current=true;saveRecord('mole',{label:`${score} dép`,value:score,kind:'score'});onEvent({type:'mole_finish',score,completed:'mole',result:{gameId:'mole',gameName:'Tặng dép',title:'Hết giờ!',summary:`${score} dép · Tặng đúng ${hits} · Tặng nhầm ${bombHits}`,variant:`${mode}-${duration}`,variantLabel:`${({classic:'Classic',speed:'Speed Up',traps:'Bomb Challenge'})[mode]} · ${duration} giây`,metricKind:'score',metricValue:score,metricLabel:`${score.toLocaleString('vi-VN')} dép`,eligible:true,details:{mode,duration,score,hits,miss,bombHits}}});},[phase,score,saveRecord,onEvent]);
 const showTouchSlipper=(event,index)=>{
  if(event.pointerType!=='touch'||phase!=='playing'||target?.index!==index)return;
  const arena=event.currentTarget.closest('.mole-arena');
  if(!arena)return;
  const rect=arena.getBoundingClientRect();
  setTouchSlipper({x:event.clientX-rect.left,y:event.clientY-rect.top,id:Date.now()});
  if(touchSlipperTimer.current)clearTimeout(touchSlipperTimer.current);
  // The slipper simply appears at the touch point; it does not swing or hit.
  touchSlipperTimer.current=setTimeout(()=>setTouchSlipper(null),520);
 };
 useEffect(()=>()=>{if(touchSlipperTimer.current)clearTimeout(touchSlipperTimer.current);},[]);
 const hit=(index)=>{if(phase!=='playing'||!target||target.index!==index||hitLock.current)return;hitLock.current=true;
  if(target.kind==='bomb'){setHitFeedback({index,label:'−5',kind:'bomb',at:Date.now()});setScore(s=>Math.max(0,s-5));setCombo(0);setBombHits(b=>b+1);playSound(180,.15);}
  else {setHitFeedback({index,label:'+10',kind:'thom',at:Date.now()});setHits(h=>h+1);setCombo(c=>{const n=c+1;setScore(s=>s+10+(n===3?5:n===5?10:0));return n;});playSound(720,.05);}
  setTarget(null);
 };
 if(phase==='ready')return <GameIntro images={images} game={GAMES[1]} onBack={onHome} onStart={start}><div className="rules-list"><span><Icon name="slipper"/> Tặng đúng chú Thơm: +10 dép.</span><span><Icon name="bomb"/> Chú Thơm có biểu tượng bom nhỏ là bẫy, tặng nhầm trừ 5 dép.</span><span><Icon name="flame"/> Combo 3 lần +5 dép, combo 5 lần +10 dép.</span><span><Icon name="timer"/> Bỏ lỡ chú Thơm không bị trừ dép.</span></div><label className="select-label">Thời lượng<select value={duration} onChange={e=>{setDuration(+e.target.value);setLeft(+e.target.value);}}><option value="30">30 giây</option><option value="60">60 giây</option></select></label><label className="select-label">Chế độ<select value={mode} onChange={e=>setMode(e.target.value)}><option value="classic">Classic · 22% bom</option><option value="speed">Speed Up · Nhanh dần, 22% bom</option><option value="traps">Bomb Challenge · 38% bom</option></select></label></GameIntro>;
 return <GameFrame game={GAMES[1]} images={images} onHome={onHome} onReset={()=>setPhase('ready')} onRestart={onRestart} stats={[{label:'Thời gian',value:`${left}s`},{label:'Dép',value:score},{label:'Combo',value:`×${combo}`},{label:'Tặng / Lỡ',value:`${hits} / ${miss}`},{label:'Nhầm bom',value:bombHits}]} controls={<button className="small-select" onClick={()=>setPhase(p=>p==='paused'?'playing':'paused')}><SiteIcon slot={phase==='paused'?'play':'pause'} images={images} fallback={phase==='paused'?'play':'pause'}/> {phase==='paused'?'Tiếp tục':'Tạm dừng'}</button>}>
 <div className="mole-legend mole-visual-legend">
  <span><img src={images.mole||DEFAULT_IMAGE} alt="Chú Thơm thường"/><b>CHÚ THƠM</b><strong className="mole-delta">+10 <img src={slipperCursor} alt="dép"/></strong><small>Đã tặng: {hits}</small></span>
  <span><span className="mole-legend-bomb"><img src={images.mole||DEFAULT_IMAGE} alt="Chú Thơm có bom"/><i><Icon name="bomb" size={30}/></i></span><b>THƠM BOM</b><strong className="mole-delta">−5 <img src={slipperCursor} alt="dép"/></strong><small>Tặng nhầm: {bombHits}</small></span>
 </div>
 <div className="mole-arena" style={{'--slipper-cursor':`url("${slipperCursor}") 29 13, pointer`,'--mole-board-width':`${appearance?.boardWidth||680}px`,'--mole-character-scale':(appearance?.characterScale||125)/100}}><div className="mole-grid">{Array.from({length:9},(_,i)=><button key={i} className={`mole-hole ${target?.index===i?'active':''} ${target?.index===i&&target?.kind==='bomb'?'mole-bomb-hole':''}`} onPointerDown={e=>showTouchSlipper(e,i)} onClick={()=>hit(i)} disabled={phase!=='playing'} aria-label={`Lỗ ${i+1}${target?.index===i?(target.kind==='bomb'?' - Thơm bom, tránh chạm':' - chú Thơm, chạm để tặng dép'):''}`}>
 <span className="mole-pit" aria-hidden="true"/>
 {target?.index===i&&<span key={target.id} className={`mole-character ${target.kind==='bomb'?'is-bomb':''}`}><img src={images.mole||DEFAULT_IMAGE} alt=""/>{target.kind==='bomb'&&<span className="mole-bomb-overlay" aria-hidden="true"><Icon name="bomb" size={30}/></span>}</span>}
 <span className="mole-front-rim" aria-hidden="true"/>
 {hitFeedback?.index===i&&<span key={hitFeedback.at} className={`mole-hit-feedback ${hitFeedback.kind}`}><b>{hitFeedback.label}</b><img src={slipperCursor} alt="dép"/></span>}
 </button>)}</div>{touchSlipper&&<img key={touchSlipper.id} className="mole-touch-slipper" src={slipperCursor} alt="" aria-hidden="true" style={{left:touchSlipper.x,top:touchSlipper.y}}/>}</div>
 {phase==='paused'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="pause" size={36}/></span><h2>{saved?'Bạn còn một ván đang chơi dở':'Tạm dừng'}</h2><p>{saved?'Ván trước đã được lưu. Tiếp tục khi bạn sẵn sàng nhé.':'Bàn chơi đã được che và đồng hồ dừng.'}</p><button className="primary-button" onClick={()=>setPhase(resumeRef.current)}>Tiếp tục</button><button className="text-button" onClick={()=>setPhase('ready')}>Chơi lại</button></div></div>}
 {phase==='result'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="trophy" size={36}/></span><h2>Hết giờ!</h2><p><b>{score} dép</b> · Tặng đúng {hits} · Bỏ lỡ {miss} · Tặng nhầm {bombHits}</p><button className="primary-button" onClick={start}>Chơi lại</button><button className="text-button" onClick={onHome}>Chọn game khác</button></div></div>}
 </GameFrame>;
}

export { MoleGame };
