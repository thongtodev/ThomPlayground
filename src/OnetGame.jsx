import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {DEFAULT_IMAGE} from './assetStore';
import Icon from './Icon';
import {renderSlotImage} from './imageTransforms';
import {ONET_LEVELS,ONET_COLS,ONET_ROWS,createBoard,availablePairs,findPath,removePair,shuffleBoard,hasFullSolution,gravityAt} from './onetEngine';
import {loadGameSession,saveGameSession,clearGameSession,restoredPhase,resumePhase} from './gameSessions';

const PROGRESS_KEY='thom-onet-progress-v1';
const getSaved=()=>{try{const x=JSON.parse(localStorage.getItem(PROGRESS_KEY))||{};return {unlocked:Math.min(10,Math.max(1,x.unlocked||1)),best:x.best||{},collection:Array.isArray(x.collection)?x.collection:[]};}catch{return {unlocked:1,best:{},collection:[]};}};
const clock=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const directionName=d=>({none:'Bàn cố định',left:'Dồn trái',right:'Dồn phải',up:'Dồn lên',down:'Dồn xuống'})[d]||'Thay đổi hướng';
const gameInfo={id:'onet',name:'Nối Thơm Đi!',en:'ONET CONNECT · 10 LEVEL',icon:'link',desc:'Nối hai ảnh giống nhau bằng đường đi không quá 2 lần rẽ. Xóa hết 24 cặp trước khi hết giờ!'};

