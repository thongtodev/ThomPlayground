import {useRoundFeedback,useNearFinish,useOnetMotion,NewPhotoBadge,UnlockMarker,markNews,seePhoto} from '../effects/ProgressEffects';
import {useGameJuice, gameEffect, usePieceMotion, RewardReveal} from '../effects/GameEffects.jsx';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MINER_LEVELS, MINER_ITEMS, MINER_ORIGIN, hookPoint, createMinerRun, castMiner, advanceMiner, validMinerSession } from '../minerEngine';
import { loadGameSession, saveGameSession, clearGameSession } from '../gameSessions';
import { MINER_ARTWORK } from '../minerArtwork';
import { reconcileMinerRewards } from '../minerCollection';
import { AlbumThumbnail } from '../GameAlbumEditor';
import Icon from '../Icon';

const PROGRESS_KEY='thom-miner-progress-v1';
export function readProgress(){try{const p=JSON.parse(localStorage.getItem(PROGRESS_KEY));return {unlocked:Math.max(1,Math.min(10,Number(p?.unlocked)||1)),best:p?.best||{},rewards:p?.rewards||{}};}catch{return {unlocked:1,best:{}};}}
function Artwork({kind,images={},x=-30,y=-30,width=60,height=60}){
 const custom=images[`miner-${kind}`],art=MINER_ARTWORK[kind];
 return custom?<image href={custom} x={x} y={y} width={width} height={height} preserveAspectRatio="xMidYMid meet"/>:<svg x={x} y={y} width={width} height={height} viewBox={art[1]} preserveAspectRatio="xMidYMid meet"><image href={`/assets/miner/${art[0]}`} width="685" height="685"/></svg>;
}
function Sprite({kind,images}){return <Artwork kind={kind} images={images}/>;}
export function MinerAlbum({album,unlockedIds}){
 const [view,setView]=useState(null);
 const dialog=useRef(null);
 useEffect(()=>{
  if(view)dialog.current.showModal();
 },[view]);
 return <><div className="miner-collection-grid">{album.map((photo,index)=>{
  const unlocked=unlockedIds.has(photo.id);
  return <button type="button" key={photo.id} disabled={!unlocked} onClick={()=>{seePhoto('miner',photo.id);setView(photo);}} className={unlocked?'is-unlocked':''}>
   <NewPhotoBadge game="miner" id={photo.id}/><span className="miner-album-art">{unlocked?<AlbumThumbnail image={photo} transform={photo.transform} alt=""/>:<Icon name="lock" size={28}/>}</span>
   <small>Hình {index+1}</small></button>;
 })}</div>{view&&<dialog ref={dialog} className="miner-album-dialog" onClose={()=>setView(null)} aria-label="Hình đã mở khóa">
  <section className="miner-collection"><header><h2>Hình đã mở khóa</h2><button className="miner-album-close" aria-label="Đóng hình" onClick={()=>dialog.current.close()}><Icon name="close"/></button></header>
  <img src={view.url} alt="Hình đã mở khóa"/></section></dialog>}</>;
}
export function MinerRewardDialog({photo,level,onContinue,onAlbums}){
 const dialog=useRef(null);
 useEffect(()=>{
  const el=dialog.current,overflow=document.body.style.overflow;
  el.showModal();document.body.style.overflow='hidden';
  return ()=>{el.close();document.body.style.overflow=overflow;};
 },[]);
 return <dialog className="miner-album-dialog miner-reward-dialog" ref={dialog} aria-labelledby="miner-reward-title"
   onCancel={e=>{e.preventDefault();onContinue();}}>
  <div className="miner-collection"><header><div><small>Đào Dép Đi! · Level {level}</small><h2 id="miner-reward-title">Thêm một chú Thơm vào bộ sưu tập của chim cá nè!</h2></div>
   <button className="miner-album-close" aria-label="Đóng ảnh và xem thành tích" onClick={onContinue}><Icon name="close" size={18}/></button></header>
   <button type="button" className="primary-button miner-view-album" onClick={()=>onAlbums('miner')}><Icon name="gallery" size={20}/> Xem bộ sưu tập</button>
   <RewardReveal/><img src={photo.url} alt={`Hình thưởng Level ${level}`}/>
   <button type="button" className="secondary-button" onClick={onContinue}>Xem thành tích</button>
  </div>
 </dialog>;
}
function Scene({run,images,onCast,gain}){
  const hook=hookPoint(run.angle,run.length);
  return <svg className="miner-scene" viewBox="0 0 720 720" role="application" aria-label="Bàn Đào Dép Đi. Nhấn mũi tên xuống hoặc chạm để thả móc." tabIndex="0" onClick={onCast}>
    <rect width="720" height="720" fill="#c6eafa"/>
    <image href="/assets/miner/CanhDong-v2.png" width="720" height="720" preserveAspectRatio="xMidYMid meet" aria-hidden="true"/>
    <g transform="translate(0 100)">
    <g className="miner-character-art"><Artwork kind="character" images={images} x={310} y={4} width={100} height={135}/></g>
    {gain&&<g transform="translate(452 75)" role="img" aria-label={`Cộng ${gain.value} dép`}>
      <g key={gain.id} className="miner-score-float">
        <text textAnchor="end" y="6">+{gain.value}</text>
        <Artwork kind="slipper" images={images} x={3} y={-12} width={21} height={23}/>
      </g>
    </g>}
    {run.items.map(item=><g key={item.id} data-miner-item={item.kind} transform={`translate(${item.x} ${item.y}) scale(${item.radius/30})`}><title>{MINER_ITEMS[item.kind].name} · {MINER_ITEMS[item.kind].value} dép</title><Sprite kind={item.kind} images={images}/></g>)}
    <line x1={MINER_ORIGIN.x} y1={MINER_ORIGIN.y} x2={hook.x} y2={hook.y} stroke="#2d3538" strokeWidth={run.carried?.kind.includes('rock')?5:4}/>
    {run.carried&&<g className="miner-carried" transform={`translate(${hook.x} ${hook.y+16}) scale(${run.carried.radius/30})`}><g className="miner-carried-art"><Sprite kind={run.carried.kind} images={images}/></g></g>}
    <g className="miner-hook" transform={`translate(${hook.x} ${hook.y}) rotate(${-run.angle*180/Math.PI})`}><path d="M0-8V8M0 1-13 12-9 23M0 1 13 12 9 23" fill="none" stroke="#222c33" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/><path d="M0-8V8M0 1-13 12-9 23M0 1 13 12 9 23" fill="none" stroke="#e3e7cc" strokeWidth="4" strokeLinecap="round"/></g>
    </g>
  </svg>;
}
export function MinerGame({onHome,images={},album=[],postResultActionsRef,playSound=()=>{},onEvent=()=>{},saveRecord=()=>{}}){
  const initial=useRef(null);
  if(!initial.current){const stored=loadGameSession('miner');initial.current=validMinerSession(stored)?{...stored,phase:'paused'}:{phase:'ready',level:1};}
  const [run,setRun]=useState(initial.current),runRef=useRef(initial.current);
  const [gain,setGain]=useState(null);
  const [buff,setBuff]=useState(null);
  useRoundFeedback(run.phase,Math.ceil(run.remaining),'.miner-scene',run.level);
  useGameJuice('miner',{phase:run.phase,motion:run.motion,carried:run.carried,gain});
  useEffect(()=>{if(!buff)return;const kind=buff.kind,a=document.querySelector('.miner-character-art')?.getBoundingClientRect(),b=document.querySelector(kind==='clock'?'.miner-hud>div:nth-child(2)':`[data-buff="${kind}"]`)?.getBoundingClientRect();if(a&&b)gameEffect({type:'buff',point:{x:a.left+a.width/2,y:a.top+a.height/2},end:{x:b.left+b.width/2,y:b.top+b.height/2},symbol:{magnet:'🧲',boost:'⚡',clock:'⏱'}[kind],label:kind==='clock'?'Có thêm 10 giây rồi, mình đào tiếp nào!':undefined,duration:1800});},[buff]);
  const [progress,setProgress]=useState(readProgress);

  useEffect(()=>{setProgress(current=>{const next=reconcileMinerRewards(current,album);if(JSON.stringify(next)===JSON.stringify(current))return current;try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(next));}catch{}return next;});},[album]);
  const emitted=useRef(false),eventRef=useRef(onEvent),soundRef=useRef(playSound),saveRef=useRef(saveRecord);
  eventRef.current=onEvent;soundRef.current=playSound;saveRef.current=saveRecord;
  const update=useCallback(next=>{runRef.current=next;setRun(next);},[]);
  const start=level=>{setGain(null);setBuff(null);emitted.current=false;const next=createMinerRun(level);update(next);saveGameSession('miner',next);};
  const cast=useCallback(()=>{const next=castMiner(runRef.current);if(next!==runRef.current){update(next);soundRef.current(380,.04);}},[update]);
  const pause=useCallback(()=>{const state=runRef.current;if(state.phase==='playing'){const next={...state,phase:'paused'};update(next);saveGameSession('miner',next);}},[update]);
  const resume=()=>update({...runRef.current,phase:'playing'});
  const chooseLevels=()=>{clearGameSession('miner');update({phase:'ready',level:runRef.current.level||1});};
  useEffect(()=>{
    const key=e=>{if(e.target.closest?.('input,textarea,select,[contenteditable=true]')||e.repeat)return;if(e.key==='ArrowDown'&&runRef.current.phase==='playing'){e.preventDefault();cast();}if(e.key==='ArrowUp'){if(runRef.current.phase==='playing'){e.preventDefault();pause();}else if(runRef.current.phase==='paused'){e.preventDefault();update({...runRef.current,phase:'playing'});}}};
    const hidden=()=>{if(document.hidden)pause();};
    window.addEventListener('keydown',key);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',pause);
    return()=>{window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',pause);const state=runRef.current;if(['playing','paused'].includes(state.phase))saveGameSession('miner',state);};
  },[cast,pause,update]);
  useEffect(()=>{
    if(run.phase!=='playing')return;
    let frame,last=performance.now(),savedAt=last,drawnAt=last;
    const tick=now=>{
      const previous=runRef.current;if(previous.phase!=='playing')return;
      const elapsed=(now-last)/1000;last=now;
      if(elapsed>1){pause();return;}
      const next=advanceMiner(previous,elapsed);runRef.current=next;
      if(next.serial!==previous.serial&&previous.carried&&['magnet','boost','clock'].includes(previous.carried.kind))setBuff({id:next.serial,kind:previous.carried.kind});
      if(next.score>previous.score)setGain({id:next.serial,value:next.score-previous.score});
      if(next.serial!==previous.serial)soundRef.current(next.score>previous.score?780:200,.08);
      if(now-drawnAt>=32||next.phase!=='playing'||next.serial!==previous.serial){setRun(next);drawnAt=now;}
      if(now-savedAt>=1000){saveGameSession('miner',next);savedAt=now;}
      if(next.phase==='playing')frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[run.phase,pause]);
  useEffect(()=>{
    if(!['won','lost'].includes(run.phase)||emitted.current)return;
    emitted.current=true;clearGameSession('miner');
    const won=run.phase==='won';
    let rewardPhoto=null;
    if(won){const current=readProgress();const previous=current.best[run.level]||{};let next={...current,unlocked:Math.max(current.unlocked,Math.min(10,run.level+1)),best:{...current.best,[run.level]:{score:Math.max(previous.score||0,run.score),stars:Math.max(previous.stars||0,run.stars),seconds:Math.max(previous.seconds||0,run.remaining)}}};next=reconcileMinerRewards(next,album);const rewardId=!current.rewards?.[run.level]?next.rewards?.[run.level]:null;rewardPhoto=rewardId?album.find(photo=>photo.id===rewardId):null;try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(next));}catch{}setProgress(next);if(rewardPhoto)markNews('photo','miner',[rewardPhoto.id]);if(run.level<10&&next.unlocked>current.unlocked){markNews('level','miner',[run.level+1]);gameEffect({type:'message',label:'Mở thêm một màn rồi nè, chim cá thử tiếp nha!',duration:2200});}saveRef.current('miner',{label:`${run.score} dép`,value:run.score,kind:'score'});}
    if(postResultActionsRef)postResultActionsRef.current={
      message:!won?`Bạn chưa đạt mục tiêu Level ${run.level}. Bạn muốn thử lại hay chọn một Level khác?`:run.level===10?'Bạn đã hoàn thành Level 10 của Đào Dép Đi! Bạn muốn chơi lại màn cuối hay chọn Level khác?':null,
      nextLabel:won&&run.level<10?`Chơi Level ${run.level+1}`:`Chơi lại Level ${run.level}`,
      next:()=>start(won&&run.level<10?run.level+1:run.level),
      choose:chooseLevels
    };
    eventRef.current({type:'miner_finish',rewardPhoto,won,level:run.level,stars:run.stars||0,gold:run.gold,rocks:run.rocks,...(won?{completed:'miner'}:{}),result:{gameId:'miner',gameName:'Đào Dép Đi!',title:won?`Qua Level ${run.level}!`:'Chưa đủ dép!',summary:`${run.score}/${run.target} dép · ${run.casts} lượt thả${won?` · ${run.stars} sao`:''}`,variant:`level-${run.level}`,variantLabel:`Level ${run.level}`,metricKind:'score',metricValue:run.score,metricLabel:`${run.score} dép`,eligible:won,details:{won,level:run.level,target:run.target,secondsLeft:Math.floor(run.remaining),stars:run.stars||0,casts:run.casts,rocks:run.rocks,gold:run.gold}}});
  },[run.phase]);
  if(run.phase==='ready')return <main className="game-intro miner-intro"><button className="back-link" onClick={onHome}>Tất cả trò chơi</button><section className="intro-card"><span className="eyebrow">GOLD MINER · THƠM PLAYGROUND</span><h1>Đào Dép Đi!</h1><p>Móc chạm gì trước là kéo món đó lên. Gặp đá nặng thì chú kéo hơi lâu nha!</p><div className="miner-instructions"><b>Máy tính: ↓ thả móc · ↑ tạm dừng / tiếp tục.</b><span>Chim cá canh chuẩn rồi chạm xuống lòng đất để thả móc nha. Đang kéo thì chờ chú một xíu!</span><span>Đủ mục tiêu là qua màn ngay. Còn 20 giây được 2 sao, còn 35 giây được 3 sao.</span></div><div className="miner-levels">{MINER_LEVELS.map(cfg=><button className="miner-level" key={cfg.level} disabled={cfg.level>progress.unlocked} onClick={()=>start(cfg.level)}><UnlockMarker game="miner" id={cfg.level}/><b>Level {cfg.level}</b><span>{cfg.target} dép · {cfg.time}s</span><small>{cfg.level>progress.unlocked?'Chưa mở':progress.best[cfg.level]?'★'.repeat(progress.best[cfg.level].stars):'Chơi thôi nào!'}</small></button>)}</div><div className="miner-legend">{Object.entries(MINER_ITEMS).map(([kind,item])=><div key={kind}><svg viewBox="-38 -38 76 86" aria-hidden="true"><Sprite kind={kind} images={images}/></svg><span><b>{item.name}</b><small>{item.value?`${item.value} dép · kéo ${Math.round(item.speed*100)}%`:kind==='magnet'?'Hút vật giá trị gần móc ở lượt kế':kind==='boost'?'Kéo nhanh ×1,6 trong 2 lượt':kind==='clock'?'+10 giây khi kéo lên':`0 dép · kéo ${Math.round(item.speed*100)}%`}</small></span></div>)}</div></section></main>;
  return <main className="game-page miner-page"><button className="back-link" onClick={onHome}>Trang chủ</button><header className="game-heading"><div><span className="eyebrow">HÀNH TRÌNH ĐÀO DÉP · LEVEL {run.level}/10</span><h1>Đào Dép Đi!</h1></div>{run.phase==='playing'&&<button className="secondary-button" onClick={pause}><Icon name="pause" size={16}/> Tạm dừng</button>}</header><div className="miner-hud"><div><small>Đã kéo lên</small><strong>{run.score} <em>/ {run.target} dép</em></strong><progress max={run.target} value={run.score}/></div><div className={`fx-clock ${run.remaining<=15?'miner-time-low':''}`}><small>Còn lại</small><strong>{Math.ceil(run.remaining)}s</strong></div><div><small>Lượt thả</small><strong>{run.casts}</strong></div></div><div className="miner-board-wrap">{run.phase==='won'&&<div className="miner-stars-fx"><RewardReveal stars={run.stars||1}/></div>}<Scene gain={gain} run={run} images={images} onCast={cast}/>{run.phase==='paused'&&<div className="miner-pause"><h2>Đã tạm dừng</h2><p>Ván chơi của bạn đã được lưu.</p><button className="primary-button" onClick={resume}>Tiếp tục</button><button className="text-button" onClick={chooseLevels}>Chọn Level</button></div>}</div>{(run.boosts>0||run.magnets>0)&&<aside className="miner-buffs">{run.boosts>0&&<span data-buff="boost">Tăng lực ×{run.boosts}</span>}{run.magnets>0&&<span data-buff="magnet">Nam châm ×{run.magnets}</span>}</aside>}</main>;
}
