import {diamondLoot,diamondStars,finalizeDiamondWin} from '../diamondScoring';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Icon from '../Icon';
import manifest from '../data/thomDiamondManifest.json';
import {loadDiamondImage,diamondTileData} from '../diamondCrop';
import {gameEffect} from '../effects/GameEffects';
import {DIAMOND_GAMEPLAY_ASSETS,DIAMOND_SPECIAL_ASSETS} from '../diamondAssets';
import {THOM_DIAMOND_LEVELS,THOM_DIAMOND_WORLDS,SPECIAL_LABELS,createLevelState,swapAndResolve,applyBooster,applySwapBooster,loadThomDiamondProgress,saveThomDiamondProgress} from '../thomDiamondEngine';

const TILE_SRC=id=>`/thom-kim-cuong/tiles/${id}.webp`;
const SPECIAL_OBJECTIVE_NAMES={ROCKET:'Thơm Tên Lửa',BOMB:'Thơm Bom',RAINBOW:'Thơm Cầu Vồng',PLANE:'Thơm Phi Cơ'};
const objectiveTitle=o=>{
 if(o.type==='COLLECT')return `Gom ${o.target} hình Thơm giống mẫu`;
 if(o.type==='CLEAN')return `Quét sạch ${o.target} lớp bụi`;
 if(o.type==='BREAK_SPEAKER')return `Gỡ ${o.target} lớp vỏ loa`;
 if(o.type==='BREAK_ICE')return `Làm tan ${o.target} lớp băng`;
 if(o.type==='UNLOCK')return `Gỡ ${o.target} lớp khóa`;
 if(o.type==='DELIVER')return `Đưa ${o.target} chiếc micro ra cửa`;
 if(o.special==='SPECIAL_COMBO')return `Cho quân đặc biệt phối hợp ${o.target} lần`;
 const name=SPECIAL_OBJECTIVE_NAMES[o.special]||'quân đặc biệt';
 return o.type==='CREATE_SPECIAL'?`Tạo ${o.target} ${name}`:`Dùng ${name} ${o.target} lần`;
};
const objectiveHint=o=>{
 if(o.type==='COLLECT')return 'Chim cá tìm hình giống mẫu rồi ghép ít nhất 3 hình thành một hàng nha!';
 if(o.type==='CLEAN')return 'Có bụi dưới chân Thơm kìa! Ghép hình ngay trên ô bụi để quét đi một lớp.';
 if(o.type==='BREAK_SPEAKER')return 'Chim cá ghép hình sát cạnh thùng loa nha. Mỗi lần ghép sát loa sẽ bong một lớp vỏ.';
 if(o.type==='BREAK_ICE')return 'Thơm bị đóng băng rồi! Ghép hình trong băng với các hình giống nó để làm tan một lớp.';
 if(o.type==='UNLOCK')return 'Chim cá lấy Búa Thơm gõ vào ổ khóa, hoặc cho quân đặc biệt đánh trúng ô đó nha!';
 if(o.type==='DELIVER')return 'Chim cá ghép hình bên dưới micro để nó rơi ra cửa có viền xanh ở đáy bàn nha!';
 if(o.type==='CREATE_SPECIAL')return ({
  ROCKET:'Chim cá xếp 4 hình giống nhau thành một hàng ngang hoặc dọc là có tên lửa nha!',
  BOMB:'Chim cá ghép các hình giống nhau thành chữ T hoặc chữ L để tạo bom nha!',
  RAINBOW:'Chim cá xếp 5 hình giống nhau thẳng hàng để Thơm Cầu Vồng xuất hiện nha!',
  PLANE:'Chim cá xếp 4 hình giống nhau thành ô vuông 2 × 2 để tạo phi cơ nha!'
 })[o.special]||'Thử xếp 4 hình giống nhau thẳng hàng để tạo một quân đặc biệt nha!';
 if(o.special==='SPECIAL_COMBO')return 'Chim cá đổi chỗ hai quân đặc biệt nằm cạnh nhau để chúng cùng ra chiêu nha!';
 if(o.special==='RAINBOW')return 'Chim cá đổi chỗ Thơm Cầu Vồng với một hình ngay bên cạnh để dùng cầu vồng nha!';
 return 'Chim cá ghép quân đặc biệt với các hình cùng loại, hoặc đổi chỗ hai quân đặc biệt cạnh nhau nha!';
};
const objectiveTileId=o=>{
 if(o.tileId)return o.tileId;
 const match=String(o.tileKey||'').match(/^THOM_W(\d+)_(\d+)$/);
 return match?manifest.find(item=>item.world===Number(match[1])&&item.world_order===Number(match[2]))?.tile_id||null:null;
};
const fmt=n=>Number(n||0).toLocaleString('vi-VN');
const starsFor=diamondStars;

function BoosterIcon({type}){
 return <img className={`tkc-booster-art tkc-booster-${type}`} src={`/thom-kim-cuong/boosters/${type}.png`} alt="" aria-hidden="true" draggable="false"/>;
}

function ObjectiveIcon({objective}){
 const blocker=({DELIVER:'microphone',CLEAN:'dust',BREAK_SPEAKER:'speaker',BREAK_ICE:'ice',UNLOCK:'lock'})[objective.type];
 const special=['CREATE_SPECIAL','ACTIVATE_SPECIAL'].includes(objective.type)?String(objective.special||'').toLowerCase():null;
 const art=DIAMOND_GAMEPLAY_ASSETS[blocker]||DIAMOND_SPECIAL_ASSETS[special];
 const icon=objective.type==='CREATE_SPECIAL'?'sparkles':'zap';
 return <span className="tkc-objective-icon">{art?<img className="tkc-objective-art" src={art} alt="" aria-hidden="true" draggable="false"/>:<Icon name={icon} size={15}/>}</span>;
}

