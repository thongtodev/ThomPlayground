import {useRoundFeedback,useNearFinish,useOnetMotion,NewPhotoBadge,UnlockMarker,markNews,hasNews,seePhoto} from '../effects/ProgressEffects';
import {useGameJuice, gameEffect, usePieceMotion, RewardReveal} from '../effects/GameEffects.jsx';
import {levelLabel} from '../levelLabels';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { loadGameSession, saveGameSession, clearGameSession, restoredPhase, resumePhase } from '../gameSessions';
import { DEFAULT_IMAGE } from '../assetStore';
import { renderSlotImage } from '../imageTransforms';
import { shuffleJigsaw, swapJigsawPiecePositions } from '../jigsawEngine';
import { buildJigsawPiecePath, isJigsawSolved, normalizeJigsawRotation } from '../jigsawShapes';
import { canPlayJigsawDifficulty } from '../puzzleProgress';
import { GAME_META, difficultyName } from './newGameMeta.js';
import { Frame } from '../components/NewGameUI.jsx';

async function renderSquareImage(url,size=1400){
 const image=await new Promise((resolve,reject)=>{const item=new Image();item.crossOrigin='anonymous';item.onload=()=>resolve(item);item.onerror=()=>reject(new Error('Không đọc được ảnh'));item.src=url;});
 const side=Math.min(image.naturalWidth,image.naturalHeight),canvas=document.createElement('canvas');canvas.width=canvas.height=Math.min(size,side);
 const x=(image.naturalWidth-side)/2,y=(image.naturalHeight-side)/2;canvas.getContext('2d').drawImage(image,x,y,side,side,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/webp',.92);
}

async function renderJigsawImage(item,size=1400){
 if(!item?.url)return DEFAULT_IMAGE;
 if(item.transform?.mode==='crop')return renderSlotImage(item.url,item.transform,size);
 return renderSquareImage(item.url,size);
}

function JigsawLevelCard({image,index,record={},onChoose}){
 const easyDone=Boolean(record.easy),hardDone=Boolean(record.hard);
 return <article className="puzzle-level-card jigsaw-level-card">
  <div className="puzzle-level-copy"><b>Level {String(index+1).padStart(2,'0')}</b></div>
  <div className="puzzle-level-actions"><UnlockMarker game="jigsaw" id={image.id}/>
   <button type="button" className="puzzle-difficulty-button easy" onClick={()=>onChoose(image,'easy')}>{easyDone?'Chơi lại Dễ':'Dễ · 3×3'}</button>
   <button type="button" className="puzzle-difficulty-button hard" disabled={!easyDone} title={easyDone?'':'Hoàn thành cấp độ Dễ để mở khóa'} onClick={()=>onChoose(image,'hard')}>{hardDone?'Chơi lại Khó':easyDone?'Khó · 5×5':<><Icon name="lock" size={13}/> Khó</>}</button>
  </div>
 </article>;
}

function JigsawCollectionTile({image,index,record={},onOpen}){
 const [preview,setPreview]=useState(image?.url||DEFAULT_IMAGE);
 const transformKey=JSON.stringify(image?.transform||null);
 const unlocked=Boolean(record.easy||record.hard);
 useEffect(()=>{let active=true;setPreview(image?.url||DEFAULT_IMAGE);renderJigsawImage(image,360).then(url=>{if(active)setPreview(url);}).catch(()=>{if(active)setPreview(image?.url||DEFAULT_IMAGE);});return()=>{active=false;};},[image?.url,transformKey]);
 return <button type="button" className={`puzzle-collection-tile ${unlocked?'unlocked':'locked'}`} disabled={!unlocked||!image?.url} onClick={()=>{seePhoto('jigsaw',image.id);onOpen({...image,previewUrl:preview,record});}}>
  <NewPhotoBadge game="jigsaw" id={image.id}/><div className="puzzle-collection-art">{image?.url?<img src={preview} alt={`Ảnh Level ${index+1}`}/>:<span className="puzzle-collection-placeholder"><Icon name="image" size={38}/></span>}{!unlocked&&<div className="puzzle-collection-mask"><span><Icon name="lock" size={20}/></span><b>Hoàn thành để mở khóa</b></div>}</div>
  <b>Level {String(index+1).padStart(2,'0')}</b><small>{unlocked?`${record.easy?'Dễ đã đạt':''}${record.easy&&record.hard?' · ':''}${record.hard?'Khó đã đạt':''}`:'Chưa mở khóa'}</small>
 </button>;
}

export function JigsawAlbum({album=[],progress={}}){
 const [viewImage,setViewImage]=useState(null);
 return <><div className="puzzle-collection-grid">{album.map((entry,index)=><JigsawCollectionTile key={entry.id} image={entry} index={index} record={progress[entry.id]||{}} onOpen={setViewImage}/>)}</div>{viewImage&&createPortal(<div className="overlay puzzle-collection-overlay puzzle-collection-preview-overlay" onClick={event=>{event.preventDefault();event.stopPropagation();setViewImage(null);}}><div className="result-card puzzle-collection-modal" onClick={e=>e.stopPropagation()}><button type="button" className="close-modal" onClick={event=>{event.preventDefault();event.stopPropagation();setViewImage(null);}} aria-label="Đóng hình"><Icon name="close" size={19}/></button><h2>Ảnh đã mở khóa</h2><img src={viewImage.url||DEFAULT_IMAGE} alt="Ảnh gốc đã mở khóa"/><p>{viewImage.record?.easy?'Đã hoàn thành cấp độ Dễ. ':''}{viewImage.record?.hard?'Đã hoàn thành cấp độ Khó.':''}</p></div></div>,document.body)}</>;
}

const JigsawPieceGraphic=memo(function JigsawPieceGraphic({piece,size,imageSrc,rotation=0,outline=false}){
 const row=Math.floor(piece/size),col=piece%size,path=useMemo(()=>buildJigsawPiecePath(piece,size),[piece,size]),clipId=`jigsaw-shape-${size}-${piece}`;
 return <svg className={`jigsaw-piece-svg ${outline?'outline':''}`} style={{'--piece-angle':`${rotation}deg`}} viewBox="-.2 -.2 1.4 1.4" role="img" aria-hidden="true">
  {!outline&&<defs><clipPath id={clipId}><path d={path}/></clipPath></defs>}
  {!outline&&<image href={imageSrc} x={-col} y={-row} width={size} height={size} preserveAspectRatio="none" clipPath={`url(#${clipId})`}/>}
  <path d={path} className="jigsaw-piece-shape" fill={outline?'#ffffff12':'none'} stroke={outline?'#f4d8a0':'#fff8'} strokeWidth=".018" vectorEffect="non-scaling-stroke"/>
 </svg>;
});

function JigsawPieceButton({piece,size,imageSrc,rotation=0,selected=false,source='tray',onClick,onDragStart,onDragEnd,onDragOver,onDrop,onPointerDown,onPointerMove,onPointerUp,onPointerCancel,dragging=false}){
 return <button type="button" data-juice-piece={piece} className={`jigsaw-piece-button ${source==='board'?'on-board':'in-tray'} ${selected?'selected':''} ${dragging?'touch-dragging':''}`} draggable onClick={onClick} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDrop={onDrop} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} aria-label={`Mảnh ghép ${piece+1}${rotation?`, xoay ${rotation} độ`:''}`}>
  <JigsawPieceGraphic piece={piece} size={size} imageSrc={imageSrc} rotation={rotation}/>
 </button>;
}

