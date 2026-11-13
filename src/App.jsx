import {isNewRecord} from './effects/effectRules.js';
import {GameEffects,useResultDelay} from './effects/GameEffects.jsx';
import AlbumsPage from './AlbumsPage';
import { MinerGame, MinerRewardDialog } from './games/MinerGame.jsx';
import {localRankings,rankUnit} from './gameRankings';
import {migrateLocalLevelRecords} from './levelLabels';
import {getPersonalHistory} from './personalHistory';
import { useSound } from './hooks/useSound';
import { resolveAlbum } from './albumUtils';
import OnetGame from './games/OnetGame.jsx';
import Admin from './Admin';
import { DEFAULT_IMAGE, loadAssets, loadGallery, CLOUD, verifyAdmin } from './assetStore';
import { DEFAULT_CONFIG, getProgress, reconcileProgress, loadGameConfig, trackEvent, youtubeEmbed } from './gameFeatures';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LeaderboardPage, { LeaderboardResultModal } from './Leaderboard';
import { getPersonalBests, savePersonalBest, savePersonalRun } from './leaderboards';
import { getVisibleGames, getVisibleRewards } from './gameVisibility';
import Icon from './Icon';
import { GAMES } from './games/catalog.js';
import { SiteIcon } from './components/GameUI.jsx';
import { MinesGame } from './games/MinesGame.jsx';
import { MoleGame } from './games/MoleGame.jsx';
import { TicGame } from './games/TicGame.jsx';
import { ReactionGame } from './games/ReactionGame.jsx';
import { PuzzleGame } from './games/PuzzleGame.jsx';
import { ConnectFourGame } from './games/ConnectFourGame.jsx';
import { SimonSaysGame } from './games/SimonSaysGame.jsx';
import { JigsawGame } from './games/JigsawGame.jsx';
import ThomDiamondGame from './games/ThomDiamondGame.jsx';

const getGameIdFromPath=()=>{const match=window.location.pathname.match(/^\/games\/([^/]+)\/?$/);if(!match)return null;const id=decodeURIComponent(match[1]);return GAMES.some(game=>game.id===id)?id:null;};

const UnoGame=React.lazy(()=>import('./games/UnoGame.jsx').then(module=>({default:module.UnoGame})));
const getRouteFromPath=()=>{const path=window.location.pathname;if(path==='/albums')return 'albums';if(path==='/admin')return 'admin';if(path==='/collection')return 'collection';if(path==='/leaderboard')return 'leaderboard';return 'home';};

const STORE = 'thom-mini-hub-v1';

const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };

const writeStore = (patch) => { const old=readStore(); localStorage.setItem(STORE, JSON.stringify({...old,...patch})); };

const asDepText = (value) => typeof value==='string' ? value.replace(/điểm/gi,'dép').replace(/Thắng AI/gi,'Thắng chú Thơm').replace(/AI\s+/gi,'Đấu với chú Thơm · ').replace(/Máy chiến thắng/gi,'Chú Thơm chiến thắng').replace(/Máy thắng/gi,'Chú Thơm thắng').replace(/Lượt của Máy/gi,'Lượt của chú Thơm').replace(/Đấu máy/gi,'Đấu với chú Thơm').replace(/Máy đang suy nghĩ/gi,'Chú Thơm đang suy nghĩ').replace(/Máy đã nối đủ bốn quân/gi,'Chú Thơm đã nối đủ bốn quân') : value;

function IconButton({children,onClick,label,active=false}) { return <button className={`icon-button ${active?'active':''}`} onClick={onClick} aria-label={label} title={label}>{children}</button>; }