function MapScreen({progress,onStart,onHome}){
 const [world,setWorld]=useState(Math.min(4,Math.ceil(progress.unlockedLevel/25)));
 const totalStars=Object.values(progress.results||{}).reduce((sum,x)=>sum+(x.stars||0),0);
 const completedInWorld=world=>THOM_DIAMOND_LEVELS.filter(level=>level.world===world&&Number(progress.results?.[level.id]?.stars)>0).length;
 return <main className="tkc-page">
  <div className="tkc-map-top"><button className="back-link" onClick={onHome}>← Trang chủ</button><span className="tkc-map-brand"><Icon name="gem"/> THƠM PLAYGROUND</span></div>
  <section className="tkc-map-hero"><div><span className="eyebrow">100 MÀN CHƠI · 4 CHẶNG</span><h1>Thơm Lấp Lánh</h1><p>Chim cá ơi, vào ghép Thơm nào! Ghép từ 3 hình giống nhau để gom nha.</p><div className="tkc-map-stats"><span><Icon name="flag"/> Mở đến màn <b>{progress.unlockedLevel}</b></span><span><Icon name="star"/> <b>{totalStars}</b> sao</span></div></div><div className="tkc-hero-gem" aria-hidden="true"><span>💎</span><i>✨</i></div></section>
  <section className="tkc-world-tabs" aria-label="Chọn chặng">{THOM_DIAMOND_WORLDS.map(w=><button key={w.world} className={world===w.world?'active':''} onClick={()=>setWorld(w.world)}><small>CHẶNG {w.world}</small><b>{w.name}</b><span>{completedInWorld(w.world)}/25 màn</span></button>)}</section>
  <section className="tkc-level-map"><div className="tkc-section-heading"><div><span className="eyebrow">CHẶNG {world}</span><h2>{THOM_DIAMOND_WORLDS[world-1]?.name}</h2></div><span>{world===1?'Đời thường':world===2?'Phòng thu âm':world===3?'Hậu trường':'Đêm diễn ánh đèn'}</span></div><div className="tkc-level-grid">{THOM_DIAMOND_LEVELS.filter(l=>l.world===world).map(level=>{
   const result=progress.results[level.id],open=level.id<=progress.unlockedLevel||(progress.adminUnlockedLevels||[]).includes(level.id),done=Boolean(result?.stars);
   return <button key={level.id} className={`tkc-level-node ${open?'open':'locked'} ${done?'done':''} ${level.kind==='Boss'?'boss':''}`} disabled={!open} onClick={()=>onStart(level.id)} aria-label={`Màn ${level.id}: ${level.name}${open?'':' · Chưa mở'}`}><span className="tkc-level-number">{level.worldLevel}</span>{!open?<Icon name="lock" size={15}/>:level.kind==='Boss'?<Icon name="crown" size={17}/>:<span className="tkc-level-gem">◆</span>}<span className="tkc-node-stars">{[1,2,3].map(n=><i key={n} className={n<=(result?.stars||0)?'earned':''}>★</i>)}</span></button>;
  })}</div><p className="tkc-map-note"><Icon name="lightbulb" size={14}/> Xong nhiệm vụ là mở màn tiếp theo rồi, chim cá không cần gom đủ 3 sao đâu nha!</p></section>
  <div className="tkc-map-footer"><span>THƠM LẤP LÁNH · MATCH-3</span></div>
 </main>;
}

function TileFace({piece,tileImages}){
 if(!piece)return null;
 if(piece.prop)return <img className="tkc-prop-piece" src={DIAMOND_GAMEPLAY_ASSETS.microphone} alt="Micro cần đưa xuống cửa thoát" draggable="false"/>;
 return <><img className="tkc-tile-image" src={tileImages?.[piece.tile]||TILE_SRC(piece.tile)} alt="Chú Thơm" draggable="false"/>{piece.special&&DIAMOND_SPECIAL_ASSETS[piece.special]&&<span className="tkc-special-mark" title={SPECIAL_LABELS[piece.special]}><img src={DIAMOND_SPECIAL_ASSETS[piece.special]} alt={SPECIAL_LABELS[piece.special]} draggable="false"/></span>}</>;
}

function SpecialVisual({view}){
 if(view?.type!=='special')return null;
 const indices=view.indices||[],origin=(view.origin||[])[0]??indices[0]??24;
 const point=i=>({x:(i%7+.5)*100,y:(Math.floor(i/7)+.5)*100});
 const start=point(origin),rowCounts=new Map(),colCounts=new Map();
 for(const i of indices){const r=Math.floor(i/7),c=i%7;rowCounts.set(r,(rowCounts.get(r)||0)+1);colCounts.set(c,(colCounts.get(c)||0)+1);}
 const rows=[...rowCounts].filter(([,n])=>n>=5).map(([r])=>r),cols=[...colCounts].filter(([,n])=>n>=5).map(([c])=>c);
 const target=point(indices.find(i=>!(view.origin||[]).includes(i))??origin);
 return <svg className={`tkc-special-svg tkc-visual-${view.special}`} viewBox="0 0 700 700" preserveAspectRatio="none" aria-hidden="true">
  {view.special==='rocket'&&<>{rows.map(r=><line key={`r${r}`} x1="0" y1={r*100+50} x2="700" y2={r*100+50}/>)}{cols.map(c=><line key={`c${c}`} x1={c*100+50} y1="0" x2={c*100+50} y2="700"/>)}</>}
  {view.special==='bomb'&&<circle cx={start.x} cy={start.y} r={view.combo?220:135}/>}
  {view.special==='plane'&&<><line x1={start.x} y1={start.y} x2={target.x} y2={target.y}/><circle cx={target.x} cy={target.y} r="33"/></>}
  {view.special==='rainbow'&&indices.slice(0,18).map(i=><circle key={i} cx={point(i).x} cy={point(i).y} r="40"/>)}
 </svg>;
}

