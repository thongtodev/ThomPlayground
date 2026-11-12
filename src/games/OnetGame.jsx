import {useRoundFeedback,useNearFinish,useOnetMotion,NewPhotoBadge,UnlockMarker,markNews,seePhoto} from '../effects/ProgressEffects';
import {useGameJuice, gameEffect, usePieceMotion, RewardReveal} from '../effects/GameEffects.jsx';
import { getOnetUnlockCount, drawOnetPhotos, onetProgress, onetScore, totalOnetScore } from '../onetRewards';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_IMAGE } from '../assetStore';
import Icon from '../Icon';
import { renderSlotImage } from '../imageTransforms';
import { ONET_LEVELS, ONET_COLS, ONET_ROWS, createBoard, availablePairs, findPath, removePair, shuffleBoard, gravityPreview, zoneDirections, gravityAt } from '../onetEngine';
import { loadGameSession, saveGameSession, clearGameSession, restoredPhase, resumePhase } from '../gameSessions';

const PROGRESS_KEY='thom-onet-progress-v1';

export const getSaved=()=>{try{return onetProgress(JSON.parse(localStorage.getItem(PROGRESS_KEY))||{});}catch{return onetProgress();}};

const clock=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

const directionName=d=>d.startsWith('zones')?'Bốn vùng':({rows:'Hàng lẻ trái / chẵn phải',columns:'Cột lẻ lên / chẵn xuống',out:'Hai nửa dồn ra mép',in:'Hai nửa dồn vào giữa',none:'Bàn cố định',left:'Dồn trái',right:'Dồn phải',up:'Dồn lên',down:'Dồn xuống'})[d]||'Thay đổi hướng';

const gameInfo={id:'onet',name:'Nối Thơm Đi!',en:'ONET CONNECT · 20 LEVEL',icon:'link',desc:'Nối hai ảnh giống nhau bằng đường đi không quá 2 lần rẽ. Xóa hết 24 cặp trước khi hết giờ!'};