function Header({onAlbums,onHome,sound,setSound,images,onCollection,onLeaderboard}) { return <header className="topbar"><button className="brand" onClick={onHome}><span className="brand-mark"><SiteIcon slot="logo" images={images} fallbackImage={DEFAULT_IMAGE}/></span><span><b>THƠM</b><small>PLAYGROUND</small></span></button><div className="top-actions"><button className="nav-home" aria-label="Trang chủ" onClick={onHome}><SiteIcon slot="home" images={images} fallback="home"/> <span>Trang chủ</span></button><button className="nav-home" aria-label="Bảng xếp hạng" onClick={onLeaderboard}><SiteIcon slot="trophy" images={images} fallback="trophy"/> <span>Bảng xếp hạng</span></button><button className="nav-home" aria-label="Thành tựu" title="Thành tựu" onClick={onCollection}><Icon name="medal" size={20}/> <span>Thành tựu</span></button><button className="nav-home" aria-label="Bộ sưu tập" title="Bộ sưu tập" onClick={()=>onAlbums()}><Icon name="gallery" size={18}/><span>Bộ sưu tập</span></button><IconButton label={sound?'Tắt âm thanh':'Bật âm thanh'} active={sound} onClick={()=>setSound(!sound)}><SiteIcon slot={sound?'sound-on':'sound-off'} images={images} fallback={sound?'volume':'volume-off'}/></IconButton></div></header>; }


function Home({onChoose,records,images,onLeaderboard,progress,albums,games}) {
 const [expanded,setExpanded]=useState(false);
 const totals=useMemo(()=>{
  const rows=getPersonalBests().map(b=>({game_id:b.gameId,variant:b.variant,metric_kind:b.metricKind,metric_value:b.metricValue,player_id:'local',details:{scoreVersion:2,...b.details}}));
  for(const game of ['puzzle','jigsaw']){
   for(const [id,item] of Object.entries(progress[game+'Collection']||{})){
    for(const mode of ['easy','hard'])if(item[mode])rows.push({game_id:game,variant:id+'-'+mode,metric_kind:'steps',metric_value:1,player_id:'local'});
   }
  }
  return games.flatMap(g=>{
   const [rank]=localRankings(g.id,rows,albums[g.id]||[],'local');
   const score=g.id==='onet'&&progress.metrics.onet_total?progress.metrics.onet_total:rank?.score;
   if(score!=null)return [{game:g,label:score.toLocaleString('vi-VN')+' '+rankUnit(g.id)}];
   if(albums[g.id])return [];
   const old=asDepText(records?.[g.id]?.label);
   return old?[{game:g,label:'Kỷ lục: '+old}]:[];
  });
 },[records,progress,albums,games]);
 return <main className="home-page"><section className="hero"><div className="hero-copy"><div className="hero-title-row"><h1>Một chút vui,<br/><em>cả ngày thơm!</em></h1></div><p>Ghé chơi vài phút, thử tài phản xạ, đấu trí và khám phá các trò chơi nhỏ xinh cùng chú Thơm nhé.</p>{games.length>0&&<button className="primary-button" onClick={()=>onChoose(games[0].id)}><Icon name="play" size={17}/> Chơi ngay</button>}<div className="hero-foot"><span><Icon name="gamepad" size={14}/> {games.length} trò chơi</span><span><Icon name="clock" size={14}/> Chơi miễn phí</span></div></div><div className="hero-image"><img src={images.hero||DEFAULT_IMAGE} alt="Ảnh banner Thơm Playground"/></div></section>
  <section className="section-heading"><div><h2>Hôm nay chơi gì?</h2></div><span className="section-count">{String(games.length).padStart(2,'0')} GAMES <Icon name="sparkles" size={15}/></span></section>
  <section className="game-grid">{games.length===0&&<p className="no-games-message">Các trò chơi đang tạm đóng. Hẹn bạn quay lại nhé!</p>}{games.map(g=><button key={g.id} className={`game-card ${g.color}`} onClick={()=>onChoose(g.id)}><div className="card-top"><span className="game-number">{String(GAMES.indexOf(g)+1).padStart(2,'0')} / MINI GAME</span></div><div className="game-icon">{<img src={images[`card-${g.id}`]||(g.id==='thom-diamond'?'/thom-kim-cuong/tiles/tkc_01.webp':DEFAULT_IMAGE)} alt={`Hình ${g.name}`} loading="lazy"/>}</div><div className="game-card-info"><span className="game-en">{g.en}</span><h3>{g.name}</h3><p>{g.desc}</p><div className="card-meta"><span>{g.level}</span><span><Icon name="clock" size={13}/> {g.time}</span></div></div></button>)}</section>
  {totals.length>0&&<section className="home-records"><h2>Thành tích của bạn</h2><p>Thành tích trên thiết bị này</p>
   <div id="home-record-list">{(expanded?totals:totals.slice(0,3)).map(({game,label})=><button type="button" key={game.id} onClick={()=>onLeaderboard(game.id)} className="home-record-row"><Icon name={game.icon} size={20}/><span>{game.name}</span><strong>{label}</strong></button>)}</div>
   {totals.length>3&&<button type="button" className="home-record-more" aria-expanded={expanded} aria-controls="home-record-list" onClick={()=>setExpanded(!expanded)}>{expanded?'Thu gọn':`Xem thêm ${totals.length-3} trò`}</button>}
  </section>}
  <footer className="footer"><span>THƠM PLAYGROUND <b><Icon name="sparkles" size={12}/></b> BY CHAYSOCUNGQUACHVANTHOM</span></footer></main>; }

