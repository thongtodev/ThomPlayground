import { renderSlotImage } from '../imageTransforms';
import { DEFAULT_IMAGE } from '../assetStore';
import {levelLabel} from '../levelLabels';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { canPlayPuzzleDifficulty } from '../puzzleProgress';
import Icon from '../Icon';
import { loadGameSession, saveGameSession, clearGameSession, restoredPhase, resumePhase } from '../gameSessions';
import { fmtTime } from '../utils/gameFormatting.js';
import { GameFrame } from '../components/GameUI.jsx';
import { GAMES } from './catalog.js';

const shuffleMoves = (n, count) => { let a=Array.from({length:n*n},(_,i)=>i); let blank=n*n-1, prev=-1; for(let k=0;k<count;k++){ const valid=[blank-n,blank+n,...(blank%n>0?[blank-1]:[]),...(blank%n<n-1?[blank+1]:[])].filter(x=>x>=0&&x<n*n&&x!==prev); const next=valid[Math.floor(Math.random()*valid.length)]; [a[blank],a[next]]=[a[next],a[blank]]; prev=blank; blank=next; } return a.every((v,i)=>v===i)?shuffleMoves(n,count+1):a; };

function PuzzleLevelCard({image,index,record={},onChoose}) {
 const easyDone=Boolean(record.easy),hardDone=Boolean(record.hard);
 return <article className="puzzle-level-card">
  <div className="puzzle-level-copy"><b>Level {String(index+1).padStart(2,'0')}</b></div>
  <div className="puzzle-level-actions">
   <button type="button" className="puzzle-difficulty-button easy" onClick={()=>onChoose(image,'easy')}>{easyDone?'Chơi lại Dễ':'Dễ · 3×3'}</button>
   <button type="button" className="puzzle-difficulty-button hard" disabled={!easyDone} title={easyDone?'':'Hoàn thành cấp độ Dễ để mở khóa'} onClick={()=>onChoose(image,'hard')}>{hardDone?'Chơi lại Khó':easyDone?'Khó · 5×5':<><Icon name="lock" size={13}/> Khó</>}</button>
  </div>
 </article>;
}