// Damage is rendered from the previous board, so a broken layer visibly shatters
// instead of disappearing before the player can recognize the hit.
function damagedBlockers(previous, current){
 if(!previous||!current)return [];
 const kinds=[];
 if((previous.speaker||0)>(current.speaker||0))kinds.push('speaker');
 if((previous.dust||0)>(current.dust||0))kinds.push('dust');
 if((previous.piece?.ice||0)>(current.piece?.ice||0))kinds.push('ice');
 if((previous.piece?.lock||0)>(current.piece?.lock||0))kinds.push('lock');
 return kinds;
}
function BlockerDamageVisual({types}){
 if(!types.length)return null;
 return <span className="tkc-damage-layer" aria-hidden="true">{types.map(type=><span key={type} className={`tkc-damage-ghost tkc-damage-${type}`}>
  <img src={DIAMOND_GAMEPLAY_ASSETS[type]} alt="" draggable="false"/>
  <i className="tkc-damage-ring"/>{[0,1,2,3].map(i=><i key={i} className={`tkc-damage-particle tkc-particle-${i}`}/>)}
 </span>)}</span>;
}
const boardPoint=index=>({x:((index%7)+.5)*100,y:(Math.floor(index/7)+.5)*100});
function BoosterVisual({view}){
 if(view?.type!=='booster'&&view?.type!=='reshuffle')return null;
 const automatic=view.type==='reshuffle';
 const {booster=automatic?'shuffle':undefined,stage=automatic?'impact':'charge',indices=[]}=view;
 const hit=Number.isInteger(indices[0])?boardPoint(indices[0]):{x:350,y:350};
 const dest=Number.isInteger(indices[1])?boardPoint(indices[1]):hit;
 const anchor={left:`${hit.x/7}%`,top:`${hit.y/7}%`};
 return <div key={`${booster}-${stage}`} className={`tkc-booster-fx tkc-booster-fx-${booster} tkc-booster-stage-${stage}`} aria-hidden="true">
  {booster==='hammer'&&<span className="tkc-booster-fx-target" style={anchor}><i className="tkc-hammer-impact"/><img src="/thom-kim-cuong/boosters/hammer.png" alt="" className="tkc-hammer-sprite"/><i className="tkc-impact-star"/></span>}
  {booster==='swap'&&<><svg viewBox="0 0 700 700" preserveAspectRatio="none"><path d={`M${hit.x} ${hit.y} Q350 ${Math.min(hit.y,dest.y)-90} ${dest.x} ${dest.y}`} className="tkc-swap-trail"/><circle cx={hit.x} cy={hit.y} r="37"/><circle cx={dest.x} cy={dest.y} r="37"/></svg><img className="tkc-swap-sprite" src="/thom-kim-cuong/boosters/swap.png" alt=""/></>}
  {booster==='shuffle'&&<span className="tkc-shuffle-wheel"><i/><i/><img src="/thom-kim-cuong/boosters/shuffle.png" alt=""/></span>}
  {booster==='extra'&&<span className="tkc-extra-burst"><img src="/thom-kim-cuong/boosters/extra.png" alt=""/><b>+5 LƯỢT</b><i/><i/><i/></span>}
 </div>;
}

const boosterNames={hammer:"Búa Thơm",swap:"Đổi chỗ",shuffle:"Xáo trộn",extra:"Thêm 5 lượt"};
function ResultOverlay({onShowRanking,won,level,state,stars,onRetry,onMap,onNext}){
 return <div className="tkc-overlay"><section className={`tkc-result-card ${won?'won':'lost'}`}><span className="tkc-result-emoji">{won?'💎':'🫣'}</span><span className="eyebrow">{won?'MÀN CHƠI HOÀN THÀNH':'CHƯA VƯỢT QUA MÀN NÀY'}</span><h2>{won?'Qua màn rồi, chim cá ơi!':'Hết lượt mất rồi, chim cá ơi!'}</h2><p>{won?(level.id===100?'Chặng Dưới Ánh Đèn đã hoàn thành! Cùng xem lại hành trình 100 màn nha.':'Ghép ngon lành luôn! Mình sang màn tiếp theo nha?'):'Còn chút nữa thôi! Mình thử lại màn này nha.'}</p>{won&&<div className="tkc-result-stars">{[1,2,3].map(n=><span key={n} className={n<=stars?'earned':''}>★</span>)}</div>}{won&&<div className="tkc-bonus-breakdown"><span>Điểm ghép <b>{fmt(state.baseScore??state.score)}</b></span><span>Thưởng {state.bonusMoves||0} lượt × {fmt(state.moveBonusRate||0)} <b>+{fmt(state.moveBonus||0)}</b></span><small>Lượt được cộng từ đạo cụ không tính thưởng.</small></div>}<div className="tkc-result-stats"><span><small>Tổng điểm</small><b>{fmt(state.score)}</b></span><span><small>Lượt đã dùng</small><b>{Math.max(0,level.moveLimit+(state.extraMovesGranted||0)-state.movesLeft)}</b></span></div>{state.loot?.length>0&&<p><b>Đạo cụ vừa nhận</b> · {state.loot.map(key=>boosterNames[key]).join(" + ")}</p>}<div className="tkc-result-actions">{won&&onShowRanking&&<button className="secondary-button" onClick={onShowRanking}><Icon name="trophy" size={16}/> Gửi kỷ lục</button>}{won&&<button className="primary-button" onClick={onNext}>{level.id===100?'Về bản đồ 100 màn':'Sang màn tiếp!'} <Icon name="play" size={16}/></button>}<button className={won?'secondary-button':'primary-button'} onClick={onRetry}><Icon name="rotate" size={16}/> Thử lại nha!</button><button className="text-button" onClick={onMap}>Về bản đồ</button></div></section></div>;
}