function Collection({onHome,config,progress,games=GAMES}){
 const unlocked=progress.unlocked||{};
 const visibleRewards=getVisibleRewards(config.rewards,games,GAMES);
 const groups=[...games.map(g=>({id:g.id,title:g.name,icon:g.icon,rewards:visibleRewards.filter(r=>r.game===g.id)})).filter(group=>group.rewards.length),...(games.length?[{id:'global',title:'Thử thách chung',icon:'trophy',rewards:visibleRewards.filter(r=>r.game==='all')}]:[])].filter(group=>group.rewards.length);
 const earned=visibleRewards.filter(r=>unlocked[r.id]).length;
 return <main className="collection-page"><button className="back-link" onClick={onHome}>Trang chủ</button>
  <div className="collection-heading achievement-page-heading"><span className="eyebrow">THƠM PLAYGROUND</span><h1><Icon name="medal" size={34}/> Thành tựu</h1><div className="achievement-total"><strong>{earned}</strong><span>/ {visibleRewards.length} huy hiệu đã đạt</span></div></div>
  <div className="collection-achievement-groups">{groups.map(group=><section className="collection-achievement-group" key={group.id}><div className="collection-achievement-heading"><span className="collection-achievement-icon"><Icon name={group.icon} size={22}/></span><h2>{group.title}</h2><small>{group.rewards.filter(r=>unlocked[r.id]).length}/{group.rewards.length}</small></div><div className="achievement-grid">{group.rewards.map(r=>{const ok=Boolean(unlocked[r.id]),current=progress.metrics?.[r.metric]||0,pct=Math.min(100,100*current/Math.max(1,r.target));const tier=r.tier||'bronze';return <article className={`achievement-card ${ok?'earned':''} tier-${tier}`} key={r.id}><div className="achievement-emblem" style={{'--achievement-progress':`${pct}%`}}><div className="achievement-emblem-inner"><span><Icon name={r.icon||group.icon||'medal'} size={27}/></span></div><i><Icon name={ok?'check':'sparkles'} size={12}/></i></div><div className="achievement-card-copy"><div className="achievement-card-meta"><span className={`achievement-tier tier-label-${tier}`}>{({bronze:'ĐỒNG',silver:'BẠC',gold:'VÀNG',legendary:'KIM CƯƠNG'})[tier]||'HUY HIỆU'}</span><span className={ok?'achievement-status earned':'achievement-status'}>{ok?'ĐÃ ĐẠT':'ĐANG THỬ THÁCH'}</span></div><h3>{r.title}</h3><p>{asDepText(r.description)}</p><div className="achievement-progress-track"><span style={{width:`${pct}%`}}/></div><small>{Math.min(current,r.target).toLocaleString('vi-VN')} / {Number(r.target).toLocaleString('vi-VN')}</small></div></article>;})}</div></section>)}</div>
 </main>;
}