function PuzzleGame({onAlbums,onHome,saveRecord,images:gameImages,album=[],onEvent,onResultReady,puzzleProgress={},onRestart,postResultActionsRef}) {
 const fallback=[{id:'default-thom',name:'Ảnh mặc định',url:DEFAULT_IMAGE}];
 const levels=album.length?album:fallback;
 const savedRef=useRef(loadGameSession('puzzle'));const snapshot=savedRef.current;const saved=snapshot && levelLabel(levels,`${snapshot.chosen?.id}-${snapshot.difficulty}`)?snapshot:null;const resumeRef=useRef(resumePhase(saved));
 const [phase,setPhase]=useState(()=>restoredPhase(saved)),[n,setN]=useState(()=>saved?.n||3),[difficulty,setDifficulty]=useState(()=>saved?.difficulty||'easy'),[tiles,setTiles]=useState(()=>saved?.tiles||[]),[moves,setMoves]=useState(()=>saved?.moves||0),[seconds,setSeconds]=useState(()=>saved?.seconds||0),[showSample,setShowSample]=useState(false),[chosen,setChosen]=useState(()=>saved?.chosen||null),[boardImage,setBoardImage]=useState(''),[showWinImage,setShowWinImage]=useState(false),[showWinImagePreview,setShowWinImagePreview]=useState(false),[winResult,setWinResult]=useState(null);
 const wonRef=useRef(false);
  const openCollection=event=>{event?.preventDefault?.();event?.stopPropagation?.();onAlbums('puzzle');};
  const closeWinImage=event=>{event?.preventDefault?.();event?.stopPropagation?.();setShowWinImage(false);onResultReady?.(winResult);};
 useEffect(()=>{if(phase!=='paused'&&phase!=='ready'&&phase!=='won')resumeRef.current=phase;},[phase]);
 useEffect(()=>{if(phase==='playing'||phase==='paused')saveGameSession('puzzle',{phase:phase==='paused'?resumeRef.current:phase,resumePhase:resumeRef.current,n,difficulty,tiles,moves,seconds,chosen});else clearGameSession('puzzle');},[phase,n,difficulty,tiles,moves,seconds,chosen]);
 const start=(image,mode='easy')=>{
  resumeRef.current='playing';if(!canPlayPuzzleDifficulty(puzzleProgress,image.id,mode))return;
  const size=mode==='easy'?3:5;
  wonRef.current=false;setWinResult(null);setShowWinImage(false);setShowWinImagePreview(false);setChosen(image);setBoardImage(image.url||DEFAULT_IMAGE);setDifficulty(mode);setN(size);setShowSample(false);
  setTiles(shuffleMoves(size,Math.max(45,size*size*(mode==='easy'?12:18))));setMoves(0);setSeconds(0);setPhase('playing');
 };
 // Apply the per-level crop in memory; the source image in the library is never changed.
 useEffect(()=>{if(!chosen)return;let cancelled=false;const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{
  if(cancelled)return;
  try{
   if(chosen.transform?.mode==='crop'){
    renderSlotImage(chosen.url,chosen.transform,1024).then(url=>{if(!cancelled)setBoardImage(url);}).catch(()=>{if(!cancelled)setBoardImage(chosen.url);});return;
   }
   const side=Math.min(image.naturalWidth,image.naturalHeight),x=(image.naturalWidth-side)/2,y=(image.naturalHeight-side)/2;
   const canvas=document.createElement('canvas');canvas.width=canvas.height=Math.min(1200,side);canvas.getContext('2d').drawImage(image,x,y,side,side,0,0,canvas.width,canvas.height);setBoardImage(canvas.toDataURL('image/webp',.92));
  }catch{setBoardImage(chosen.url);}
 };
 image.onerror=()=>{if(!cancelled)setBoardImage(DEFAULT_IMAGE);};image.src=chosen.url;
 return()=>{cancelled=true;};
 },[chosen]);
 useEffect(()=>{if(phase!=='playing')return;const t=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(t);},[phase]);
 const move=i=>{
  if(phase!=='playing'||wonRef.current)return;
  const blank=tiles.indexOf(n*n-1),sameRow=Math.floor(i/n)===Math.floor(blank/n);
  if(!((sameRow&&Math.abs(i-blank)===1)||Math.abs(i-blank)===n))return;
  const next=[...tiles];[next[i],next[blank]]=[next[blank],next[i]];setTiles(next);setMoves(m=>m+1);
  if(next.every((v,j)=>v===j)){
   wonRef.current=true;setShowWinImage(true);setPhase('won');saveRecord('puzzle',{label:`${moves+1} bước`,value:moves+1,kind:'steps'});
   const variant=`${chosen.id}-${difficulty}`;
   const variantLabel=levelLabel(levels,variant);
   const result={gameId:'puzzle',gameName:'Ghép Thơm Đi!',title:'Ghép hình thành công!',summary:`${variantLabel} · ${moves+1} bước · ${fmtTime(seconds)}.`,variant,variantLabel,metricKind:'steps',metricValue:moves+1,metricLabel:`${moves+1} bước`,eligible:true,details:{imageId:chosen.id,difficulty,moves:moves+1,seconds}};
   setWinResult(result);
   if(postResultActionsRef)postResultActionsRef.current={
    nextLabel:'Chơi Level tiếp theo',
    next:()=>{
     const currentIndex=levels.findIndex(item=>item.id===chosen.id);
     const nextImage=difficulty==='easy'?chosen:levels[(currentIndex+1+levels.length)%levels.length];
     const nextMode=difficulty==='easy'?'hard':'easy';
     start(nextImage,nextMode,true);
    },
    choose:reset
   };
   onEvent({type:'puzzle_level_win',n,difficulty,imageId:chosen.id,completed:'puzzle',result});
  }
 };
 const reset=()=>{wonRef.current=false;setWinResult(null);setShowWinImage(false);setShowWinImagePreview(false);setChosen(null);setPhase('ready');};
 if(phase==='ready')return <><main className="game-intro puzzle-intro"><button className="back-link" onClick={onHome}>Tất cả trò chơi</button><div className="intro-card puzzle-intro-card"><div className="intro-icon"><Icon name="puzzle" size={48}/></div><div className="eyebrow">SLIDING PUZZLE · THƠM PLAYGROUND</div><h1>Ghép Thơm Đi!</h1><p>Bức hình của chú Thơm bị xáo trộn mất rồi! Hãy trượt từng ô để đưa mọi thứ trở về đúng vị trí nhé!</p><div className="rules-list"><span><Icon name="hand"/> Chạm vào ô nằm cạnh ô trống để di chuyển.</span><span><Icon name="grid"/> Sắp xếp lại toàn bộ các ô để bức hình hoàn chỉnh.</span><span><Icon name="star"/> Hoàn thành cấp độ Dễ để mở khóa cấp độ Khó.</span></div><div className="puzzle-difficulty-guide"><span><b>Dễ</b> · 3×3</span><span><b>Khó</b> · 5×5 · Mở sau khi thắng Dễ</span></div>
  <div className="puzzle-level-grid">{levels.map((image,index)=><PuzzleLevelCard key={image.id} image={image} index={index} record={puzzleProgress[image.id]||{}} onChoose={start}/>)}</div>
 </div></main></>;
 return <><GameFrame game={GAMES[4]} images={gameImages} onHome={onHome} onReset={reset} onRestart={onRestart} stats={[{label:'Level',value:levelLabel(levels,`${chosen?.id}-${difficulty}`).split(' · ')[0]},{label:'Số bước',value:moves},{label:'Thời gian',value:fmtTime(seconds)},{label:'Độ khó',value:difficulty==='easy'?'Dễ · 3×3':'Khó · 5×5'}]} controls={<button className="small-select" onClick={()=>setShowSample(true)}><Icon name="image" size={16}/> Xem ảnh mẫu</button>}>
 <div className="puzzle-area"><div className="puzzle-board" style={{'--n':n}}>{tiles.map((v,i)=><button key={i} className={`puzzle-tile ${v===n*n-1?'empty':''}`} onClick={()=>move(i)} style={v===n*n-1?{}:{backgroundImage:`url("${boardImage||DEFAULT_IMAGE}")`,backgroundSize:`${n*100}% ${n*100}%`,backgroundPosition:`${(v%n)/(n-1)*100}% ${Math.floor(v/n)/(n-1)*100}%`}} aria-label={v===n*n-1?'Ô trống':`Mảnh ${v+1}`}/>)}</div><p className="puzzle-hint">Chọn một ô cạnh ô trống để đưa bức hình về đúng chỗ nhé!</p></div>
 {showSample&&<div className="overlay" onClick={()=>setShowSample(false)}><div className="result-card sample-card" onClick={e=>e.stopPropagation()}><button className="close-modal" onClick={()=>setShowSample(false)} aria-label="Đóng"><Icon name="close" size={18}/></button><h3>Ảnh mẫu</h3><div className="sample-placeholder puzzle-sample-square"><img src={boardImage||DEFAULT_IMAGE} onError={e=>{e.currentTarget.src=DEFAULT_IMAGE;}} alt="Ảnh mẫu của Level"/></div><details className="puzzle-original"><summary>Xem ảnh gốc đầy đủ</summary><img src={chosen?.url||DEFAULT_IMAGE} onError={e=>{e.currentTarget.src=DEFAULT_IMAGE;}} alt="Ảnh gốc chưa crop"/></details></div></div>}
 {phase==='won'&&showWinImage&&createPortal(<div className="overlay puzzle-win-overlay" role="dialog" aria-modal="true" aria-label="Ghép hình thành công"><div className="result-card puzzle-win-result"><button type="button" className="image-review-close" onClick={closeWinImage} aria-label="Đóng hình gốc, xem bảng thành tích"><Icon name="close" size={19}/></button><span className="result-emoji"><Icon name="puzzle" size={36}/></span><h2>Ghép hình thành công!</h2><img className="puzzle-unlocked-full-image" src={chosen?.url||DEFAULT_IMAGE} onClick={()=>setShowWinImagePreview(true)} role="button" tabIndex={0} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setShowWinImagePreview(true);}}} onError={e=>{e.currentTarget.src=DEFAULT_IMAGE;}} alt="Nhấn để xem ảnh gốc đầy đủ đã mở khóa"/><p>Level đã được thêm vào bộ sưu tập. Hoàn thành {difficulty==='easy'?'cấp độ Dễ 3×3':'cấp độ Khó 5×5'} trong {moves} bước và {fmtTime(seconds)}.</p><button type="button" className="primary-button" onClick={openCollection}>Bộ sưu tập hình ảnh</button></div></div>,document.body)}
 {showWinImagePreview&&chosen&&createPortal(<div className="overlay puzzle-collection-overlay puzzle-collection-preview-overlay unlocked-image-preview-overlay" onClick={event=>{event.preventDefault();event.stopPropagation();setShowWinImagePreview(false);}}><div className="result-card puzzle-collection-modal" onClick={event=>event.stopPropagation()}><button type="button" className="close-modal" onClick={event=>{event.preventDefault();event.stopPropagation();setShowWinImagePreview(false);}} aria-label="Đóng hình"><Icon name="close" size={19}/></button><h2>Ảnh đã mở khóa</h2><img src={chosen.url||DEFAULT_IMAGE} alt="Ảnh gốc đầy đủ đã mở khóa"/></div></div>,document.body)}{phase==='paused'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="save" size={36}/></span><h2>Bạn còn một ván đang chơi dở</h2><p>Ảnh, vị trí các ô, số bước và thời gian đã được lưu.</p><button className="primary-button" onClick={()=>setPhase(resumeRef.current)}>Tiếp tục ván trước</button><button className="text-button" onClick={reset}>Chọn Level khác / chơi mới</button></div></div>}
 </GameFrame></>;
}