export default function ThomDiamondGame({onShowRanking,onHome,images={},onEvent,adminCrops={},practice=false,onExitPractice}){
 const [progress,setProgress]=useState(()=>practice?{unlockedLevel:100,results:{},boosters:{hammer:99,swap:99,shuffle:99,extra:99}}:loadThomDiamondProgress());
 const [levelId,setLevelId]=useState(null),[state,setState]=useState(null),[paused,setPaused]=useState(false),[boosterMode,setBoosterMode]=useState(null),[swapFirst,setSwapFirst]=useState(null),[notice,setNotice]=useState('');
 const level=useMemo(()=>THOM_DIAMOND_LEVELS.find(x=>x.id===levelId),[levelId]);
 const dragStart=useRef(null),boardRef=useRef(null),playToken=useRef(0),timers=useRef(new Set()),busyRef=useRef(false),invalidTimer=useRef(null),noticeTimer=useRef(null);
 const [view,setView]=useState(null),[busy,setBusy]=useState(false),[tileImages,setTileImages]=useState({});
 const cropSignature=JSON.stringify(adminCrops||{});
 const [soundOn,setSoundOn]=useState(()=>{try{return localStorage.getItem('tkc-sound')!=='off';}catch{return true;}});
 const effectsOn=true;
 const reduced=()=>!effectsOn||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const sleep=ms=>new Promise(resolve=>{if(!ms){resolve();return;}const pending={timer:null,resolve};pending.timer=setTimeout(()=>{timers.current.delete(pending);resolve();},ms);timers.current.add(pending);});
 const clearNotice=()=>{if(noticeTimer.current!==null){clearTimeout(noticeTimer.current);noticeTimer.current=null;}setNotice('');};
 const showNotice=(message,duration=2400)=>{if(noticeTimer.current!==null)clearTimeout(noticeTimer.current);setNotice(message);noticeTimer.current=setTimeout(()=>{noticeTimer.current=null;setNotice('');},duration);};
 const cancelPlayback=()=>{clearNotice();playToken.current++;for(const pending of timers.current){clearTimeout(pending.timer);pending.resolve();}timers.current.clear();if(invalidTimer.current!==null){clearTimeout(invalidTimer.current);invalidTimer.current=null;}busyRef.current=false;setBusy(false);setView(null);};
 useEffect(()=>()=>{playToken.current++;for(const pending of timers.current){clearTimeout(pending.timer);pending.resolve();}timers.current.clear();if(invalidTimer.current!==null)clearTimeout(invalidTimer.current);if(noticeTimer.current!==null)clearTimeout(noticeTimer.current);},[]);
 useEffect(()=>{let alive=true;const active=manifest.filter(item=>adminCrops?.[item.tile_id]&&level?.tileSet?.includes(item.tile_id));
  Promise.all(active.map(async item=>{try{const img=await loadDiamondImage(`/thom-kim-cuong/${item.original_file}`);return [item.tile_id,diamondTileData(img,adminCrops[item.tile_id],192)];}catch{return [item.tile_id,null];}})).then(rows=>{if(alive)setTileImages(Object.fromEntries(rows.filter(row=>row[1])));});
  return()=>{alive=false;};
 },[cropSignature,level?.world]);
 // Audio feedback must not spawn a full-screen particle overlay for every cascade wave.
 const sound=(frequency=520,highlight=false)=>{if(soundOn||(effectsOn&&highlight))gameEffect({type:effectsOn&&highlight?'spark':'sound',selector:'.tkc-board',sound:soundOn?frequency:undefined,duration:160});};
 const playResult=async(result,selectedLevel)=>{
  if(busyRef.current)return;
  if(invalidTimer.current!==null){clearTimeout(invalidTimer.current);invalidTimer.current=null;}
  busyRef.current=true;setBusy(true);
  const token=++playToken.current;
  const steps=result.summary.events||[];
  for(const step of steps){
   if(token!==playToken.current)return;
   setView(step);
   if(step.type==='match'&&step.wave>=1&&step.wave<6){showNotice(step.wave>=3?'Chim cá ghép cháy quá, chú theo không kịp luôn!':`Combo ×${step.wave+1} rồi nè, chim cá đỉnh ghê!`,1600);}
   if(step.type==='reshuffle')showNotice('Hết nước đi! Bàn đang tự xáo trộn, không mất lượt nha!',1900);
   if(['match','special'].includes(step.type))sound(step.type==='special'?760:500+(step.wave||0)*90,step.type==='special');
   // Keep the board responsive during long cascades; settle is a logical snapshot only.
   await sleep(reduced()?0:({swap:150,match:195,special:320,clear:280,drop:210,reshuffle:440,settle:0})[step.type]??60);
  }
  if(token!==playToken.current)return;
  setView(null);setState(result.state);busyRef.current=false;setBusy(false);
  if(result.summary.won){if(effectsOn||soundOn)gameEffect({type:effectsOn?'celebrate':'sound',selector:'.tkc-board',sound:soundOn?880:undefined});finishWin(result.state,selectedLevel);}
 };

 const playBooster=async(updated,type,indices=[])=>{
  if(busyRef.current)return;
  busyRef.current=true;setBusy(true);
  const token=++playToken.current;
  const before=state.board;
  // The impact snapshot preserves the broken speaker for its shatter effect;
  // the next snapshot animates Thơm tiles falling into the newly freed cell.
  const transition=updated.boosterTransition;
  if(transition){updated={...updated};delete updated.boosterTransition;}
  setView({type:'booster',stage:'charge',booster:type,board:before,previous:before,indices});
  sound(type==='hammer'?260:type==='extra'?880:620);
  await sleep(reduced()?0:(type==='shuffle'?210:170));
  if(token!==playToken.current)return;
  setView({type:'booster',stage:'impact',booster:type,board:transition?.impactBoard||updated.board,previous:before,indices});
  if(type==='hammer')sound(340);
  await sleep(reduced()?0:(transition?290:type==='shuffle'?410:380));
  if(token!==playToken.current)return;
  if(transition){
   setView({type:'drop',board:transition.dropBoard,previous:transition.impactBoard,indices});
   await sleep(reduced()?0:220);
   if(token!==playToken.current)return;
  }
  setView(null);setState(updated);busyRef.current=false;setBusy(false);
  const won=updated.objectives.every(o=>o.current>=o.target);
  if(!won||practice){
   const next={...progress,boosters:{...updated.boosters}};
   if(!practice)saveThomDiamondProgress(next);
   setProgress(next);
  }
  setBoosterMode(null);setSwapFirst(null);clearNotice();
  if(type==='shuffle')showNotice('Đảo bàn một chút, ghép tiếp nào chim cá!');
  if(type==='extra')showNotice('Thêm 5 lượt rồi, chim cá ghép tiếp nha!');
  if(won)finishWin(updated,level);
 };
 const startLevel=useCallback(id=>{
  if(id>progress.unlockedLevel&&!(progress.adminUnlockedLevels||[]).includes(id))return;
  cancelPlayback();
  const selected=THOM_DIAMOND_LEVELS.find(x=>x.id===id);if(!selected)return;
  const next=createLevelState(selected);next.boosters={...progress.boosters};
  setLevelId(id);setState(next);setPaused(false);setBoosterMode(null);setSwapFirst(null);clearNotice();
 },[progress.unlockedLevel,progress.boosters]);
 const toMap=()=>{cancelPlayback();setState(null);setLevelId(null);setPaused(false);setBoosterMode(null);setSwapFirst(null);clearNotice();};
 const retry=()=>{if(!level)return;cancelPlayback();const next=createLevelState(level);next.boosters={...progress.boosters};setState(next);setPaused(false);setBoosterMode(null);setSwapFirst(null);clearNotice();};
 const finishWin=useCallback((nextState,selectedLevel)=>{
  nextState=finalizeDiamondWin(nextState,selectedLevel);
  setState(nextState);
  if(practice)return;
  const stars=starsFor(selectedLevel,nextState.score);
  const id=selectedLevel.id;
  const previous=progress.results[id];
  const {loot,boosters}=diamondLoot(id,previous?.stars,stars,nextState.boosters);
  const results={...progress.results,[id]:{stars:Math.max(previous?.stars||0,stars),score:Math.max(previous?.score||0,nextState.score),completedAt:new Date().toISOString()}};
  const next={...progress,unlockedLevel:Math.max(progress.unlockedLevel,Math.min(100,id+1)),results,boosters};
  if(!practice)saveThomDiamondProgress(next);
  setProgress(next);
  setState({...nextState,boosters,loot});
  const scores=Object.values(results);
  const result={gameId:'thom-diamond',gameName:'Thơm Lấp Lánh',variant:'level-'+id,variantLabel:'Màn '+id,
   title:'Hoàn thành màn '+id,summary:stars+' sao · '+selectedLevel.name,eligible:true,metricKind:'score',
   metricValue:nextState.score,metricLabel:fmt(nextState.score)+' điểm',details:{won:true,level:id,stars}};
  onEvent?.({type:'thom_diamond_level_win',level:id,stars,score:nextState.score,result,levelCount:scores.length,
   perfectCount:scores.filter(r=>r.stars===3).length,completed:id===100?'thom-diamond':undefined});
 },[onEvent,practice,progress]);
 // Invalid moves animate briefly; cancel their timer before any new move or navigation.
 const showInvalid=(indices)=>{
  if(invalidTimer.current!==null)clearTimeout(invalidTimer.current);
  setView({type:'invalid',board:state.board,indices});
  setState(s=>({...s,selected:null}));
  invalidTimer.current=setTimeout(()=>{invalidTimer.current=null;setView(null);},150);
 };
 const doSwap=(from,to)=>{
  if(!state||paused||busyRef.current||state.phase!=='playing')return;
  if(boosterMode){
   if(boosterMode==='swap'){
    if(swapFirst===null){setSwapFirst(to);showNotice('Rồi, chạm thêm quân muốn đổi với quân vừa chọn nha!',4500);return;}
    const updated=applySwapBooster(state,swapFirst,to,level);
    if(updated!==state){playBooster(updated,'swap',[swapFirst,to]);}
    else {setSwapFirst(null);showNotice('Hai quân này không đổi chỗ được rồi. Chim cá chọn cặp khác nha!');}
    return;
   }
   const updated=applyBooster(state,boosterMode,to,level);if(updated!==state){playBooster(updated,boosterMode,[to]);}
   else showNotice('Ô này không dùng búa được rồi, chim cá chọn ô khác nha!');
   return;
  }
  if(from===to){
   if(state.selected!==null&&state.selected!==to){const result=swapAndResolve(state,state.selected,to,level);if(result.ok){playResult(result,level);}else {showInvalid([state.selected,to]);}}
   else setState(s=>({...s,selected:s.selected===to?null:to}));
   return;
  }
  const result=swapAndResolve(state,from,to,level);
  if(!result.ok){showInvalid([from,to]);return;}
  playResult(result,level);
 };
 useEffect(()=>{if(state?.phase==='lost')setBoosterMode(null);},[state?.phase]);
 const onCellPointerDown=(index,e)=>{if(state?.phase!=='playing'||paused||busyRef.current)return;dragStart.current={index,x:e.clientX,y:e.clientY};if(boardRef.current?.setPointerCapture)boardRef.current.setPointerCapture(e.pointerId);};
 const onBoardPointerUp=e=>{if(!dragStart.current||busyRef.current)return;const from=dragStart.current.index;dragStart.current=null;const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.tkc-cell');const to=hit?Number(hit.dataset.index):from;doSwap(from,Number.isInteger(to)?to:from);};
 const onCellPointerCancel=()=>{dragStart.current=null;};
 const useBooster=type=>{
  if(!state||paused||busyRef.current||state.phase!=='playing')return;
  if((state.boosters?.[type]||0)<=0){showNotice('Món này hết rồi, chim cá thử món khác nha!');return;}
  if(type==='extra'){const updated=applyBooster(state,type,null,level);playBooster(updated,type);return;}
  if(type==='shuffle'){const updated=applyBooster(state,type,null,level);playBooster(updated,type,Array.from({length:49},(_,i)=>i));return;}
  setBoosterMode(type);setSwapFirst(null);showNotice(type==='swap'?'Chọn một quân muốn đổi chỗ nha, chim cá!':'Chim cá muốn gõ ô nào? Chạm vào ô đó nha!',4500);
 };
 const practiceBanner=practice?<aside className="tkc-practice-banner"><span>ADMIN · CHƠI THỬ · Không lưu kết quả</span><button className="secondary-button" onClick={onExitPractice}>Tắt chế độ thử</button></aside>:null;
 if(!state||!level)return <>{practiceBanner}<MapScreen progress={progress} onStart={startLevel} onHome={onHome}/></>;
 const stars=state.phase==='won'?starsFor(level,state.score):0;
 const board=view?.board||state.board;
 const visibleObjectives=view?.objectives||state.objectives;
 const visibleScore=view?.score??state.score;
 const totalObjectiveUnits=visibleObjectives.reduce((sum,o)=>sum+Math.max(0,Number(o.target)||0),0);
 const completedObjectiveUnits=visibleObjectives.reduce((sum,o)=>sum+Math.min(Math.max(0,Number(o.current)||0),Math.max(0,Number(o.target)||0)),0);
 const objectivePercent=totalObjectiveUnits?Math.min(100,Math.round(completedObjectiveUnits/totalObjectiveUnits*100)):100;
 const objectivesDone=visibleObjectives.every(o=>o.current>=o.target);
 const scoreForTwo=Number(level.score2)||0,scoreForThree=Number(level.score3)||0;
 const milestones=[
  {label:'1 sao',caption:'0 điểm',reached:true,position:0},
  {label:'2 sao',caption:`${fmt(scoreForTwo)} điểm`,reached:visibleScore>=scoreForTwo,position:scoreForTwo/Math.max(1,scoreForThree)*100},
  {label:'3 sao',caption:`${fmt(scoreForThree)} điểm`,reached:visibleScore>=scoreForThree,position:100}
 ];
 const starProgress=Math.min(100,Math.max(0,visibleScore/Math.max(1,scoreForThree)*100));
 const fxIndices=new Set(view?.indices||[]);
 const isBoosterImpact=view?.type==='booster'&&view.stage==='impact';
 const isBreakFrame=view?.type==='clear'||(isBoosterImpact&&view.booster==='hammer');
 const drops=new Map();
 if(view?.type==='drop'){
  const oldPositions=new Map();(view.previous||[]).forEach((cell,i)=>{if(cell.piece)oldPositions.set(cell.piece.id||cell.piece, i);});
  board.forEach((cell,i)=>{if(cell.piece){const prev=oldPositions.get(cell.piece.id||cell.piece);if(prev===undefined)drops.set(i,{distance:-(Math.floor(i/7)+1),spawned:true});else if(prev!==i)drops.set(i,{distance:Math.floor(prev/7)-Math.floor(i/7),spawned:false});}});
 }

 return <main className="tkc-page tkc-game-page">
  {practiceBanner}
  <div className="tkc-game-top"><button className="back-link" onClick={toMap}>← Về bản đồ</button><div className="tkc-game-brand"><Icon name="gem"/> THƠM LẤP LÁNH</div><button className="tkc-pause-button" onClick={()=>setPaused(true)} disabled={state.phase!=='playing'||busy}><Icon name="pause" size={16}/> Tạm dừng</button></div>
  <header className="tkc-level-header"><div><span className="eyebrow">CHẶNG {level.world} · MÀN {level.worldLevel}/25 {level.kind==='Boss'?'· BOSS':''}</span><h1>{level.name}</h1></div><div className="tkc-level-number-badge">{level.id}<small>/100</small></div></header>
  <section className="tkc-live-panel" aria-label="Tiến độ, điểm và sao của màn chơi">
   <div className="tkc-slim-stats"><span>Lượt còn <b>{state.movesLeft}</b></span><span>Điểm hiện tại <b>{fmt(visibleScore)}</b></span></div>
   <div className="tkc-star-rail">
    <div className="tkc-score-track" role="progressbar" aria-label="Tiến độ điểm và sao dự kiến" aria-valuenow={Math.round(starProgress)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${fmt(visibleScore)} điểm; ${starsFor(level,visibleScore)} sao dự kiến nếu qua màn`}><span className="tkc-score-track-fill" style={{width:`${starProgress}%`}}/></div>
    {milestones.map((m,i)=><div key={m.label} className={`tkc-rail-milestone ${m.reached?'reached':''}`} style={{left:`${m.position}%`}} title={`${m.label}: ${m.caption} · Dự kiến nếu qua màn`}>
     <svg className="tkc-score-star" viewBox="0 0 100 100" role="img" aria-label={`${m.label}: ${m.reached?'Đủ điểm, nhận khi qua màn':m.caption}`}><path d="M50 5 64 33 95 38 73 60 78 92 50 77 22 92 27 60 5 38 36 33Z"/></svg>
     <small>{m.caption}</small>
    </div>)}
   </div>
   <p className="tkc-rail-note">Sao dự kiến · Qua màn nhận ít nhất 1 sao + thưởng lượt dư.</p>
  </section>
  <section className="tkc-objectives" aria-label="Nhiệm vụ màn chơi">{visibleObjectives.map((o,i)=>{const tileId=objectiveTileId(o);const done=o.current>=o.target;const percent=o.target?Math.min(100,Math.round(o.current/o.target*100)):100;return <div key={`${o.type}-${o.order}-${i}`} className={`tkc-objective-card ${done?'complete':''} ${o.type==='COLLECT'?'collect':''}`}>
   {o.type==='COLLECT'?<div className="tkc-objective-face"><img src={tileImages?.[tileId]||TILE_SRC(tileId||'tkc_01')} alt={`Hình Thơm cần gom ${tileId||''}`} draggable="false"/><small>CẦN GOM</small></div>:<ObjectiveIcon objective={o}/>}
   <div className="tkc-objective-copy"><strong>{objectiveTitle(o)}</strong><small>{objectiveHint(o)}</small><div className="tkc-objective-mini-track"><span style={{width:`${percent}%`}}/></div></div>
   <b className="tkc-objective-count"><small>{done?'Xong!':'Đã làm'}</small>{Math.min(o.current,o.target)}/{o.target}</b>
  </div>;})}</section>
  <section className={`tkc-board-wrap ${boosterMode?'booster-active':''} ${busy?'tkc-animating':''}`}>
   <div ref={boardRef} className={`tkc-board tkc-phase-${view?.type||'idle'} tkc-special-${view?.special||'none'} tkc-booster-${view?.type==='booster'?view.booster:'none'} tkc-stage-${view?.stage||'none'}`} role="grid" aria-label="Bàn ghép 7 nhân 7" onPointerUp={onBoardPointerUp} onPointerCancel={onCellPointerCancel}>{board.map((cell,index)=>{
    const selected=state.selected===index,blocked=cell.speaker>0;
    const oldCell=view?.previous?.[index];
    const damageTypes=isBreakFrame?damagedBlockers(oldCell,cell):[];
    const blockerFx=damageTypes[0]||'';
    const shuffleMovable=(view?.type==='reshuffle'||view?.type==='booster'&&view.booster==='shuffle')&&cell.piece&&!cell.piece.prop&&!cell.piece.special&&!cell.piece.lock&&!cell.piece.ice&&!cell.speaker;
    return <button key={index} type="button" role="gridcell" data-index={index} style={view?.type==='drop'?{'--tkc-fall':`${(drops.get(index)?.distance||0)*100}%`}:view?.type==='swap'&&fxIndices.has(index)?{'--tkc-swap-x':`${(index===view.from?view.to%7-index%7:view.from%7-index%7)*100}%`,'--tkc-swap-y':`${(index===view.from?Math.floor(view.to/7)-Math.floor(index/7):Math.floor(view.from/7)-Math.floor(index/7))*100}%`}:undefined} className={`tkc-cell ${view?.type==='drop'&&drops.has(index)?'tkc-drop-moved':''} ${view?.type==='drop'&&drops.get(index)?.spawned?'tkc-drop-spawned':''} ${fxIndices.has(index)?'tkc-fx-hit':''} ${blockerFx?`tkc-fx-${blockerFx}`:''} ${view?.type==='clear'&&cell.piece?.special&&!oldCell?.piece?.special?'tkc-special-created':''} ${shuffleMovable?'tkc-shuffle-movable':''} ${selected&&!busy?'selected':''} ${blocked?'speaker-cell':''} ${cell.dust?'has-dust':''} ${cell.piece?.ice?'has-ice':''} ${cell.piece?.lock?'has-lock':''} ${cell.piece?.prop?'has-prop':''} ${level.props>0&&index>=42&&(level.exitColumns||[2,3,4]).includes(index%7)?'tkc-exit-cell':''} ${boosterMode&&!blocked?'booster-target':''}`} onPointerDown={e=>onCellPointerDown(index,e)} aria-label={blocked?`Thùng loa ${cell.speaker} lớp`:`Ô ${index+1}${cell.piece?.tile||''}`} disabled={state.phase!=='playing'||paused||busy}>
      {blocked?<><img className="tkc-speaker-icon" src={DIAMOND_GAMEPLAY_ASSETS.speaker} alt="" aria-hidden="true" draggable="false"/><small className="tkc-blocker-count" title={`${cell.speaker} lớp loa`}>{cell.speaker}</small></>:<TileFace piece={cell.piece} tileImages={tileImages}/>}
      {cell.dust>0&&<span className="tkc-dust-overlay" title={`Bụi ${cell.dust} lớp`}><img src={DIAMOND_GAMEPLAY_ASSETS.dust} alt="" draggable="false"/>{cell.dust>1&&<small className="tkc-blocker-count">{cell.dust}</small>}</span>}
      {cell.piece?.ice>0&&<span className="tkc-ice-overlay" title={`Băng ${cell.piece.ice} lớp`}><img src={DIAMOND_GAMEPLAY_ASSETS.ice} alt="" draggable="false"/>{cell.piece.ice>1&&<small className="tkc-blocker-count">{cell.piece.ice}</small>}</span>}
      {cell.piece?.lock>0&&<span className="tkc-lock-overlay" title={`Khóa ${cell.piece.lock} lớp`}><img src={DIAMOND_GAMEPLAY_ASSETS.lock} alt="" draggable="false"/>{cell.piece.lock>1&&<small className="tkc-blocker-count">{cell.piece.lock}</small>}</span>}
      <BlockerDamageVisual types={damageTypes}/>
      {isBreakFrame&&fxIndices.has(index)&&!damageTypes.length&&<span className="tkc-plain-hit" aria-hidden="true"/>}
     </button>;
   })}<BoosterVisual view={view}/><SpecialVisual view={view}/></div>
  </section>
  <div className={`tkc-feedback ${notice||view?.type==='special'||view?.type==='booster'?'has-feedback':''}`}>
   {(view?.type==='special'||view?.type==='booster')&&<div className="tkc-combo-flash" aria-hidden="true">{view.type==='booster'?({hammer:'BÚA THƠM!',swap:'ĐỔI CHỖ NHA!',shuffle:'XÁO TRỘN NÈ!',extra:'+5 LƯỢT CHO CHIM CÁ!'})[view.booster]:view.combo?'CHIM CÁ COMBO!':({rocket:'THƠM TÊN LỬA!',bomb:'THƠM BOM!',rainbow:'THƠM CẦU VỒNG!',plane:'THƠM PHI CƠ!'})[view.special]}</div>}
  <div className="tkc-floating-notice-layer" role="status" aria-live="polite" aria-atomic="true">{notice&&<div className="tkc-floating-notice"><span aria-hidden="true">💬</span><b>{notice}</b></div>}</div>
  <div className="tkc-board-help">Chạm hai quân kề nhau hoặc vuốt để ghép Thơm <span>↔</span></div>
  </div>
  <section className="tkc-boosters"><div className="tkc-booster-heading"><b>Đạo cụ hỗ trợ</b><small>Qua màn lần đầu nhận 1 đạo cụ. Mỗi lần đạt 3 sao nhận thêm 1 Búa Thơm.</small></div><div className="tkc-booster-row"><button className={boosterMode==='hammer'?'active':''} disabled={state.phase!=='playing'||paused||busy} onClick={()=>useBooster('hammer')}><BoosterIcon type="hammer"/><b>Búa Thơm</b><small>x{state.boosters.hammer||0}</small></button><button className={boosterMode==='swap'?'active':''} disabled={state.phase!=='playing'||paused||busy} onClick={()=>useBooster('swap')}><BoosterIcon type="swap"/><b>Đổi chỗ</b><small>x{state.boosters.swap||0}</small></button><button disabled={state.phase!=='playing'||paused||busy} onClick={()=>useBooster('shuffle')}><BoosterIcon type="shuffle"/><b>Xáo trộn</b><small>x{state.boosters.shuffle||0}</small></button><button disabled={state.phase!=='playing'||paused||busy} onClick={()=>useBooster('extra')}><BoosterIcon type="extra"/><b>Thêm 5 lượt</b><small>x{state.boosters.extra||0}</small></button></div></section>
  <div className="tkc-footer-note"><button type="button" className="tkc-option" onClick={()=>{setSoundOn(v=>{localStorage.setItem('tkc-sound',v?'off':'on');return !v;});}}>{soundOn?'🔊 Âm thanh':'🔇 Tắt âm'}</button></div>
  {paused&&<div className="tkc-overlay"><section className="tkc-result-card"><span className="tkc-result-emoji">⏸️</span><h2>Chim cá nghỉ tay xíu nha!</h2><p>Chú giữ bàn rồi, khi nào sẵn sàng thì mình chơi tiếp.</p><button className="primary-button" onClick={()=>setPaused(false)}>Chơi tiếp nào!</button><button className="secondary-button" onClick={retry}>Thử lại nha!</button><button className="text-button" onClick={toMap}>Về bản đồ</button></section></div>}
  {(state.phase==='won'||state.phase==='lost')&&<ResultOverlay onShowRanking={practice?null:onShowRanking} won={state.phase==='won'} level={level} state={state} stars={stars} onRetry={retry} onMap={toMap} onNext={()=>{if(level.id<100)startLevel(level.id+1);else toMap();}}/>}
 </main>;
}