function RadioPlayer({radio,images}){
 const [open,setOpen]=useState(false),[audioOn,setAudioOn]=useState(false),[iframeReady,setIframeReady]=useState(false);
 const iframeRef=useRef(null),embed=youtubeEmbed(radio?.youtubeUrl||'');
 const playerUrl=useMemo(()=>{
  if(!embed)return '';
  const url=new URL(embed);
  url.searchParams.set('autoplay','1');
  url.searchParams.set('mute','1');
  url.searchParams.set('playsinline','1');
  url.searchParams.set('enablejsapi','1');
  url.searchParams.set('origin',window.location.origin);
  return url.toString();
 },[embed]);
 useEffect(()=>{
  if(!radio?.enabled||!embed)return;
  const unlock=(event)=>{if(event.target?.closest?.('.radio-volume'))return;setAudioOn(true);};
  window.addEventListener('pointerdown',unlock,{once:true});
  window.addEventListener('keydown',unlock,{once:true});
  return()=>{window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);};
 },[radio?.enabled,embed]);
 useEffect(()=>{
  if(!iframeReady||!iframeRef.current?.contentWindow)return;
  const command=(func)=>iframeRef.current?.contentWindow?.postMessage(JSON.stringify({event:'command',func,args:[]}),'*');
  if(audioOn){command('unMute');command('playVideo');}
  else command('mute');
 },[audioOn,iframeReady,playerUrl]);
 if(!radio?.enabled||!embed)return null;
 const toggleAudio=()=>setAudioOn(value=>!value);
 return <aside className={`radio-player ${open?'expanded':'compact'}`} aria-label="Trình phát nhạc">
  <div className="radio-controls">
   <button className="radio-toggle" onClick={()=>setOpen(o=>!o)} aria-expanded={open} aria-label={open?'Thu gọn trình phát nhạc':'Mở trình phát nhạc'}>
    <SiteIcon slot="radio" images={images} fallback="music"/><span>{radio.title||'Thơm Radio'}</span><small>{audioOn?'Đang bật tiếng':'Tự phát · Chạm để bật tiếng'}</small><b><Icon name={open?'chevron-down':'chevron-up'} size={16}/></b>
   </button>
   <button type="button" className="radio-volume" onClick={toggleAudio} aria-label={audioOn?'Tắt tiếng nhạc':'Bật tiếng nhạc'} title={audioOn?'Tắt tiếng nhạc':'Bật tiếng nhạc'}><Icon name={audioOn?'volume-2':'volume-x'} size={18}/></button>
  </div>
  <div className={`radio-video ${open?'':'collapsed'}`} aria-hidden={!open}>
   <iframe ref={iframeRef} title={radio.title||'Thơm Radio'} src={playerUrl} onLoad={()=>setIframeReady(true)} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>
  </div>
 </aside>;
}