function PuzzleCollectionTile({image,index,record,onOpen}){
 const [preview,setPreview]=useState(image?.url||DEFAULT_IMAGE);const transformKey=JSON.stringify(image?.transform||null);
 useEffect(()=>{let active=true;if(!image?.url){setPreview(DEFAULT_IMAGE);return()=>{active=false;};}setPreview(image.url);if(image.transform?.mode==='crop')renderSlotImage(image.url,image.transform,360).then(url=>{if(active)setPreview(url);}).catch(()=>{});return()=>{active=false;};},[image?.url,transformKey]);
 const unlocked=Boolean(record?.easy||record?.hard);
 return <button type="button" className={`puzzle-collection-tile ${unlocked?'unlocked':'locked'}`} disabled={!unlocked||!image?.url} onClick={()=>onOpen({...image,previewUrl:preview,record})}>
  <div className="puzzle-collection-art">
   {image?.url?<img src={preview} alt={`Ảnh Level ${index+1}`} />:<span className="puzzle-collection-placeholder"><Icon name="image" size={38}/></span>}
   {!unlocked&&<div className="puzzle-collection-mask"><span><Icon name="lock" size={20}/></span><b>Hoàn thành để mở khóa</b></div>}
  </div>
  <b>Level {String(index+1).padStart(2,'0')}</b><small>{unlocked?`${record.easy?'Dễ đã đạt':''}${record.easy&&record.hard?' · ':''}${record.hard?'Khó đã đạt':''}`:'Chưa mở khóa'}</small>
 </button>;
}