function JigsawGame({onAlbums,onHome,playSound=()=>{},images={},album=[],onEvent=()=>{},onResultReady,saveRecord=()=>{},jigsawProgress={},onRestart,postResultActionsRef}){
 const [initialSession]=useState(()=>loadGameSession('jigsaw'));const savedRef=useRef(initialSession);const snapshot=savedRef.current;const saved=snapshot && levelLabel(album,`${snapshot.chosen?.id}-${snapshot.difficulty}`)?snapshot:null;const resumeRef=useRef(resumePhase(saved));
 const [phase,setPhase]=useState(()=>restoredPhase(saved)),[difficulty,setDifficulty]=useState(()=>saved?.difficulty||'easy'),[chosen,setChosen]=useState(()=>saved?.chosen||null),[placements,setPlacements]=useState(()=>saved?.placements||[]),[tray,setTray]=useState(()=>saved?.tray||[]),[rotations,setRotations]=useState(()=>saved?.rotations||{}),[moves,setMoves]=useState(()=>saved?.moves||0),[seconds,setSeconds]=useState(()=>saved?.seconds||0),[selectedPiece,setSelectedPiece]=useState(null),[dragged,setDragged]=useState(null),[showSample,setShowSample]=useState(false),[showWinImage,setShowWinImage]=useState(false),[showWinImagePreview,setShowWinImagePreview]=useState(false),[imageSrc,setImageSrc]=useState(DEFAULT_IMAGE),[winResult,setWinResult]=useState(null);
 const [layout,setLayout]=useState(()=>saved?(saved.layout||'tray'):'board');
 usePieceMotion(".jigsaw-piece-button[data-juice-piece]",placements,phase==='playing'||phase==='won');
 useGameJuice('jigsaw',{phase,placements,rotations,moves});
 useRoundFeedback(phase);
 useNearFinish(phase,placements.filter((v,i)=>v!==i||rotations[v]%360!==0).length);
 const finished=useRef(false),touchDragRef=useRef(null),suppressTouchClickRef=useRef(0),n=difficulty==='easy'?3:5,total=n*n;
  const openCollection=event=>{event?.preventDefault?.();event?.stopPropagation?.();onAlbums('jigsaw');};
  const closeWinImage=event=>{event?.preventDefault?.();event?.stopPropagation?.();setShowWinImage(false);onResultReady?.(winResult);};
 useEffect(()=>{if(phase!=='paused'&&phase!=='ready'&&phase!=='won')resumeRef.current=phase;},[phase]);
 // Keep serialization/storage off the immediate touch update; flush on exit.
 const sessionRef=useRef(null);
 useEffect(()=>{sessionRef.current=(phase==='playing'||phase==='paused')?{phase:phase==='paused'?resumeRef.current:phase,resumePhase:resumeRef.current,layout,difficulty,chosen,placements,tray,rotations,moves,seconds}:null;});
 useEffect(()=>{
  if(phase!=='playing'&&phase!=='paused'){clearGameSession('jigsaw');return;}
  const timer=setTimeout(()=>{if(sessionRef.current)saveGameSession('jigsaw',sessionRef.current);},250);
  return()=>clearTimeout(timer);
 },[phase,layout,difficulty,chosen,placements,tray,rotations,moves,Math.floor(seconds/5)]);
 useEffect(()=>{
  const flush=()=>{if(sessionRef.current)saveGameSession('jigsaw',sessionRef.current);};
  const hidden=()=>{if(document.hidden)flush();};
  window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);
  return()=>{window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden);flush();};
 },[]);
 useEffect(()=>{if(!album.length){setChosen(null);return;}if(chosen&&!album.some(x=>x.id===chosen.id))setChosen(null);},[album]);
 useEffect(()=>{let active=true;if(!chosen?.url){setImageSrc(DEFAULT_IMAGE);return()=>{active=false;};}setImageSrc(DEFAULT_IMAGE);renderJigsawImage(chosen,Math.min(1400,Math.max(640,Math.ceil(Math.min(window.innerWidth*.82,650)*Math.min(window.devicePixelRatio||1,2))))).then(url=>{if(active)setImageSrc(url);}).catch(()=>{if(active)setImageSrc(chosen.url||DEFAULT_IMAGE);});return()=>{active=false;};},[chosen?.url,JSON.stringify(chosen?.transform||null)]);
 useEffect(()=>{if(phase!=='playing')return;const timer=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(timer);},[phase]);
 const fmt=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
 const begin=(image,mode='easy',force=false)=>{
  resumeRef.current='playing';if(!image||(!force&&!canPlayJigsawDifficulty(jigsawProgress,image.id,mode)))return;
  const size=mode==='easy'?3:5;finished.current=false;
  const initialRotations=Object.fromEntries(Array.from({length:size*size},(_,i)=>[i,Math.floor(Math.random()*4)*90]));
  if(Object.values(initialRotations).every(v=>v===0))initialRotations[size*size-1]=90;
  setChosen(image);setDifficulty(mode);setLayout('board');setPlacements(shuffleJigsaw(size));setTray([]);setRotations(initialRotations);setMoves(0);setSeconds(0);setSelectedPiece(null);setDragged(null);setShowSample(false);setShowWinImage(false);setShowWinImagePreview(false);setWinResult(null);setPhase('playing');
 };
 const reset=()=>{finished.current=false;setPhase('ready');setChosen(null);setPlacements([]);setTray([]);setRotations({});setMoves(0);setSeconds(0);setSelectedPiece(null);setDragged(null);setShowSample(false);setShowWinImage(false);setShowWinImagePreview(false);setWinResult(null);};
 const complete=(next,nextRotations,count)=>{
  if(finished.current||!isJigsawSolved(next,nextRotations))return;
  if(!jigsawProgress[chosen.id]?.easy&&!jigsawProgress[chosen.id]?.hard)markNews('photo','jigsaw',[chosen.id]);if(difficulty==='easy'&&!jigsawProgress[chosen.id]?.easy){markNews('level','jigsaw',[chosen.id]);gameEffect({type:'message',label:'Mở thêm một màn rồi nè, chim cá thử tiếp nha!',duration:2200});}finished.current=true;setShowWinImage(true);setPhase('won');saveRecord('jigsaw',{label:`${count} thao tác`,value:count,kind:'steps'});
  const label=`${count} thao tác · ${fmt(seconds)}`;
  const variant=`${chosen.id}-${difficulty}`;
   const variantLabel=levelLabel(album,variant);
   const result={gameId:'jigsaw',gameName:GAME_META.jigsaw.name,title:'Ghép thành công!',summary:`${variantLabel} · ${count} thao tác · ${fmt(seconds)}.`,variant,variantLabel,metricKind:'steps',metricValue:count,metricLabel:label,eligible:true,details:{layout,imageId:chosen.id,size:n,difficulty,steps:count,seconds}};
  setWinResult(result);
  if(postResultActionsRef)postResultActionsRef.current={
   nextLabel:'Chơi Level tiếp theo',
   next:()=>{
    const currentIndex=album.findIndex(item=>item.id===chosen.id);
    const nextImage=difficulty==='easy'?chosen:album[(currentIndex+1+album.length)%album.length];
    const nextMode=difficulty==='easy'?'hard':'easy';
    begin(nextImage,nextMode,true);
   },
   choose:reset
  };
  onEvent({type:'jigsaw_level_win',completed:'jigsaw',n,size:n,difficulty,imageId:chosen.id,steps:count,seconds,result});
 };
 const movePieceToBoard=(piece,target)=>{
  if(phase!=='playing'||!Number.isInteger(piece)||target<0||target>=total)return;
  const next=[...placements],nextTray=[...tray],sourceIndex=next.indexOf(piece),trayIndex=nextTray.indexOf(piece);
  if(sourceIndex===target)return;
  if(sourceIndex>=0){[next[sourceIndex],next[target]]=[next[target],next[sourceIndex]];}
  else if(trayIndex>=0){nextTray.splice(trayIndex,1);const displaced=next[target];next[target]=piece;if(displaced!=null)nextTray.push(displaced);}
  else return;
  playSound(540,.04);const count=moves+1;setPlacements(next);setTray(nextTray);setMoves(count);setSelectedPiece(null);complete(next,rotations,count);
 };
 const returnToTray=slot=>{
  if(phase!=='playing'||slot<0||slot>=total||placements[slot]==null)return;
  const next=[...placements],piece=next[slot];next[slot]=null;setPlacements(next);setTray(old=>[...old,piece]);setSelectedPiece(null);setMoves(v=>v+1);
 };
 const rotateSelected=direction=>{
  if(phase!=='playing'||!selectedPiece||!Number.isInteger(selectedPiece.id))return;
  const piece=selectedPiece.id;
  const nextRotations={...rotations,[piece]:normalizeJigsawRotation((rotations[piece]||0)+direction)};
  playSound(460,.04);setRotations(nextRotations);
  const count=moves+1;setMoves(count);complete(placements,nextRotations,count);
 };
 const swapSelectedWith=target=>{
  if(phase!=='playing'||!selectedPiece||!target)return;
  if(selectedPiece.source===target.source&&selectedPiece.id===target.id){setSelectedPiece(null);return;}
  const swapped=swapJigsawPiecePositions(placements,tray,selectedPiece,target);
  if(!swapped.changed){setSelectedPiece(null);return;}
  const count=moves+1;
  playSound(540,.04);setPlacements(swapped.placements);
  setTray(swapped.tray);
  setMoves(count);
  setSelectedPiece(null);
  // Swapping positions must preserve each piece's current rotation.
  complete(swapped.placements,rotations,count);
 };
 const selectTrayPiece=piece=>{
  if(selectedPiece){swapSelectedWith({source:'tray',id:piece});return;}
  setSelectedPiece({source:'tray',id:piece});
 };
 const handleTouchPointerDown=(piece,source,index=null)=>(e)=>{
  if(e.pointerType==='mouse'||phase!=='playing')return;
  touchDragRef.current={id:piece,source,index,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false};
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
 };
 const handleTouchPointerMove=e=>{
  const drag=touchDragRef.current;
  if(!drag||drag.pointerId!==e.pointerId||drag.moved)return;
  const distance=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY);
  if(!drag.moved&&distance<12)return;
  drag.moved=true;
  setDragged({id:drag.id,source:drag.source,touch:true});
 };
 const handleTouchPointerUp=e=>{
  const drag=touchDragRef.current;
  if(!drag||drag.pointerId!==e.pointerId)return;
  touchDragRef.current=null;
  if(!drag.moved){
   // A tap is handled by the click event and selects the piece; it never rotates.
   setDragged(null);
   return;
  }
  suppressTouchClickRef.current=Date.now();
  try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{}
  const target=document.elementFromPoint(e.clientX,e.clientY);
  const slotElement=target?.closest?.('[data-jigsaw-slot]');
  const trayCell=target?.closest?.('[data-jigsaw-piece]');
  const trayElement=target?.closest?.('.jigsaw-tray-wrap');
  if(slotElement){
   // Dragging only changes placement. It never rotates a piece.
   movePieceToBoard(drag.id,Number(slotElement.dataset.jigsawSlot));
  }else if(trayCell&&drag.source==='tray'){
   const from=tray.indexOf(drag.id),to=tray.indexOf(Number(trayCell.dataset.jigsawPiece));
   if(from>=0&&to>=0&&from!==to){
    const next=[...tray];const [moved]=next.splice(from,1);next.splice(to,0,moved);setTray(next);
   }
  }else if(trayElement&&drag.source==='board'){
   const slot=placements.indexOf(drag.id);
   if(slot>=0)returnToTray(slot);
  }
  setDragged(null);
 };
 const handleTouchPointerCancel=e=>{
  if(touchDragRef.current?.pointerId===e.pointerId)touchDragRef.current=null;
  suppressTouchClickRef.current=Date.now();
  setDragged(null);
 };
 const handlePieceClick=callback=>(e)=>{
  if(suppressTouchClickRef.current&&Date.now()-suppressTouchClickRef.current<250){
   e.preventDefault();e.stopPropagation();return;
  }
  suppressTouchClickRef.current=0;
  callback?.(e);
 };
 const selectBoardSlot=slot=>{
  const piece=placements[slot];
  if(selectedPiece){
   if(selectedPiece.source==='board'&&selectedPiece.id===piece){setSelectedPiece(null);return;}
   swapSelectedWith({source:'board',id:piece,index:slot});
   return;
  }
  if(piece!=null)setSelectedPiece({source:'board',id:piece,index:slot});
 };
 const handleNativeDragEnd=()=>{
  suppressTouchClickRef.current=Date.now();
  setDragged(null);
 };
 const handleDropOnBoard=(e,slot)=>{e.preventDefault();let item=dragged;if(!item){const raw=e.dataTransfer.getData('text/plain');if(raw.startsWith('piece:'))item={id:Number(raw.slice(6))};}if(item)movePieceToBoard(item.id,slot);setDragged(null);};
 const handleDropOnTray=e=>{e.preventDefault();let item=dragged;if(!item){const raw=e.dataTransfer.getData('text/plain');if(raw.startsWith('piece:'))item={id:Number(raw.slice(6))};}if(item){const slot=placements.indexOf(item.id);if(slot>=0)returnToTray(slot);}setDragged(null);};
 const handleDropOnTrayPiece=(e,targetPiece)=>{e.preventDefault();e.stopPropagation();let item=dragged;if(!item){const raw=e.dataTransfer.getData('text/plain');if(raw.startsWith('piece:'))item={id:Number(raw.slice(6))};}if(!item||item.id===targetPiece)return;const from=tray.indexOf(item.id),to=tray.indexOf(targetPiece);if(from>=0&&to>=0){const next=[...tray];const [moved]=next.splice(from,1);next.splice(to,0,moved);setTray(next);}else if(placements.includes(item.id)){const slot=placements.indexOf(item.id);returnToTray(slot);}setDragged(null);};
 if(phase==='ready')return <><main className="game-intro puzzle-intro jigsaw-intro"><button className="back-link" onClick={onHome}>Tất cả trò chơi</button><div className="intro-card puzzle-intro-card"><div className="intro-icon"><Icon name="puzzle" size={48}/></div><div className="eyebrow">JIGSAW PUZZLE · THƠM PLAYGROUND</div><h1>Mảnh Ghép Nhà Thơm</h1><p>Một bức hình đã bị chia thành nhiều mảnh nhỏ. Hãy tìm đúng vị trí, xoay và ghép lại để bức hình của chú Thơm hiện ra nhé!</p><div className="new-game-rules"><span><Icon name="hand"/> Kéo thả hoặc chạm hai mảnh để đổi chỗ, ghép chú Thơm lại nào!</span><span><Icon name="rotate"/> Đổi chỗ thì mảnh vẫn giữ nguyên hướng nha. Muốn xoay, chim cá dùng nút trái hoặc phải nhé!</span><span><Icon name="target"/> Đưa tất cả mảnh về đúng vị trí và đúng hướng để hoàn thành.</span><span><Icon name="layers"/> Thắng cấp độ Dễ để mở khóa cấp độ Khó.</span></div><div className="puzzle-difficulty-guide"><span><b>Dễ</b> · 3×3</span><span><b>Khó</b> · 5×5 · Mở sau khi thắng Dễ</span></div>
  
  {album.length?<div className="puzzle-level-grid">{album.map((image,index)=><JigsawLevelCard key={image.id} image={image} index={index} record={jigsawProgress[image.id]||{}} onChoose={begin}/>)}</div>:<p className="puzzle-empty-album">Chưa có hình trong album. Admin hãy thêm ảnh vào Mảnh Ghép Nhà Thơm.</p>}
 </div></main></>;
 const stats=[{label:'Số thao tác',value:moves},{label:'Thời gian',value:fmt(seconds)},{label:'Level',value:album.findIndex(x=>x.id===chosen?.id)>=0?`Level ${String(album.findIndex(x=>x.id===chosen.id)+1).padStart(2,'0')}`:'—'},{label:'Độ khó',value:difficultyName[difficulty]}];
 return <><Frame game={GAME_META.jigsaw} onHome={onHome} onReset={reset} onRestart={onRestart} stats={stats}>
  <div className="jigsaw-game-toolbar"><span>{total} mảnh jigsaw</span></div>
  <div className="jigsaw-board jigsaw-real-board" style={{'--jigsaw-n':n}} aria-label={`Bàn ghép hình jigsaw ${n} nhân ${n}`}>
   {placements.map((piece,slot)=> <div key={slot} className={`jigsaw-target-slot ${piece!=null?'occupied':''}`} data-jigsaw-slot={slot} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropOnBoard(e,slot)} onClick={handlePieceClick(()=>selectBoardSlot(slot))} aria-label={`Vị trí ghép ${slot+1}`}>
    {piece==null?<JigsawPieceGraphic piece={slot} size={n} imageSrc={imageSrc} outline/>:<JigsawPieceButton piece={piece} size={n} imageSrc={imageSrc} rotation={rotations[piece]||0} selected={selectedPiece?.source==='board'&&selectedPiece.id===piece} source="board" dragging={dragged?.id===piece&&dragged?.source==='board'} onClick={handlePieceClick(e=>{e.stopPropagation();selectBoardSlot(slot);})} onPointerDown={handleTouchPointerDown(piece,'board',slot)} onPointerMove={handleTouchPointerMove} onPointerUp={handleTouchPointerUp} onPointerCancel={handleTouchPointerCancel} onDragStart={e=>{e.stopPropagation();setDragged({id:piece,source:'board'});e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',`piece:${piece}`);}} onDragEnd={handleNativeDragEnd}/>}
   </div>)}
  </div>
  <div className="jigsaw-piece-tools jigsaw-board-actions">
   <button type="button" disabled={!selectedPiece||phase!=='playing'} onClick={()=>rotateSelected(-90)}><Icon name="rotate-ccw" size={16}/> Xoay trái</button>
   <button type="button" disabled={!selectedPiece||phase!=='playing'} onClick={()=>rotateSelected(90)}><Icon name="rotate-cw" size={16}/> Xoay phải</button>
   <button type="button" onClick={()=>setShowSample(true)}><Icon name="image" size={16}/> Xem hình mẫu</button>
  </div>
  {layout==='tray'&&<div className="jigsaw-tray-wrap" onDragOver={e=>e.preventDefault()} onDrop={handleDropOnTray}>
   <div className="jigsaw-tray-heading"><b>Khay mảnh ghép</b><small>{tray.length} mảnh còn lại · Chọn mảnh rồi chọn vị trí, hoặc kéo thả</small></div>
   <div className={`jigsaw-tray jigsaw-real-tray difficulty-${difficulty}`}>
    {tray.map(piece=><div className="jigsaw-tray-cell" key={piece} data-jigsaw-piece={piece} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropOnTrayPiece(e,piece)}>
     <JigsawPieceButton piece={piece} size={n} imageSrc={imageSrc} rotation={rotations[piece]||0} selected={selectedPiece?.source==='tray'&&selectedPiece.id===piece} dragging={dragged?.id===piece&&dragged?.source==='tray'} onClick={handlePieceClick(()=>selectTrayPiece(piece))} onPointerDown={handleTouchPointerDown(piece,'tray')} onPointerMove={handleTouchPointerMove} onPointerUp={handleTouchPointerUp} onPointerCancel={handleTouchPointerCancel} onDragStart={e=>{setDragged({id:piece,source:'tray'});e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',`piece:${piece}`);}} onDragEnd={handleNativeDragEnd}/>
    </div>)}
   </div>
  </div>}
  <p className="jigsaw-touch-hint">Chạm hai mảnh để đổi chỗ. Chọn mảnh rồi xoay trái hoặc phải.</p>
  {showSample&&<div className="overlay jigsaw-sample-overlay" onClick={()=>setShowSample(false)}><div className="result-card jigsaw-sample-modal" onClick={e=>e.stopPropagation()}><button className="close-modal" onClick={()=>setShowSample(false)} aria-label="Đóng"><Icon name="close"/></button><h2>Hình gốc cần ghép</h2><img src={chosen?.url||DEFAULT_IMAGE} alt="Ảnh gốc đầy đủ của Level"/></div></div>}
  {phase==='won'&&showWinImage&&createPortal(<div className="overlay jigsaw-unlocked-overlay" role="dialog" aria-modal="true" aria-label="Ghép hình thành công"><div className="result-card jigsaw-result"><button type="button" className="image-review-close" onClick={closeWinImage} aria-label="Đóng hình gốc, xem bảng thành tích"><Icon name="close" size={19}/></button><Icon name="trophy" size={42}/><h2>Ghép thành công!</h2><RewardReveal/>{hasNews('photo','jigsaw',chosen?.id)&&<p>Thêm một chú Thơm vào bộ sưu tập của chim cá nè!</p>}<img className="jigsaw-unlocked-full-image" src={chosen?.url||DEFAULT_IMAGE} onClick={()=>setShowWinImagePreview(true)} role="button" tabIndex={0} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setShowWinImagePreview(true);}}} alt="Nhấn để xem ảnh gốc đầy đủ đã mở khóa"/><p>{difficultyName[difficulty]} · {moves} thao tác · {fmt(seconds)}</p><button type="button" className="primary-button" onClick={openCollection}>Bộ sưu tập hình ảnh</button></div></div>,document.body)}
  {showWinImagePreview&&chosen&&createPortal(<div className="overlay puzzle-collection-overlay puzzle-collection-preview-overlay unlocked-image-preview-overlay" onClick={event=>{event.preventDefault();event.stopPropagation();setShowWinImagePreview(false);}}><div className="result-card puzzle-collection-modal" onClick={event=>event.stopPropagation()}><button type="button" className="close-modal" onClick={event=>{event.preventDefault();event.stopPropagation();setShowWinImagePreview(false);}} aria-label="Đóng hình"><Icon name="close" size={19}/></button><h2>Ảnh đã mở khóa</h2><img src={chosen.url||DEFAULT_IMAGE} alt="Ảnh gốc đầy đủ đã mở khóa"/></div></div>,document.body)}{phase==='paused'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="save" size={36}/></span><h2>Chim cá còn một ván đang đợi nè!</h2><p>Vị trí mảnh ghép, hướng xoay và thời gian đã được lưu.</p><button className="primary-button" onClick={()=>setPhase(resumeRef.current)}>Chơi tiếp ván trước</button><button className="text-button" onClick={reset}>Chọn Level khác / chơi mới</button></div></div>}
 </Frame></>;
}

export { JigsawGame };