function App(){
 const [diamondTest,setDiamondTest]=useState(false);
 const openDiamondTest=async()=>{
  if(!(CLOUD?await verifyAdmin():import.meta.env.DEV))throw new Error('Vui lòng đăng nhập bằng tài khoản admin.');
  setDiamondTest(true);setSelected('thom-diamond');setRoute('home');
  window.history.pushState({},'', '/games/thom-diamond');
 };

 const [selected,setSelected]=useState(getGameIdFromPath);
 const [albumTarget,setAlbumTarget]=useState(()=>window.location.hash.slice(1));
 const [route,setRoute]=useState(getRouteFromPath);
 const [images,setImages]=useState({});
 const [sound,setSound]=useState(()=>readStore().sound??false);
 const [records,setRecords]=useState(()=>readStore().records||{});
 const [config,setConfig]=useState(DEFAULT_CONFIG);
 const [configReady,setConfigReady]=useState(false);
 const [configError,setConfigError]=useState(false);
 const [gallery,setGallery]=useState([]);
 const [progress,setProgress]=useState(getProgress);
 const progressRef=useRef(progress);
 const [unlockToast,setUnlockToast]=useState([]);
 const [gameResult,setGameResult]=useState(null);
 const [pendingGameResult,setPendingGameResult]=useState(null);
 const visibleGameResult=useResultDelay(gameResult);
 const [postResultPrompt,setPostResultPrompt]=useState(null);
 const postResultActionsRef=useRef(null);
 const [gameRunKey,setGameRunKey]=useState(0);
 const playSound=useSound(sound);
 useEffect(()=>writeStore({sound}),[sound]);
 const refreshAssets=useCallback(async()=>{
  const [a,c,g]=await Promise.allSettled([loadAssets(),loadGameConfig(),loadGallery()]);
  if(a.status==='fulfilled')setImages(a.value);
  if(g.status==='fulfilled')setGallery(g.value);
  if(c.status==='fulfilled'){
   if(g.status==='fulfilled')migrateLocalLevelRecords({puzzle:c.value.puzzleAlbum,jigsaw:c.value.jigsawAlbum});
   const updated=reconcileProgress(progressRef.current,c.value,getPersonalHistory());
   const total=updated.metrics.onet_total||0;
   if(total)setRecords(records=>{
    const next={...records,onet:{label:total.toLocaleString('vi-VN')+' dép',value:total,kind:'score'}};
    writeStore({records:next});return next;
   });
   progressRef.current=updated;setProgress(updated);setConfig(c.value);setConfigReady(true);setConfigError(false);}
  else {setConfigReady(false);setConfigError(true);console.warn('Không thể tải trạng thái trò chơi.',c.reason);}
 },[]);
 useEffect(()=>{refreshAssets();},[refreshAssets]);
 useEffect(()=>{const link=document.querySelector('link[rel=icon]');if(link)link.href=images['icon-logo']||DEFAULT_IMAGE;},[images]);
 useEffect(()=>{const onPop=()=>{setDiamondTest(false);setAlbumTarget(window.location.hash.slice(1));setRoute(getRouteFromPath());setSelected(getGameIdFromPath());setPendingGameResult(null);setGameResult(null);setPostResultPrompt(null);postResultActionsRef.current=null;};window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[]);
 const saveRecord=useCallback((id,record)=>{setRecords(old=>{const current=old[id];const better=!current||(record.kind==='time'?record.value<current.value:record.kind==='steps'?record.value<current.value:record.value>current.value);const next=better?{...old,[id]:record}:old;writeStore({records:next});return next;});},[]);
 const onHome=()=>{setDiamondTest(false);if(window.location.pathname!=='/'){window.history.pushState({},'', '/');}setRoute('home');setSelected(null);setGameResult(null);setPendingGameResult(null);setPostResultPrompt(null);postResultActionsRef.current=null;};
 const onAlbums=(gameId='')=>{
  const path='/albums'+(gameId?'#'+gameId:'');
  if(window.location.pathname+window.location.hash!==path)window.history.pushState({},'',path);
  setAlbumTarget(gameId);setRoute('albums');setSelected(null);setGameResult(null);setPendingGameResult(null);setPostResultPrompt(null);postResultActionsRef.current=null;
 };
 const onCollection=()=>{window.history.pushState({},'', '/collection');setRoute('collection');setSelected(null);setGameResult(null);setPendingGameResult(null);setPostResultPrompt(null);postResultActionsRef.current=null;};
 const onLeaderboard=(gameId=selected)=>{window.history.pushState({},'',gameId?'/leaderboard?game='+encodeURIComponent(gameId):'/leaderboard');window.scrollTo(0,0);setRoute('leaderboard');setSelected(null);setGameResult(null);setPendingGameResult(null);setPostResultPrompt(null);postResultActionsRef.current=null;};
 const albums=useMemo(()=>({puzzle:resolveAlbum(config.puzzleAlbum,gallery),jigsaw:resolveAlbum(config.jigsawAlbum,gallery)}),[config,gallery]);
 const availableGames=getVisibleGames(GAMES,config.gameAvailability);
 const chooseGame=id=>{if(configReady&&config.gameAvailability?.[id]!==false){setDiamondTest(false);window.history.pushState({},'',`/games/${encodeURIComponent(id)}`);setRoute('home');setSelected(id);setGameResult(null);setPendingGameResult(null);setPostResultPrompt(null);postResultActionsRef.current=null;}};
 useEffect(()=>{if(selected&&configReady&&config.gameAvailability?.[selected]===false){setSelected(null);if(getGameIdFromPath()===selected)window.history.replaceState({},'','/');}},[selected,configReady,config.gameAvailability]);
 const onEvent=useCallback(event=>{const tracked=trackEvent(progressRef.current,event,config.rewards,availableGames.map(game=>game.id));progressRef.current=tracked.progress;setProgress(tracked.progress);if(tracked.unlockedNow.length)setUnlockToast(tracked.unlockedNow.map(x=>x.title));if(event.result){savePersonalRun(event.result);const previousBest=getPersonalBests(event.result.gameId).find(x=>x.variant===(event.result.variant||'default'));const personalBest=event.result.eligible?savePersonalBest(event.result):null;const result={...event.result,personalBest,isNewBest:isNewRecord(event.result,previousBest)};if(event.type==='thom_diamond_level_win'){setPendingGameResult(result);}else if(event.type==='miner_finish'&&event.won){setPendingGameResult({...result,rewardPhoto:event.rewardPhoto});}else if(event.type==='puzzle_level_win'||event.type==='jigsaw_level_win'||event.type==='onet_win'){setPendingGameResult(result);}else{setPendingGameResult(null);setGameResult(result);}}},[config]);
 useEffect(()=>{
  if(selected!=='miner'||route!=='home'||pendingGameResult?.gameId!=='miner')return;
  const timer=setTimeout(()=>{setGameResult(pendingGameResult);setPendingGameResult(null);},900);
  return ()=>clearTimeout(timer);
 },[pendingGameResult,selected,route]);
 const showPendingGameResult=fallbackResult=>{const result=pendingGameResult||fallbackResult;if(result){if(!pendingGameResult&&fallbackResult){savePersonalRun(fallbackResult);const personalBest=fallbackResult.eligible?savePersonalBest(fallbackResult):null;setGameResult({...fallbackResult,personalBest});}else setGameResult(result);}setPendingGameResult(null);};
 const runAgain=reset=>{setGameResult(null);setUnlockToast([]);if(typeof reset==='function')reset();};
 const restartGame=()=>{const id=gameResult?.gameId;setGameResult(null);setPostResultPrompt(null);postResultActionsRef.current=null;setUnlockToast([]);if(id){setSelected(id);setGameRunKey(v=>v+1);}};
 const closeLeaderboardResult=()=>{const result=gameResult;setGameResult(null);if(result&&['onet','puzzle','jigsaw','miner'].includes(result.gameId)){setPostResultPrompt({gameId:result.gameId,gameName:result.gameName,message:postResultActionsRef.current?.message,nextLabel:postResultActionsRef.current?.nextLabel||'Chơi Level tiếp theo'});}else setPostResultPrompt(null);};
 const choosePostResultAction=action=>{const actions=postResultActionsRef.current;setPostResultPrompt(null);if(action==='next'&&typeof actions?.next==='function')actions.next();else if(action==='choose'&&typeof actions?.choose==='function')actions.choose();else if(action==='home')onHome();};
 return <div className={`app-shell ${selected&&route==='home'?'game-active':''}`}><Header onAlbums={onAlbums} onHome={onHome} sound={sound} setSound={setSound} images={images} onCollection={onCollection} onLeaderboard={()=>onLeaderboard()}/>{route==='admin'?<Admin onHome={onHome} onUpdated={refreshAssets} onDiamondTest={openDiamondTest}/>:route==='albums'?(configReady?<AlbumsPage key={albumTarget} target={albumTarget} games={availableGames} config={config} gallery={gallery} progress={progress} onHome={onHome}/>:<main className="collection-page">Đang tải bộ sưu tập…</main>):route==='collection'?(!configReady?<main className="home-page"><p>Đang tải thành tựu…</p></main>:<Collection onHome={onHome} config={config} progress={progress} games={availableGames}/>):route==='leaderboard'?(!configReady?<main className="home-page"><p>Đang tải bảng xếp hạng…</p></main>:<LeaderboardPage games={availableGames.filter(game=>game.id!=='uno')} onetTotal={progress.metrics.onet_total||0} albums={albums} onHome={onHome}/>):!configReady?<main className="home-page"><section className="no-games-message">{configError?<><p>Chưa tải được danh sách trò chơi.</p><button className="secondary-button" onClick={refreshAssets}>Thử lại</button></>:<p>Đang tải trò chơi…</p>}</section></main>:!selected?<Home onChoose={chooseGame} games={availableGames} records={records} images={images} progress={progress} albums={albums} onLeaderboard={onLeaderboard}/>:<>
 {selected==='mines'&&<MinesGame key={`${selected}-${gameRunKey}`} onHome={onHome} playSound={playSound} saveRecord={saveRecord} images={images} onEvent={onEvent} onRestart={runAgain}/>}
 {selected==='mole'&&<MoleGame key={`${selected}-${gameRunKey}`} onHome={onHome} playSound={playSound} saveRecord={saveRecord} images={images} onEvent={onEvent} appearance={config.moleAppearance} onRestart={runAgain}/>}
 {selected==='tic'&&<TicGame key={`${selected}-${gameRunKey}`} onHome={onHome} playSound={playSound} saveRecord={saveRecord} images={images} onEvent={onEvent} onRestart={runAgain}/>}
 {selected==='reaction'&&<ReactionGame key={`${selected}-${gameRunKey}`} onHome={onHome} playSound={playSound} saveRecord={saveRecord} images={images} onEvent={onEvent} onRestart={runAgain}/>}
 {selected==='puzzle'&&<PuzzleGame playSound={playSound} onAlbums={onAlbums} key={`${selected}-${gameRunKey}`} onHome={onHome} saveRecord={saveRecord} images={images} album={resolveAlbum(config.puzzleAlbum,gallery)} puzzleProgress={progress.puzzleCollection||{}} postResultActionsRef={postResultActionsRef} onEvent={onEvent} onResultReady={showPendingGameResult} onRestart={runAgain}/>}
 {selected==='onet'&&<OnetGame playSound={playSound} onAlbums={onAlbums} key={`${selected}-${gameRunKey}`} onHome={onHome} saveRecord={saveRecord} images={images} album={resolveAlbum(config.onetAlbum,gallery)} postResultActionsRef={postResultActionsRef} onEvent={onEvent} onResultReady={showPendingGameResult} onRestart={runAgain}/>}
 {selected==='connect4'&&<ConnectFourGame key={`${selected}-${gameRunKey}`} onHome={onHome} images={images} playSound={playSound} onEvent={onEvent} onRestart={runAgain}/>}
 {selected==='simon'&&<SimonSaysGame key={`${selected}-${gameRunKey}`} onHome={onHome} images={images} playSound={playSound} onEvent={onEvent} onRestart={runAgain}/>}
 
 {selected==='uno'&&<React.Suspense fallback={<main className="uno-page">Đang mở JGKiD Uno…</main>}><UnoGame onEvent={onEvent} soundEnabled={sound} onToggleSound={()=>setSound(v=>!v)} onHome={onHome} assets={config.unoAssets} playSound={playSound}/></React.Suspense>}
 {selected==='thom-diamond'&&<ThomDiamondGame key={`${selected}-${gameRunKey}-${diamondTest}`} onShowRanking={pendingGameResult?.gameId==='thom-diamond'?()=>showPendingGameResult():null} practice={diamondTest} onExitPractice={()=>setDiamondTest(false)} onHome={onHome} images={images} adminCrops={config.thomDiamondCrops||{}} onEvent={onEvent}/>}
 {selected==='miner'&&<MinerGame postResultActionsRef={postResultActionsRef} key={`${selected}-${gameRunKey}`} onHome={onHome} images={images} album={resolveAlbum(config.minerAlbum,gallery)} playSound={playSound} saveRecord={saveRecord} onEvent={onEvent}/>}
 {selected==='jigsaw'&&<JigsawGame playSound={playSound} onAlbums={onAlbums} key={`${selected}-${gameRunKey}`} onHome={onHome} images={images} album={resolveAlbum(config.jigsawAlbum,gallery)} jigsawProgress={progress.jigsawCollection||{}} postResultActionsRef={postResultActionsRef} saveRecord={saveRecord} onEvent={onEvent} onResultReady={showPendingGameResult} onRestart={runAgain}/>}
 </>}{route==='home'&&gameResult?.rewardPhoto&&<MinerRewardDialog onAlbums={onAlbums} photo={gameResult.rewardPhoto} level={gameResult.details.level} onContinue={()=>setGameResult(current=>current&&({...current,rewardPhoto:null}))}/>}
 {route==='home'&&visibleGameResult&&!gameResult.rewardPhoto&&<LeaderboardResultModal playSound={playSound} onViewAlbum={gameResult.gameId==='miner'&&gameResult.details?.won?()=>onAlbums('miner'):undefined} albums={albums} result={gameResult} onClose={closeLeaderboardResult} onRestart={restartGame} onOpenBoard={()=>onLeaderboard()}/>}
 {route==='home'&&postResultPrompt&&<div className="overlay post-result-choice-overlay" role="dialog" aria-modal="true" aria-label="Chọn lượt chơi tiếp theo"><div className="result-card post-result-choice-card"><span className="result-emoji"><Icon name="gamepad-2" size={36}/></span><h2>Chơi tiếp nhé?</h2><p>{postResultPrompt.message||<>Bạn vừa hoàn thành <b>{postResultPrompt.gameName}</b>. Bạn muốn thử thách ở level tiếp theo hay chọn một level khác?</>}</p><div className="post-result-choice-actions"><button type="button" className="primary-button" onClick={()=>choosePostResultAction('next')}>{postResultPrompt.nextLabel}</button><button type="button" className="secondary-button" onClick={()=>choosePostResultAction('choose')}>Chọn Level khác</button><button type="button" className="text-button" onClick={()=>choosePostResultAction('home')}>Về trang chủ</button></div></div></div>}
 <GameEffects playSound={playSound} scope={`${route}-${selected}-${gameRunKey}`}/><RadioPlayer radio={config.radio} images={images}/>{unlockToast.length>0&&<div className="unlock-toast" role="status"><span><Icon name="trophy" size={16}/> Mở khóa thành tựu!</span><b>{unlockToast.join(", ")}</b><button onClick={()=>{setUnlockToast([]);onCollection();}}>Xem thành tựu</button><button aria-label="Đóng thông báo" onClick={()=>setUnlockToast([])}><Icon name="close" size={16}/></button></div>}<div className="global-footer">THƠM PLAYGROUND <span><Icon name="sparkles" size={12}/></span> CHƠI VUI NHÉ!</div></div>;
}

export default App;