export function PuzzleAlbum({album=[],progress={}}){
 const [viewPuzzle,setViewPuzzle]=useState(null);
 return <><div className="puzzle-collection-grid">{album.map((entry,index)=><PuzzleCollectionTile key={entry.id} image={entry} index={index} record={progress[entry.id]||{}} onOpen={setViewPuzzle}/>)}</div>{viewPuzzle&&createPortal(<div className="overlay puzzle-collection-overlay puzzle-collection-preview-overlay" onClick={event=>{event.preventDefault();event.stopPropagation();setViewPuzzle(null);}}><div className="result-card puzzle-collection-modal" onClick={e=>e.stopPropagation()}><button type="button" className="close-modal" onClick={event=>{event.preventDefault();event.stopPropagation();setViewPuzzle(null);}} aria-label="Đóng hình"><Icon name="close" size={19}/></button><h2>Ảnh đã mở khóa</h2><img src={viewPuzzle.url||DEFAULT_IMAGE} alt="Ảnh gốc đã mở khóa"/><p>{viewPuzzle.record?.easy?'Đã hoàn thành cấp độ Dễ. ':''}{viewPuzzle.record?.hard?'Đã hoàn thành cấp độ Khó.':''}</p></div></div>,document.body)}</>;
}

export { PuzzleGame };