function OnetGame({onAlbums,onHome,playSound=()=>{},saveRecord,onEvent,onResultReady,images={},album=[],onRestart,postResultActionsRef}){
 const sessionRef=useRef(loadGameSession('onet'));const session=sessionRef.current;const resumeRef=useRef(resumePhase(session));
 const [saved,setSaved]=useState(getSaved);
 const [roundPhotoIds,setRoundPhotoIds]=useState(()=>session?.photoIds||[]);
 const [newlyUnlocked,setNewlyUnlocked]=useState([]);
 const [showWinImage,setShowWinImage]=useState(false),[viewingUnlockedPhoto,setViewingUnlockedPhoto]=useState(null);
 const [level,setLevel]=useState(()=>session?.level||1),[phase,setPhase]=useState(()=>restoredPhase(session));
 const [board,setBoard]=useState(()=>session?.board||[]),[seconds,setSeconds]=useState(()=>session?.seconds??360),[matched,setMatched]=useState(()=>session?.matched||0);
 const [hints,setHints]=useState(()=>session?.hints??5),[shuffles,setShuffles]=useState(()=>session?.shuffles??2),[hintsUsed,setHintsUsed]=useState(()=>session?.hintsUsed||0);
 const [selected,setSelected]=useState(null),[hint,setHint]=useState(null),[line,setLine]=useState(null),[notice,setNotice]=useState('');
 const [invalidPair,setInvalidPair]=useState(null);
 const [score,setScore]=useState(()=>session?.score||0),[wonScore,setWonScore]=useState(0),[winResult,setWinResult]=useState(null);
 useEffect(()=>{if(phase!=='paused'&&phase!=='ready'&&phase!=='won'&&phase!=='lost')resumeRef.current=phase;},[phase]);
 useEffect(()=>{if(phase==='playing'||phase==='paused')saveGameSession('onet',{phase:phase==='paused'?resumeRef.current:phase,resumePhase:resumeRef.current,level,board,seconds,matched,hints,shuffles,hintsUsed,score,photoIds:roundPhotoIds});else clearGameSession('onet');},[phase,level,board,seconds,matched,hints,shuffles,hintsUsed,score,roundPhotoIds]);
 useRoundFeedback(phase,seconds,'.onet-board-wrap',level);
 useOnetMotion(board,phase);
 const lastMatchAt=useRef(0),chain=useRef(0);
 const busy=useRef(false),animation=useRef(null),hintTimer=useRef(null),invalidTimer=useRef(null);
 const settings=ONET_LEVELS[level-1];
  const openCollection=event=>{event?.preventDefault?.();event?.stopPropagation?.();onAlbums('onet');};
  const closeWinImage=event=>{event?.preventDefault?.();event?.stopPropagation?.();setShowWinImage(false);onResultReady?.(winResult);};
 const availablePhotos=useMemo(()=>album.filter(x=>x?.url&&x.id!=='default-thom'),[album]);
 const roundPhotos=useMemo(()=>{const selected=roundPhotoIds.map(id=>availablePhotos.find(photo=>photo.id===id)).filter(Boolean);return selected.length?selected:availablePhotos.slice(0,Math.min(settings.types,availablePhotos.length));},[roundPhotoIds,availablePhotos,settings.types]);
 const [croppedUrls,setCroppedUrls]=useState([]);
 useEffect(()=>{
  let active=true;
  setCroppedUrls(availablePhotos.map(photo=>photo.url));
  Promise.all(availablePhotos.map(photo=>renderSlotImage(photo.url,photo.transform,256).catch(()=>photo.url)))
   .then(urls=>{if(active)setCroppedUrls(urls);});
  return()=>{active=false;};
 },[availablePhotos]);
 const start=(target=level)=>{
  resumeRef.current='playing';if(animation.current)clearTimeout(animation.current);if(hintTimer.current)clearTimeout(hintTimer.current);if(invalidTimer.current)clearTimeout(invalidTimer.current);
  chain.current=0;lastMatchAt.current=0;busy.current=false;const c=ONET_LEVELS[target-1];
  const shuffledPhotos=[...availablePhotos];for(let i=shuffledPhotos.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffledPhotos[i],shuffledPhotos[j]]=[shuffledPhotos[j],shuffledPhotos[i]];}
  const photoCount=availablePhotos.length?Math.min(c.types,availablePhotos.length):c.types;const selectedPhotos=shuffledPhotos.slice(0,photoCount);
  setRoundPhotoIds(selectedPhotos.map(photo=>photo.id));setNewlyUnlocked([]);setWinResult(null);setShowWinImage(false);setViewingUnlockedPhoto(null);
  setLevel(target);setBoard(createBoard(target,photoCount));setSeconds(c.time);setHints(c.hints);setShuffles(c.shuffles);
  setMatched(0);setScore(0);setWonScore(0);setHintsUsed(0);setSelected(null);setInvalidPair(null);setHint(null);setLine(null);setNotice('');setPhase('playing');
 };
 useEffect(()=>()=>{clearTimeout(animation.current);clearTimeout(hintTimer.current);clearTimeout(invalidTimer.current);},[]);
 useEffect(()=>{if(phase!=='playing')return;const timer=setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000);return()=>clearInterval(timer);},[phase]);
 useEffect(()=>{if(phase==='playing'&&seconds===0){clearTimeout(animation.current);setPhase('lost');busy.current=true;setSelected(null);setLine(null);onEvent({type:'onet_loss',level,score,matched,completed:undefined,result:{gameId:'onet',gameName:'Nối Thơm Đi!',title:'Hết giờ mất rồi, mình thử lại nha!',summary:`Level ${level} · Đã ghép ${matched}/24 cặp · ${score.toLocaleString('vi-VN')} dép.`,variant:`level-${level}`,variantLabel:`Level ${level}`,metricKind:'score',metricValue:score,metricLabel:`${score.toLocaleString('vi-VN')} dép`,eligible:false,details:{level,score,matched,won:false}}});}},[seconds,phase,level,score,matched,onEvent]);
 const chooseLevels=()=>{clearTimeout(animation.current);clearTimeout(hintTimer.current);clearTimeout(invalidTimer.current);busy.current=false;setShowWinImage(false);setViewingUnlockedPhoto(null);setPhase('ready');setSelected(null);setInvalidPair(null);setLine(null);};
 const choose=(index)=>{
  if(phase!=='playing'||busy.current||board[index]==null)return;
  if(selected===null){setSelected(index);return;}
  if(index===selected){setSelected(null);return;}
  const path=findPath(board,selected,index);
  if(!path){
   // Never animate the image itself on an invalid pick. It must remain visible.
   clearTimeout(invalidTimer.current);setInvalidPair([selected,index]);
   invalidTimer.current=setTimeout(()=>setInvalidPair(null),380);
   playSound(180,.06);setSelected(index);
   setNotice(board[selected]===board[index]?'Hai chú đúng đôi rồi mà đường đang bị chắn, tìm đôi khác nha!':'Úi, hai chú này chưa giống nhau đâu. Chim cá nhìn lại xíu nha!');return;
  }
  const now=performance.now();chain.current=now-lastMatchAt.current<4000?chain.current+1:1;lastMatchAt.current=now;
  // Spark on the tile surface; never fade an <img> that React may reuse.
  [selected,index].forEach(i=>gameEffect({type:'spark',element:document.querySelectorAll('.onet-cell')[i]}));
  if(chain.current%3===0)gameEffect({type:'spark',selector:'.onet-progress-track',label:'Đúng đôi rồi nè!'});playSound(740,.06);
  busy.current=true;clearTimeout(invalidTimer.current);setInvalidPair(null);setLine(path);setHint(null);setSelected(null);setNotice('');
  animation.current=setTimeout(()=>{
   const count=matched+1,nextScore=score+100;
   let next=removePair(board,selected,index,level,matched);
   setLine(null);setMatched(count);setScore(nextScore);
   if(count===24){
    const final=onetScore(level,seconds);setWonScore(final);setBoard(next);setShowWinImage(true);setPhase('won');
    const latest=getSaved();
    const unlockedPhotos=drawOnetPhotos(availablePhotos,latest.collection,level);
    const newIds=unlockedPhotos.filter(photo=>photo.isNew).map(photo=>photo.id);
    markNews('photo','onet',newIds);if(level<20&&level+1>latest.unlocked){markNews('level','onet',[level+1]);gameEffect({type:'message',label:'Mở thêm một màn rồi nè, chim cá thử tiếp nha!',duration:2200});}
    const nextCollection=[...new Set([...latest.collection,...unlockedPhotos.map(photo=>photo.id)])];
    const nextSaved={scoreVersion:2,unlocked:Math.max(latest.unlocked,Math.min(20,level+1)),best:{...latest.best,[level]:Math.max(latest.best[level]||0,final)},collection:nextCollection};
    setNewlyUnlocked(unlockedPhotos);localStorage.setItem(PROGRESS_KEY,JSON.stringify(nextSaved));setSaved(nextSaved);
    const total=totalOnetScore(nextSaved.best);
    const gain=total-totalOnetScore(latest.best);
    saveRecord('onet',{label:`${total.toLocaleString('vi-VN')} dép`,value:total,kind:'score'});
    const result={gameId:'onet',gameName:'Nối Thơm Đi!',title:`Hoàn thành Level ${level}!`,summary:`Level ${level}: ${final.toLocaleString('vi-VN')} dép · Còn ${clock(seconds)} · Tổng cá nhân: ${total.toLocaleString('vi-VN')} dép (+${gain}).`,variant:`level-${level}`,variantLabel:`Level ${level}`,metricKind:'score',metricValue:final,metricLabel:`${final.toLocaleString('vi-VN')} dép`,eligible:true,details:{scoreVersion:2,level,score:final,secondsLeft:seconds,hintsUsed,rewardImageIds:unlockedPhotos.map(photo=>photo.id),unlockedImageIds:newIds,newlyUnlockedCount:newIds.length}};
    setWinResult(result);
    if(postResultActionsRef)postResultActionsRef.current={
     nextLabel:level<20?`Chơi Level ${level+1}`:'Chơi lại từ Level 1',
     next:()=>start(level<20?level+1:1),
     choose:chooseLevels
    };
    onEvent({type:'onet_win',collected:nextCollection.length,level,score:final,total,noHint:hintsUsed===0,completed:'onet',result});
   }else{
    if(availablePairs(next,1).length===0){next=shuffleBoard(next,level,count);setNotice('Hết đôi nối được rồi, chú xáo lại miễn phí nha!');}
    setBoard(next);
   }
   busy.current=false;
  },240);
 };
 const useHint=()=>{
  if(phase!=='playing'||busy.current||hints<=0)return;
  const move=availablePairs(board,1)[0];if(!move){setNotice('Đang xáo trộn để tìm nước đi…');setBoard(shuffleBoard(board,level,matched));return;}
  setHints(h=>h-1);setHintsUsed(h=>h+1);setHint([move.a,move.b]);setNotice('Chú tìm thấy một đôi rồi nè, chim cá nhìn hai ô sáng nha!');
  clearTimeout(hintTimer.current);hintTimer.current=setTimeout(()=>setHint(null),2300);
 };
 const useShuffle=()=>{
  if(phase!=='playing'||busy.current||shuffles<=0)return;
  setShuffles(s=>s-1);clearTimeout(invalidTimer.current);setInvalidPair(null);setSelected(null);setHint(null);setBoard(shuffleBoard(board,level,matched));setNotice('Bàn cờ đã được xáo trộn, tìm cặp mới nào!');
 };
 const gameImage=(type)=>{const photo=roundPhotos[type];if(!photo)return DEFAULT_IMAGE;const index=availablePhotos.findIndex(item=>item.id===photo.id);return croppedUrls[index]||photo.url||DEFAULT_IMAGE;};
 const isDefaultImage=(type)=>!roundPhotos[type];
 const levelDescription=n=>{
  const advanced=['Hàng lẻ dồn trái, hàng chẵn dồn phải','Cột lẻ dồn lên, cột chẵn dồn xuống','Hai nửa dồn ra mép','Hai nửa dồn vào giữa','Đổi ra mép / vào giữa mỗi 4 cặp','Bốn vùng dồn theo bốn hướng','Bốn vùng xoay hướng mỗi 6 cặp','Bốn vùng xoay hướng mỗi 4 cặp','Đổi dồn theo hàng / cột mỗi 4 cặp','Ba chặng: hàng, hai nửa, bốn vùng xoay'];
  if(n>10)return advanced[n-11];
  const cfg=ONET_LEVELS[n-1];return Array.isArray(cfg.gravity)?`Luân phiên ${cfg.gravity.map(directionName).join(' / ').toLowerCase()}`:directionName(cfg.gravity);
 };
 if(phase==='ready')return <><main className="game-intro onet-intro"><button className="back-link" onClick={onHome}>Tất cả trò chơi</button><div className="intro-card onet-intro-card"><div className="intro-icon"><Icon name="link" size={48}/></div><div className="eyebrow">ONET CONNECT · THƠM PLAYGROUND</div><h1>Nối Thơm Đi!</h1><p>Những chú Thơm giống nhau đang nằm rải rác khắp bàn cờ. Hãy tìm và nối từng cặp thật nhanh trước khi hết giờ nhé!</p><div className="rules-list"><span><Icon name="eye"/> Chim cá tìm hai chú Thơm giống nhau rồi chạm để nối nha!</span><span><Icon name="link"/> Đường nối không bị cản và có tối đa 2 góc rẽ.</span><span><Icon name="target"/> Ghép đủ 24 cặp để hoàn thành Level.</span><span><Icon name="flame"/> Level 11–20 có 195 giây. Xem hướng dồn trước khi nối.</span></div><div className="onet-info-chips"><span>6 × 8 ô</span><span>24 cặp</span><span>20 Level</span></div><h2 className="onet-level-title">Chọn Level <small>Đã mở {saved.unlocked}/20</small></h2><div className="onet-level-picker">{ONET_LEVELS.map((cfg,i)=>{const n=i+1,unlocked=n<=saved.unlocked;return <button key={n} type="button" className={`onet-level-button ${level===n?'chosen':''}`} disabled={!unlocked} onClick={()=>setLevel(n)} aria-label={`Level ${n}${unlocked?'':' chưa mở khóa'}`}><UnlockMarker game="onet" id={n}/><b>{unlocked?n:<Icon name="lock" size={15}/>}</b><small>{unlocked?clock(cfg.time):'Khóa'}</small></button>;})}</div><div className="onet-level-details"><strong>Level {level} · {clock(settings.time)}</strong><span>Thắng nhận {getOnetUnlockCount(level,2)} lượt bốc ảnh ngẫu nhiên. Có thể trùng ảnh đã có.</span><span>{levelDescription(level)} · {settings.hints} gợi ý · {settings.shuffles} xáo trộn</span>{saved.best[level]>0&&<span><Icon name="trophy" size={14}/> Kỷ lục: {saved.best[level].toLocaleString('vi-VN')} dép</span>}</div><div className="rules-list"><span><Icon name="check" size={14}/> Chỉ nối hai hình giống nhau nếu đường nối rẽ không quá 2 lần (có thể đi ngoài viền).</span><span><Icon name="check" size={14}/> Hết giờ sẽ thua. Không còn nước đi thì tự xáo trộn miễn phí.</span><span><Icon name="check" size={14}/> Thắng nhận 2.400 dép và tối đa 1.000 dép theo tỷ lệ thời gian còn lại. Bảng chung cộng kỷ lục từng Level.</span></div><button className="primary-button start-button" onClick={()=>start(level)}><Icon name="play" size={17}/> Chơi Level {level}</button></div></main></>;
 return <main className="game-page onet-page"><button className="back-link" onClick={onHome}>Trang chủ</button><div className="game-heading"><div><span className="eyebrow">ONET CONNECT · LEVEL {level}/20</span><h1>Nối Thơm Đi!</h1></div><button className="small-select" onClick={chooseLevels}>Chọn Level</button></div><div className="stats-row onet-stats"><div className="stat-box"><small>Thời gian</small><strong className={`fx-clock ${seconds<=30?'onet-danger':''}`}>{clock(seconds)}</strong></div><div className="stat-box"><small>Đã ghép</small><strong>{matched}/24</strong></div><div className="stat-box"><small>Dép</small><strong>{score}</strong></div><div className="stat-box"><small>Hướng dồn</small><strong className="onet-gravity-label">{directionName(gravityAt(level,matched))}</strong></div></div><div className="play-panel onet-panel"><div className="onet-actions"><button className="secondary-button" disabled={phase!=='playing'||hints===0} onClick={useHint}><Icon name="lightbulb" size={16}/> Gợi ý ({hints})</button><button className="secondary-button" disabled={phase!=='playing'||shuffles===0} onClick={useShuffle}><Icon name="dice" size={16}/> Xáo trộn ({shuffles})</button></div><div className="onet-rule-preview">{level>10&&<><b>{directionName(gravityAt(level,matched))}</b>{gravityAt(level,matched).startsWith('zones')&&<span className="onet-zone-map">{zoneDirections(gravityAt(level,matched)).map((d,i)=><span key={i} aria-label={['Trên trái','Trên phải','Dưới trái','Dưới phải'][i]+': '+directionName(d)}><svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" style={{transform:`rotate(${{right:0,down:90,left:180,up:270}[d]}deg)`}}><path d="M3 10h13m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2"/></svg></span>)}</span>}{gravityPreview(level,matched)>0&&<span>Còn {gravityPreview(level,matched)} cặp sẽ đổi hướng.</span>}</>}</div><div className="onet-board-wrap"><div className={`onet-board ${gravityAt(level,matched).startsWith('zones')?'onet-zones':''}`} role="grid" aria-label="Bàn Nối Thơm Đi! 6 cột 8 hàng">{board.map((type,i)=><button key={i} type="button" role="gridcell" className={`onet-cell ${type==null?'onet-empty':''} ${selected===i?'onet-selected':''} ${invalidPair?.includes(i)?'onet-invalid':''} ${hint?.includes(i)?'onet-hinted':''}`} disabled={type==null||phase!=='playing'} onClick={()=>choose(i)} aria-label={type==null?`Ô trống ${i+1}`:`Hình ${type+1}, hàng ${Math.floor(i/ONET_COLS)+1}, cột ${i%ONET_COLS+1}`} >{type!=null&&<><img key={type} src={gameImage(type)} alt="" draggable="false" onError={event=>{const img=event.currentTarget;if(!img.src.endsWith(DEFAULT_IMAGE))img.src=DEFAULT_IMAGE;}}/>{isDefaultImage(type)&&<span className="onet-tile-number">{type+1}</span>}</>}</button>)}</div>{line&&<svg className="onet-connection" viewBox={`0 0 ${ONET_COLS} ${ONET_ROWS}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={line.map(p=>`${p.c+0.5},${p.r+0.5}`).join(' ')} fill="none" stroke="#fff" strokeWidth=".14" strokeLinejoin="round" strokeLinecap="round"/><polyline points={line.map(p=>`${p.c+0.5},${p.r+0.5}`).join(' ')} fill="none" stroke="#f5bc42" strokeWidth=".08" strokeLinejoin="round" strokeLinecap="round"/></svg>}</div><div className="onet-progress-track"><span style={{width:`${matched/24*100}%`}}/></div><p className="onet-message" role="status">{notice||'Chạm hai hình giống nhau để nối. Đường đi được phép rẽ tối đa 2 lần.'}</p>{phase==='won'&&showWinImage&&createPortal(<div className="overlay onet-unlocked-overlay" role="dialog" aria-modal="true" aria-label="Hoàn thành Nối Thơm Đi!"><div className="result-card onet-unlocked-card"><button type="button" className="image-review-close" onClick={closeWinImage} aria-label="Đóng hình đã mở khóa, xem bảng thành tích"><Icon name="close" size={19}/></button><span className="result-emoji"><Icon name="trophy" size={36}/></span><h2>Hoàn thành Level {level}!</h2><p>Bạn ghép đủ 24 cặp trong {clock(settings.time-seconds)}. Dép Level này: <b>{wonScore.toLocaleString('vi-VN')}</b>.</p><button type="button" className="primary-button onet-open-collection-button" onClick={openCollection}>Bộ sưu tập hình ảnh</button>{newlyUnlocked.length>0?<><p className="onet-unlock-caption">Kết quả bốc ảnh · {newlyUnlocked.filter(photo=>photo.isNew).length} ảnh mới</p><RewardReveal/><div className="onet-unlocked-images">{newlyUnlocked.map((photo,draw)=><button type="button" className="onet-unlocked-image-button" key={draw} onClick={()=>setViewingUnlockedPhoto(photo)} aria-label="Xem ảnh phần thưởng ở kích thước đầy đủ"><img src={photo.url} alt="Ảnh phần thưởng"/><span>{photo.isNew?'Thêm một chú Thơm vào bộ sưu tập của chim cá nè!':'Gặp lại chú rồi nè! Hình này chim cá có rồi nha.'}</span></button>)}</div></>:<p className="onet-unlock-caption">{availablePhotos.length?'Bạn đã mở khóa toàn bộ bộ sưu tập!':'Bộ sưu tập hiện chưa có hình ảnh.'}</p>}</div></div>,document.body)}{viewingUnlockedPhoto&&createPortal(<div className="onet-photo-viewer" onClick={()=>setViewingUnlockedPhoto(null)}><div onClick={event=>event.stopPropagation()}><button type="button" className="close-modal" onClick={()=>setViewingUnlockedPhoto(null)} aria-label="Đóng hình"><Icon name="close"/></button><img src={viewingUnlockedPhoto.url} alt="Ảnh gốc vừa mở khóa"/></div></div>,document.body)}{phase==='lost'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="clock" size={36}/></span><h2>Hết giờ mất rồi, mình thử lại nha!</h2><p>Bạn đã ghép {matched}/24 cặp. Thử lại Level {level} nhé.</p><button className="primary-button" onClick={()=>start(level)}>Chơi lại Level {level}</button><button className="text-button" onClick={chooseLevels}>Chọn Level</button></div></div>}{phase==='paused'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="save" size={36}/></span><h2>Chim cá còn một ván đang đợi nè!</h2><p>Level {level} · {matched}/24 cặp · dép {score}. Bàn chơi đã được lưu.</p><button className="primary-button" onClick={()=>setPhase(resumeRef.current)}>Chơi tiếp ván trước</button><button className="text-button" onClick={chooseLevels}>Chọn Level khác / chơi mới</button></div></div>}</div><div className="below-controls"><button className="secondary-button" onClick={()=>onRestart?onRestart(()=>start(level)):start(level)}><Icon name="rotate" size={16}/> Thêm ván nữa nha!</button><button className="text-button" onClick={chooseLevels}>Chọn Level khác</button></div></main>;
}

export function OnetAlbum({album,unlockedIds=[]}){
 const [viewing,setViewing]=useState(null);
 const unlocked=new Set(unlockedIds);
 return <><div className="onet-collection-grid">
     {album.map(photo=>{
      const isUnlocked=unlocked.has(photo.id);
      return <button key={photo.id} type="button" className={`onet-collection-tile ${isUnlocked?'unlocked':'locked'}`} disabled={!isUnlocked} onClick={()=>{seePhoto('onet',photo.id);setViewing(photo);}} aria-label={isUnlocked?'Xem hình đã mở khóa':'Hình chưa mở khóa'}>
       <NewPhotoBadge game="onet" id={photo.id}/><img src={photo.url} alt=""/>
       {!isUnlocked&&<span><Icon name="lock" size={18}/></span>}
      </button>;
     })}
    </div>{viewing&&createPortal(<div className="onet-photo-viewer" onClick={()=>setViewing(null)}><div onClick={event=>event.stopPropagation()}><button type="button" className="close-modal" onClick={()=>setViewing(null)} aria-label="Đóng hình"><Icon name="close"/></button><img src={viewing.url} alt="Hình đã mở khóa"/></div></div>,document.body)}</>;
}

export default OnetGame;