export default function OnetGame({onHome,saveRecord,onEvent,onResultReady,images={},album=[],onRestart}){
 const sessionRef=useRef(loadGameSession('onet'));const session=sessionRef.current;const resumeRef=useRef(resumePhase(session));
 const [saved,setSaved]=useState(getSaved);
 const [roundPhotoIds,setRoundPhotoIds]=useState(()=>session?.photoIds||[]);
 const [newlyUnlocked,setNewlyUnlocked]=useState([]);
 const [showCollection,setShowCollection]=useState(false),[showWinImage,setShowWinImage]=useState(false),[viewingUnlockedPhoto,setViewingUnlockedPhoto]=useState(null);
 const [level,setLevel]=useState(()=>session?.level||1),[phase,setPhase]=useState(()=>restoredPhase(session));
 const [board,setBoard]=useState(()=>session?.board||[]),[seconds,setSeconds]=useState(()=>session?.seconds??360),[matched,setMatched]=useState(()=>session?.matched||0);
 const [hints,setHints]=useState(()=>session?.hints??5),[shuffles,setShuffles]=useState(()=>session?.shuffles??2),[hintsUsed,setHintsUsed]=useState(()=>session?.hintsUsed||0);
 const [selected,setSelected]=useState(null),[hint,setHint]=useState(null),[line,setLine]=useState(null),[notice,setNotice]=useState('');
 const [score,setScore]=useState(()=>session?.score||0),[wonScore,setWonScore]=useState(0),[winResult,setWinResult]=useState(null);
 useEffect(()=>{if(phase!=='paused'&&phase!=='ready'&&phase!=='won'&&phase!=='lost')resumeRef.current=phase;},[phase]);
 useEffect(()=>{if(phase==='playing'||phase==='paused')saveGameSession('onet',{phase:phase==='paused'?resumeRef.current:phase,resumePhase:resumeRef.current,level,board,seconds,matched,hints,shuffles,hintsUsed,score,photoIds:roundPhotoIds});else clearGameSession('onet');},[phase,level,board,seconds,matched,hints,shuffles,hintsUsed,score,roundPhotoIds]);
 const busy=useRef(false),animation=useRef(null),hintTimer=useRef(null);
 const settings=ONET_LEVELS[level-1];
  const openCollection=event=>{event?.preventDefault?.();event?.stopPropagation?.();setShowCollection(true);};
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
  resumeRef.current='playing';if(animation.current)clearTimeout(animation.current);if(hintTimer.current)clearTimeout(hintTimer.current);
  busy.current=false;const c=ONET_LEVELS[target-1];
  const shuffledPhotos=[...availablePhotos];for(let i=shuffledPhotos.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffledPhotos[i],shuffledPhotos[j]]=[shuffledPhotos[j],shuffledPhotos[i]];}
  const photoCount=availablePhotos.length?Math.min(c.types,availablePhotos.length):c.types;const selectedPhotos=shuffledPhotos.slice(0,photoCount);
  setRoundPhotoIds(selectedPhotos.map(photo=>photo.id));setNewlyUnlocked([]);setWinResult(null);setShowWinImage(false);setShowCollection(false);setViewingUnlockedPhoto(null);
  setLevel(target);setBoard(createBoard(target,photoCount));setSeconds(c.time);setHints(c.hints);setShuffles(c.shuffles);
  setMatched(0);setScore(0);setWonScore(0);setHintsUsed(0);setSelected(null);setHint(null);setLine(null);setNotice('');setPhase('playing');
 };
 useEffect(()=>()=>{clearTimeout(animation.current);clearTimeout(hintTimer.current);},[]);
 useEffect(()=>{if(phase!=='playing')return;const timer=setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000);return()=>clearInterval(timer);},[phase]);
 useEffect(()=>{if(phase==='playing'&&seconds===0){clearTimeout(animation.current);setPhase('lost');busy.current=true;setSelected(null);setLine(null);onEvent({type:'onet_loss',level,score,matched,completed:undefined,result:{gameId:'onet',gameName:'Nối Thơm Đi!',title:'Hết giờ rồi!',summary:`Level ${level} · Đã ghép ${matched}/24 cặp · ${score.toLocaleString('vi-VN')} dép.`,variant:`level-${level}`,variantLabel:`Level ${level}`,metricKind:'score',metricValue:score,metricLabel:`${score.toLocaleString('vi-VN')} dép`,eligible:false,details:{level,score,matched,won:false}}});}},[seconds,phase,level,score,matched,onEvent]);
 const chooseLevels=()=>{clearTimeout(animation.current);clearTimeout(hintTimer.current);busy.current=false;setShowWinImage(false);setShowCollection(false);setViewingUnlockedPhoto(null);setPhase('ready');setSelected(null);setLine(null);};
 const choose=(index)=>{
  if(phase!=='playing'||busy.current||board[index]==null)return;
  if(selected===null){setSelected(index);return;}
  if(index===selected){setSelected(null);return;}
  const path=findPath(board,selected,index);
  if(!path){setSelected(index);setNotice(board[selected]===board[index]?'Cặp này chưa nối được đâu, thử cặp khác nhé!':'Hai hình chưa giống nhau, tìm đúng một cặp nhé!');return;}
  busy.current=true;setLine(path);setHint(null);setSelected(null);setNotice('');
  animation.current=setTimeout(()=>{
   const count=matched+1,nextScore=score+100;
   let next=removePair(board,selected,index,level,matched);
   setLine(null);setMatched(count);setScore(nextScore);
   if(count===24){
    const final=nextScore+seconds*10;setWonScore(final);setBoard(next);setShowWinImage(true);setPhase('won');
    const previouslyUnlocked=new Set(saved.collection||[]);
    const remainingPhotos=availablePhotos.filter(photo=>photo?.id&&!previouslyUnlocked.has(photo.id));
    const unlockCount=remainingPhotos.length?Math.min(remainingPhotos.length,1+Math.floor(Math.random()*Math.min(2,remainingPhotos.length))):0;
    const shuffledRemaining=[...remainingPhotos];for(let i=shuffledRemaining.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffledRemaining[i],shuffledRemaining[j]]=[shuffledRemaining[j],shuffledRemaining[i]];}
    const unlockedPhotos=shuffledRemaining.slice(0,unlockCount);
    const nextCollection=[...new Set([...(saved.collection||[]),...unlockedPhotos.map(photo=>photo.id)])];
    const nextSaved={unlocked:Math.max(saved.unlocked,Math.min(10,level+1)),best:{...saved.best,[level]:Math.max(saved.best[level]||0,final)},collection:nextCollection};
    setNewlyUnlocked(unlockedPhotos);localStorage.setItem(PROGRESS_KEY,JSON.stringify(nextSaved));setSaved(nextSaved);
    saveRecord('onet',{label:`${final.toLocaleString('vi-VN')} dép`,value:final,kind:'score'});
    const result={gameId:'onet',gameName:'Nối Thơm Đi!',title:`Hoàn thành Level ${level}!`,summary:`24 cặp · ${clock(settings.time-seconds)} còn lại · ${final.toLocaleString('vi-VN')} dép.`,variant:`level-${level}`,variantLabel:`Level ${level}`,metricKind:'score',metricValue:final,metricLabel:`${final.toLocaleString('vi-VN')} dép`,eligible:true,details:{level,score:final,secondsLeft:seconds,hintsUsed,unlockedImageIds:unlockedPhotos.map(photo=>photo.id),newlyUnlockedCount:unlockedPhotos.length}};
    setWinResult(result);
    if(postResultActionsRef)postResultActionsRef.current={
     nextLabel:level<10?`Chơi Level ${level+1}`:'Chơi lại từ Level 1',
     next:()=>start(level<10?level+1:1),
     choose:chooseLevels
    };
    onEvent({type:'onet_win',level,score:final,noHint:hintsUsed===0,completed:'onet',result});
   }else{
    const solvable=hasFullSolution(next,level,count,1600);
    if(solvable!==true){next=shuffleBoard(next,level,count);setNotice('Bàn được tự động xáo trộn miễn phí để luôn có thể tiếp tục.');}
    else if(availablePairs(next,1).length===0){next=shuffleBoard(next,level,count);setNotice('Không còn nước đi — tự động xáo trộn miễn phí!');}
    setBoard(next);
   }
   busy.current=false;
  },240);
 };
 const useHint=()=>{
  if(phase!=='playing'||busy.current||hints<=0)return;
  const move=availablePairs(board,1)[0];if(!move){setNotice('Đang xáo trộn để tìm nước đi…');setBoard(shuffleBoard(board,level,matched));return;}
  setHints(h=>h-1);setHintsUsed(h=>h+1);setHint([move.a,move.b]);setNotice('Đây rồi! Hai ô đang phát sáng có thể nối với nhau đó.');
  clearTimeout(hintTimer.current);hintTimer.current=setTimeout(()=>setHint(null),2300);
 };
 const useShuffle=()=>{
  if(phase!=='playing'||busy.current||shuffles<=0)return;
  setShuffles(s=>s-1);setSelected(null);setHint(null);setBoard(shuffleBoard(board,level,matched));setNotice('Bàn cờ đã được xáo trộn, tìm cặp mới nào!');
 };
 const gameImage=(type)=>{const photo=roundPhotos[type];if(!photo)return DEFAULT_IMAGE;const index=availablePhotos.findIndex(item=>item.id===photo.id);return croppedUrls[index]||photo.url||DEFAULT_IMAGE;};
 const isDefaultImage=(type)=>!roundPhotos[type];
 const levelDescription=n=>{
  const cfg=ONET_LEVELS[n-1];return Array.isArray(cfg.gravity)?`Luân phiên ${cfg.gravity.map(directionName).join(' / ').toLowerCase()}`:directionName(cfg.gravity);
 };
 if(phase==='ready')return <><main className="game-intro onet-intro"><button className="back-link" onClick={onHome}>Tất cả trò chơi</button><div className="intro-card onet-intro-card"><div className="intro-icon"><Icon name="link" size={48}/></div><div className="eyebrow">ONET CONNECT · THƠM PLAYGROUND</div><h1>Nối Thơm Đi!</h1><p>Những chú Thơm giống nhau đang nằm rải rác khắp bàn cờ. Hãy tìm và nối từng cặp thật nhanh trước khi hết giờ nhé!</p><div className="rules-list"><span><Icon name="eye"/> Tìm hai hình giống nhau rồi chọn lần lượt từng hình.</span><span><Icon name="link"/> Đường nối không bị cản và có tối đa 2 góc rẽ.</span><span><Icon name="target"/> Ghép đủ 24 cặp để hoàn thành Level.</span><span><Icon name="flame"/> Càng lên cao, thời gian càng ngắn và bàn cờ càng có nhiều thay đổi bất ngờ.</span></div><div className="onet-info-chips"><span>6 × 8 ô</span><span>24 cặp</span><span>10 Level</span></div><h2 className="onet-level-title">Chọn Level <small>Đã mở {saved.unlocked}/10</small></h2><div className="onet-level-picker">{ONET_LEVELS.map((cfg,i)=>{const n=i+1,unlocked=n<=saved.unlocked;return <button key={n} type="button" className={`onet-level-button ${level===n?'chosen':''}`} disabled={!unlocked} onClick={()=>setLevel(n)} aria-label={`Level ${n}${unlocked?'':' chưa mở khóa'}`}><b>{unlocked?n:<Icon name="lock" size={15}/>}</b><small>{unlocked?clock(cfg.time):'Khóa'}</small></button>;})}</div><div className="onet-level-details"><strong>Level {level} · {clock(settings.time)}</strong><span>{levelDescription(level)} · {settings.hints} gợi ý · {settings.shuffles} xáo trộn</span>{saved.best[level]>0&&<span><Icon name="trophy" size={14}/> Kỷ lục: {saved.best[level].toLocaleString('vi-VN')} dép</span>}</div><button type="button" className="puzzle-open-collection onet-level-collection-button" onClick={openCollection} aria-label="Mở bộ sưu tập hình ảnh Nối Thơm Đi"><span className="puzzle-open-collection-icon" aria-hidden="true"><Icon name="gallery" size={22}/></span><span>BỘ SƯU TẬP HÌNH ẢNH</span></button><div className="rules-list"><span><Icon name="check" size={14}/> Chỉ nối hai hình giống nhau nếu đường nối rẽ không quá 2 lần (có thể đi ngoài viền).</span><span><Icon name="check" size={14}/> Hết giờ sẽ thua. Không còn nước đi thì tự xáo trộn miễn phí.</span><span><Icon name="check" size={14}/> Mỗi cặp +100 dép, cộng thưởng theo thời gian còn lại.</span></div><button className="primary-button start-button" onClick={()=>start(level)}><Icon name="play" size={17}/> Chơi Level {level}</button></div></main>{showCollection&&createPortal(<OnetCollectionModal album={availablePhotos} unlockedIds={saved.collection} onClose={()=>setShowCollection(false)}/>,document.body)}</>;
 return <main className="game-page onet-page"><button className="back-link" onClick={onHome}>Trang chủ</button><div className="game-heading"><div><span className="eyebrow">ONET CONNECT · LEVEL {level}/10</span><h1>Nối Thơm Đi!</h1></div><button className="small-select" onClick={chooseLevels}>Chọn Level</button></div><div className="stats-row onet-stats"><div className="stat-box"><small>Thời gian</small><strong className={seconds<=30?'onet-danger':''}>{clock(seconds)}</strong></div><div className="stat-box"><small>Đã ghép</small><strong>{matched}/24</strong></div><div className="stat-box"><small>Dép</small><strong>{score}</strong></div><div className="stat-box"><small>Hướng dồn</small><strong className="onet-gravity-label">{directionName(gravityAt(level,matched))}</strong></div></div><div className="play-panel onet-panel"><div className="onet-actions"><button className="secondary-button" disabled={phase!=='playing'||hints===0} onClick={useHint}><Icon name="lightbulb" size={16}/> Gợi ý ({hints})</button><button className="secondary-button" disabled={phase!=='playing'||shuffles===0} onClick={useShuffle}><Icon name="dice" size={16}/> Xáo trộn ({shuffles})</button></div><div className="onet-board-wrap"><div className="onet-board" role="grid" aria-label="Bàn Nối Thơm Đi! 6 cột 8 hàng">{board.map((type,i)=><button key={i} type="button" role="gridcell" className={`onet-cell ${type==null?'onet-empty':''} ${selected===i?'onet-selected':''} ${hint?.includes(i)?'onet-hinted':''}`} disabled={type==null||phase!=='playing'} onClick={()=>choose(i)} aria-label={type==null?`Ô trống ${i+1}`:`Hình ${type+1}, hàng ${Math.floor(i/ONET_COLS)+1}, cột ${i%ONET_COLS+1}`} >{type!=null&&<><img src={gameImage(type)} alt="" draggable="false"/>{isDefaultImage(type)&&<span className="onet-tile-number">{type+1}</span>}</>}</button>)}</div>{line&&<svg className="onet-connection" viewBox={`0 0 ${ONET_COLS} ${ONET_ROWS}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={line.map(p=>`${p.c+0.5},${p.r+0.5}`).join(' ')} fill="none" stroke="#fff" strokeWidth=".14" strokeLinejoin="round" strokeLinecap="round"/><polyline points={line.map(p=>`${p.c+0.5},${p.r+0.5}`).join(' ')} fill="none" stroke="#f5bc42" strokeWidth=".08" strokeLinejoin="round" strokeLinecap="round"/></svg>}</div><div className="onet-progress-track"><span style={{width:`${matched/24*100}%`}}/></div><p className="onet-message" role="status">{notice||'Chạm hai hình giống nhau để nối. Đường đi được phép rẽ tối đa 2 lần.'}</p>{phase==='won'&&showWinImage&&createPortal(<div className="overlay onet-unlocked-overlay" role="dialog" aria-modal="true" aria-label="Hoàn thành Nối Thơm Đi!"><div className="result-card onet-unlocked-card"><button type="button" className="image-review-close" onClick={closeWinImage} aria-label="Đóng hình đã mở khóa, xem bảng thành tích"><Icon name="close" size={19}/></button><span className="result-emoji"><Icon name="trophy" size={36}/></span><h2>Hoàn thành Level {level}!</h2><p>Bạn ghép đủ 24 cặp trong {clock(settings.time-seconds)}. Tổng dép: <b>{wonScore.toLocaleString('vi-VN')}</b>.</p><button type="button" className="primary-button onet-open-collection-button" onClick={openCollection}>Bộ sưu tập hình ảnh</button>{newlyUnlocked.length>0?<><p className="onet-unlock-caption">Bạn vừa mở khóa {newlyUnlocked.length} hình mới!</p><div className="onet-unlocked-images">{newlyUnlocked.map(photo=><button type="button" className="onet-unlocked-image-button" key={photo.id} onClick={()=>setViewingUnlockedPhoto(photo)} aria-label="Xem ảnh vừa mở khóa ở kích thước đầy đủ"><img src={photo.url} alt="Hình ảnh vừa mở khóa"/></button>)}</div></>:<p className="onet-unlock-caption">{availablePhotos.length?'Bạn đã mở khóa toàn bộ bộ sưu tập!':'Bộ sưu tập hiện chưa có hình ảnh.'}</p>}</div></div>,document.body)}{viewingUnlockedPhoto&&createPortal(<div className="onet-photo-viewer" onClick={()=>setViewingUnlockedPhoto(null)}><div onClick={event=>event.stopPropagation()}><button type="button" className="close-modal" onClick={()=>setViewingUnlockedPhoto(null)} aria-label="Đóng hình"><Icon name="close"/></button><img src={viewingUnlockedPhoto.url} alt="Ảnh gốc vừa mở khóa"/></div></div>,document.body)}{phase==='lost'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="clock" size={36}/></span><h2>Hết giờ rồi!</h2><p>Bạn đã ghép {matched}/24 cặp. Thử lại Level {level} nhé.</p><button className="primary-button" onClick={()=>start(level)}>Chơi lại Level {level}</button><button className="text-button" onClick={chooseLevels}>Chọn Level</button></div></div>}{phase==='paused'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="save" size={36}/></span><h2>Bạn còn một ván đang chơi dở</h2><p>Level {level} · {matched}/24 cặp · dép {score}. Bàn chơi đã được lưu.</p><button className="primary-button" onClick={()=>setPhase(resumeRef.current)}>Tiếp tục ván trước</button><button className="text-button" onClick={chooseLevels}>Chọn Level khác / chơi mới</button></div></div>}</div>{showCollection&&createPortal(<OnetCollectionModal album={availablePhotos} unlockedIds={saved.collection} onClose={()=>setShowCollection(false)}/>,document.body)}<div className="below-controls"><button className="secondary-button" onClick={()=>onRestart?onRestart(()=>start(level)):start(level)}><Icon name="rotate" size={16}/> Chơi lại</button><button className="text-button" onClick={chooseLevels}>Chọn Level khác</button></div></main>;
}


function OnetCollectionModal({album,unlockedIds=[],onClose}){
 const [viewing,setViewing]=useState(null);
 const unlocked=new Set(unlockedIds);
 return <><div className="overlay onet-collection-overlay" onClick={event=>{event.preventDefault();event.stopPropagation();onClose();}} role="dialog" aria-modal="true" aria-label="Bộ sưu tập Nối Thơm Đi">
  <div className="onet-collection-modal" onClick={event=>event.stopPropagation()}>
   <button type="button" className="close-modal" onClick={event=>{event.preventDefault();event.stopPropagation();onClose();}} aria-label="Đóng bộ sưu tập"><Icon name="close"/></button>
   <h2>Bộ sưu tập hình ảnh</h2>
   <p>Đã mở khóa {album.filter(photo=>unlocked.has(photo.id)).length}/{album.length} hình</p>
   {album.length>0?(
    <div className="onet-collection-grid">
     {album.map(photo=>{
      const isUnlocked=unlocked.has(photo.id);
      return <button key={photo.id} type="button" className={`onet-collection-tile ${isUnlocked?'unlocked':'locked'}`} disabled={!isUnlocked} onClick={()=>setViewing(photo)} aria-label={isUnlocked?'Xem hình đã mở khóa':'Hình chưa mở khóa'}>
       <img src={photo.url} alt=""/>
       {!isUnlocked&&<span><Icon name="lock" size={18}/></span>}
      </button>;
     })}
    </div>
   ):(
    <p className="onet-collection-empty">Chưa có hình ảnh trong bộ sưu tập.</p>
   )}
  </div>
 </div>{viewing&&createPortal(<div className="onet-photo-viewer" onClick={()=>setViewing(null)}><div onClick={event=>event.stopPropagation()}><button type="button" className="close-modal" onClick={()=>setViewing(null)} aria-label="Đóng hình"><Icon name="close"/></button><img src={viewing.url} alt="Hình đã mở khóa"/></div></div>,document.body)}</>;
}
