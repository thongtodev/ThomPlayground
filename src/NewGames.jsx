import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import Icon from './Icon';
import {loadGameSession,saveGameSession,clearGameSession,restoredPhase,resumePhase} from './gameSessions';
import {DEFAULT_IMAGE} from './assetStore';
import {renderSlotImage} from './imageTransforms';
import {CONNECT_COLS,CONNECT_ROWS,emptyConnectBoard,dropConnectDisc,connectFourWinner,connectBoardFull,chooseConnectFourMove} from './connectFourEngine';
import {shuffleJigsaw,swapJigsawPiecePositions} from './jigsawEngine';
import {buildJigsawPiecePath,isJigsawSolved,normalizeJigsawRotation} from './jigsawShapes';
import {canPlayJigsawDifficulty} from './puzzleProgress';

const GAME_META={
 connect4:{id:'connect4',name:'Bốn Quân Nhà Thơm',en:'CONNECT FOUR',desc:'Một cuộc đấu trí bắt đầu! Thả quân thật khéo, nối đủ 4 quân và đừng để đối thủ vượt mặt nhé!',icon:'connect4'},
 simon:{id:'simon',name:'Nhớ Lời Thơm',en:'SIMON SAYS',desc:'Chú Thơm sẽ phát tín hiệu theo một thứ tự bí mật. Bạn có nhớ và lặp lại chính xác được không?',icon:'simon'},
 jigsaw:{id:'jigsaw',name:'Mảnh Ghép Nhà Thơm',en:'JIGSAW PUZZLE',desc:'Bức hình đã bị chia thành nhiều mảnh lộn xộn. Hãy xoay, kéo thả và ghép lại thật khéo nhé!',icon:'jigsaw'},
};
function Intro({game,onHome,onStart,children,startDisabled=false,images={}}){return <main className="game-intro new-game-intro"><button className="back-link" onClick={onHome}>Tất cả trò chơi</button><section className="intro-card"><div className="intro-icon">{images[`icon-${game.id}`]?<img src={images[`icon-${game.id}`]} alt=""/>:<Icon name={game.icon} size={44}/>}</div><span className="eyebrow">{game.en} · THƠM PLAYGROUND</span><h1>{game.name}</h1><p>{game.desc}</p>{children}<button className="primary-button start-button" disabled={startDisabled} onClick={onStart}><Icon name="play" size={17}/> Bắt đầu chơi</button></section></main>;}
function Frame({game,onHome,onReset,onRestart,stats,controls,children}){return <main className="game-page new-game-page"><button className="back-link" onClick={onHome}>Trang chủ</button><header className="game-heading"><div><span className="eyebrow">{game.en}</span><h1>{game.name}</h1></div>{controls&&<div className="game-heading-actions">{controls}</div>}</header>{stats&&<div className="stats-row">{stats.map((s,i)=><div className="stat-box" key={i}><small>{s.label}</small><strong>{s.value}</strong></div>)}</div>}<section className="play-panel new-game-panel">{children}</section><div className="below-controls"><button className="secondary-button" onClick={()=>onRestart?onRestart(onReset):onReset?.()}><Icon name="reset" size={16}/> Chơi lại</button><button className="text-button" onClick={onHome}>Chọn game khác</button></div></main>;}
const difficultyName={easy:'Dễ',medium:'Trung bình',hard:'Khó'};

export function ConnectFourGame({onHome,images={},playSound=()=>{},onEvent=()=>{},onRestart}){
 const savedRef=useRef(loadGameSession('connect4'));const saved=savedRef.current;const resumeRef=useRef(resumePhase(saved));
 const [phase,setPhase]=useState(()=>restoredPhase(saved)),[mode,setMode]=useState(()=>saved?.mode||'ai'),[difficulty,setDifficulty]=useState(()=>saved?.difficulty||'medium'),[human,setHuman]=useState(()=>saved?.human||'R');
 const [board,setBoard]=useState(()=>saved?.board||emptyConnectBoard()),[turn,setTurn]=useState(()=>saved?.turn||'R'),[moves,setMoves]=useState(()=>saved?.moves||0),[outcome,setOutcome]=useState(()=>saved?.outcome||null);
 const lock=useRef(false),movesRef=useRef(saved?.moves||0),finished=useRef(false);
 useEffect(()=>{if(phase!=='paused'&&phase!=='ready'&&phase!=='over')resumeRef.current=phase;},[phase]);
 useEffect(()=>{if(phase==='playing'||phase==='paused')saveGameSession('connect4',{phase:phase==='paused'?resumeRef.current:phase,resumePhase:resumeRef.current,mode,difficulty,human,board,turn,moves,outcome});else clearGameSession('connect4');},[phase,mode,difficulty,human,board,turn,moves,outcome]);
 const reset=()=>{resumeRef.current='playing';lock.current=false;finished.current=false;movesRef.current=0;setBoard(emptyConnectBoard());setTurn('R');setMoves(0);setOutcome(null);setPhase('playing');};
 const finish=(nextBoard,winner,line=[],count=movesRef.current)=>{
  if(finished.current)return;finished.current=true;setPhase('over');setOutcome({winner,line});
  const eligible=winner!==null&&(mode==='local'||winner===human);
  const label=winner===null?'Ván hòa':mode==='ai'?(eligible?'Bạn chiến thắng':'Chú Thơm chiến thắng'):`Bên ${winner==='R'?'Đỏ':'Vàng'} chiến thắng`;
  onEvent({type:'connect4_finish',won:eligible,mode,difficulty,completed:'connect4',result:{gameId:'connect4',gameName:GAME_META.connect4.name,title:winner===null?'Hai bên hòa nhau!':mode==='ai'?(eligible?'Bạn đã nối đủ bốn quân!':'Chú Thơm đã nối đủ bốn quân!'):`${winner==='R'?'Đỏ':'Vàng'} đã nối đủ bốn quân!`,summary:`${mode==='ai'?`Đấu với chú Thơm · ${difficultyName[difficulty]}`:'Hai người chơi'} · ${count} lượt thả quân · ${label}.`,variant:`${mode}-${mode==='ai'?difficulty:'local'}`,variantLabel:mode==='ai'?`Đấu với chú Thơm · ${difficultyName[difficulty]}`:'Hai người chơi',metricKind:'score',metricValue:eligible?Math.max(1,100-count):0,metricLabel:eligible?`Thắng trong ${count} lượt`:'Chưa có chiến thắng',eligible,details:{mode,difficulty,winner,moves:count,rows:CONNECT_ROWS,cols:CONNECT_COLS}}});
  playSound(eligible?760:350,.12);
 };
 const makeMove=(col,player)=>{
  if(phase!=='playing'||finished.current||lock.current)return;
  const next=dropConnectDisc(board,col,player);if(!next)return;
  lock.current=true;const count=movesRef.current+1;movesRef.current=count;setMoves(count);setBoard(next);
  const win=connectFourWinner(next);
  if(win)finish(next,win.winner,win.cells,count);else if(connectBoardFull(next))finish(next,null,[],count);else{setTurn(player==='R'?'Y':'R');playSound(440,.06);}
 };
 useEffect(()=>{if(phase!=='playing'||mode!=='ai'||turn===(human)||outcome)return;const timer=setTimeout(()=>{const col=chooseConnectFourMove(board,turn,difficulty);if(col>=0)makeMove(col,turn);},260);return()=>clearTimeout(timer);},[phase,mode,turn,human,board,difficulty,outcome]);
 useEffect(()=>{lock.current=false;},[board,phase]);
 const settings=<div className="new-game-settings"><label>Chế độ<select value={mode} onChange={e=>setMode(e.target.value)}><option value="ai">Bạn đấu với chú Thơm</option><option value="local">Hai người cùng thiết bị</option></select></label>{mode==='ai'&&<><label>Độ khó của chú Thơm<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option></select></label><label>Quân của bạn<select value={human} onChange={e=>setHuman(e.target.value)}><option value="R">Đỏ · Đi trước</option><option value="Y">Vàng · Đi sau</option></select></label></>}</div>;
 if(phase==='ready')return <Intro game={GAME_META.connect4} onHome={onHome} onStart={reset} images={images}><div className="new-game-rules"><span><Icon name="grid"/> Bàn cờ có 7 cột và 6 hàng.</span><span><Icon name="hand"/> Mỗi lượt, thả một quân vào cột bạn chọn. Quân sẽ rơi xuống ô trống thấp nhất.</span><span><Icon name="target"/> Ai nối được 4 quân liền nhau theo hàng ngang, dọc hoặc chéo sẽ thắng.</span><span><Icon name="users"/> Đấu với chú Thơm ở 3 mức độ hoặc rủ bạn chơi cùng trên một thiết bị.</span><span><Icon name="smile"/> Dễ: đôi khi bỏ lỡ cơ hội. Trung bình: biết thắng hoặc chặn kịp lúc. Khó: tính toán nhiều nước và tạo thế gài bẫy.</span></div>{settings}</Intro>;
 const currentName=mode==='ai'?(turn===human?'Lượt của bạn':'Chú Thơm đang suy nghĩ'):(turn==='R'?'Lượt Đỏ':'Lượt Vàng');
 return <Frame game={GAME_META.connect4} onHome={onHome} onReset={reset} onRestart={onRestart} stats={[{label:'Lượt thả',value:moves},{label:'Bên đang chơi',value:turn==='R'?'Đỏ':'Vàng'},{label:'Độ khó',value:mode==='ai'?difficultyName[difficulty]:'2 người'}]} controls={<span className="level-chip">{mode==='ai'?`Chú Thơm · ${difficultyName[difficulty]}`:'Hai người chơi'}</span>}>
  <div className="connect4-status" role="status"><span className={`connect4-disc-mini ${turn==='R'?'red':'yellow'}`}/><b>{outcome?(outcome.winner===null?'Ván hòa':outcome.winner==='R'?'Đỏ thắng!':'Vàng thắng!'):currentName}</b></div>
  <div className="connect4-board-wrap"><div className="connect4-drop-row">{Array.from({length:CONNECT_COLS},(_,col)=><button key={col} type="button" className="connect4-drop-button" disabled={phase!=='playing'||Boolean(outcome)||board[0][col]!=null||(mode==='ai'&&turn!==human)} onClick={()=>makeMove(col,mode==='ai'?human:turn)} aria-label={`Thả quân vào cột ${col+1}`}>Thả</button>)}</div><div className="connect4-board" role="grid" aria-label="Bàn Bốn Quân Nhà Thơm">{board.map((row,r)=>row.map((disc,c)=>{const win=outcome?.line?.some(([rr,cc])=>rr===r&&cc===c);const src=disc==='R'?images['connect4-red']:disc==='Y'?images['connect4-yellow']:null;return <div key={`${r}-${c}`} role="gridcell" aria-label={`Hàng ${r+1}, cột ${c+1}`} className={`connect4-cell ${win?'winning':''}`}><span className={`connect4-token ${disc==='R'?'red':disc==='Y'?'yellow':'empty'}`}>{disc&&src?<img src={src} alt="" draggable="false"/>:disc?<b>{disc==='R'?'Đ':'V'}</b>:null}</span></div>;}))}</div></div>
  <p className="connect4-hint">Chọn một cột để thả quân xuống nhé! Nhớ để mắt đến 4 quân liên tiếp của đối thủ.</p>{outcome&&<div className="inline-result"><b>{outcome.winner===null?'Ván đấu hòa!':`Bên ${outcome.winner==='R'?'Đỏ':'Vàng'} đã nối đủ 4 quân.`}</b><button className="primary-button" onClick={reset}>Ván mới</button></div>}
  {phase==='paused'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="save" size={36}/></span><h2>Bạn còn một ván đang chơi dở</h2><p>Bàn cờ và lượt đi trước đã được lưu.</p><button className="primary-button" onClick={()=>setPhase(resumeRef.current)}>Tiếp tục ván trước</button><button className="text-button" onClick={reset}>Chơi ván mới</button></div></div>}
 </Frame>;
}

export function SimonSaysGame({onHome,images={},playSound=()=>{},onEvent=()=>{},onRestart}){
 const savedRef=useRef(loadGameSession('simon'));const saved=savedRef.current;const resumeRef=useRef(resumePhase(saved,'playback'));
 const [phase,setPhase]=useState(()=>restoredPhase(saved)),[difficulty,setDifficulty]=useState(()=>saved?.difficulty||'easy'),[sequence,setSequence]=useState(()=>saved?.sequence||[]),[playIndex,setPlayIndex]=useState(()=>saved?.playIndex||0),[active,setActive]=useState(-1),[wrong,setWrong]=useState(-1),[inputIndex,setInputIndex]=useState(()=>saved?.inputIndex||0),[lives,setLives]=useState(()=>saved?.lives??3),[round,setRound]=useState(()=>saved?.round||0),[completedRounds,setCompletedRounds]=useState(()=>saved?.completedRounds||0),[won,setWon]=useState(false);
 const finished=useRef(false),inputLock=useRef(false),feedbackTimer=useRef(null);
 useEffect(()=>{if(phase!=='paused'&&phase!=='ready'&&phase!=='result')resumeRef.current=phase;},[phase]);
 useEffect(()=>{if(['playback','input','paused'].includes(phase))saveGameSession('simon',{phase:phase==='paused'?resumeRef.current:phase,resumePhase:resumeRef.current,difficulty,sequence,playIndex,inputIndex,lives,round,completedRounds});else clearGameSession('simon');},[phase,difficulty,sequence,playIndex,inputIndex,lives,round,completedRounds]);
 const settings={easy:{target:10,speed:1200,lives:3},medium:{target:15,speed:800,lives:2},hard:{target:20,speed:500,lives:1}}[difficulty];
 const clearFeedback=()=>{if(feedbackTimer.current){clearTimeout(feedbackTimer.current);feedbackTimer.current=null;}};
 useEffect(()=>()=>clearFeedback(),[]);
 const begin=()=>{resumeRef.current='playback';clearFeedback();finished.current=false;inputLock.current=false;setSequence([Math.floor(Math.random()*4)]);setPlayIndex(0);setInputIndex(0);setLives(settings.lives);setRound(1);setCompletedRounds(0);setActive(-1);setWrong(-1);setWon(false);setPhase('playback');};
 const finish=(success,remainingLives=lives,scoreOverride=success?settings.target:completedRounds)=>{if(finished.current)return;clearFeedback();finished.current=true;setWon(success);setPhase('result');setActive(-1);setWrong(-1);const score=scoreOverride;setCompletedRounds(score);onEvent({type:'simon_finish',won:success,difficulty,completed:success?'simon':undefined,result:{gameId:'simon',gameName:GAME_META.simon.name,title:success?'Bạn nhớ siêu giỏi!':'Hết lượt mất rồi!',summary:`${difficultyName[difficulty]} · Hoàn thành ${score}/${settings.target} vòng · Còn ${remainingLives} mạng.`,variant:difficulty,variantLabel:difficultyName[difficulty],metricKind:'score',metricValue:score,metricLabel:`${score} vòng`,eligible:true,details:{difficulty,score,target:settings.target,lives:remainingLives,success}}});playSound(success?800:320,.12);};
 const loseLife=()=>{if(finished.current)return;clearFeedback();if(lives<=1){setLives(0);finish(false,0);return;}setLives(v=>v-1);setInputIndex(0);setPlayIndex(0);setActive(-1);setWrong(-1);setPhase('playback');playSound(260,.12);};
 useEffect(()=>{if(phase!=='playback')return;if(playIndex>=sequence.length){setActive(-1);setInputIndex(0);setPhase('input');return;}const item=sequence[playIndex];setActive(item);playSound([390,490,590,720][item],.1);const off=setTimeout(()=>setActive(-1),Math.max(110,settings.speed*.42));const next=setTimeout(()=>setPlayIndex(i=>i+1),settings.speed);return()=>{clearTimeout(off);clearTimeout(next);};},[phase,playIndex,sequence,settings.speed,playSound]);
 useEffect(()=>{inputLock.current=false;},[phase,inputIndex]);
 const press=index=>{if(phase!=='input'||inputLock.current||finished.current)return;inputLock.current=true;const correct=sequence[inputIndex]===index;if(!correct){setWrong(index);playSound(180,.14);feedbackTimer.current=setTimeout(()=>{feedbackTimer.current=null;setWrong(-1);loseLife();},450);return;}setWrong(-1);setActive(index);playSound([390,490,590,720][index],.08);feedbackTimer.current=setTimeout(()=>{feedbackTimer.current=null;setActive(-1);const next=inputIndex+1;if(next>=sequence.length){if(sequence.length>=settings.target){finish(true,lives,settings.target);}else{setCompletedRounds(sequence.length);setSequence(old=>[...old,Math.floor(Math.random()*4)]);setRound(sequence.length+1);setPlayIndex(0);setInputIndex(0);setPhase('playback');}}else setInputIndex(next);},260);};
 if(phase==='ready')return <Intro game={GAME_META.simon} onHome={onHome} onStart={begin} images={images}><div className="new-game-rules"><span><Icon name="eye"/> Nhìn thật kỹ 4 biểu cảm của chú Thơm lần lượt phát sáng.</span><span><Icon name="hand"/> Chạm lại các hình theo đúng thứ tự vừa xuất hiện.</span><span><Icon name="layers"/> Mỗi vòng lại thêm một tín hiệu mới, thử thách trí nhớ của bạn hơn một chút.</span><span><Icon name="heart"/> Trả lời sai sẽ mất một mạng, nên nhớ tập trung nhé!</span></div><label className="new-game-select">Độ khó<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="easy">Dễ · 10 tín hiệu · 3 mạng</option><option value="medium">Trung bình · 15 tín hiệu · 2 mạng</option><option value="hard">Khó · 20 tín hiệu · 1 mạng</option></select></label><p className="simon-response-note">Cứ từ từ ghi nhớ nhé, bạn không bị giới hạn thời gian trả lời đâu!</p></Intro>;
 if(phase==='result')return <Frame game={GAME_META.simon} onHome={onHome} onReset={begin} onRestart={onRestart} stats={[{label:'Vòng hoàn thành',value:completedRounds},{label:'Mạng còn lại',value:lives},{label:'Mục tiêu',value:settings.target}]}><div className="simon-result"><div className="simon-result-icon"><Icon name={won?'trophy':'brain'} size={42}/></div><h2>{won?'Xuất sắc! Bạn đã nhớ hết!':'Cố gắng thêm lần nữa nhé!'}</h2><p>Bạn đã hoàn thành {completedRounds}/{settings.target} vòng ở mức {difficultyName[difficulty]}.</p><button className="primary-button" onClick={begin}>Chơi lại</button></div></Frame>;
 return <Frame game={GAME_META.simon} onHome={onHome} onReset={begin} onRestart={onRestart} stats={[{label:'Vòng',value:`${round}/${settings.target}`},{label:'Mạng',value:'♥ '.repeat(lives).trim()||'0'},{label:'Đã nhớ',value:`${inputIndex}/${sequence.length}`}]} controls={<span className="level-chip">{difficultyName[difficulty]}</span>}>
  <div className={`simon-status ${phase}`} role="status"><b>{phase==='playback'?'Hãy quan sát chuỗi tín hiệu':'Lặp lại tín hiệu'}</b><small>{phase==='playback'?'Chưa cần chạm':`Tín hiệu ${inputIndex+1} / ${sequence.length}`}</small></div>
  <div className="simon-pad" aria-label="Bốn nút ghi nhớ">{[0,1,2,3].map(index=>{const src=images[`simon-${index+1}`]||DEFAULT_IMAGE;return <button key={index} type="button" className={`simon-pad-button simon-color-${index+1} ${active===index?'lit':''} ${wrong===index?'wrong':''}`} disabled={phase!=='input'} onClick={()=>press(index)} aria-label={`Biểu cảm ${index+1}`}><img className="simon-pad-image" src={src} alt="" draggable="false"/></button>;})}</div>
  <p className="simon-hint">{phase==='playback'?'Nhìn thật kỹ nhé, chú Thơm đang bật mí thứ tự đó!':'Đến lượt bạn! Chạm lần lượt theo đúng thứ tự vừa xem nhé.'}</p>
  {phase==='paused'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="save" size={36}/></span><h2>Bạn còn một ván đang chơi dở</h2><p>Chuỗi tín hiệu, vòng chơi và số mạng đã được lưu.</p><button className="primary-button" onClick={()=>setPhase(resumeRef.current)}>Tiếp tục ván trước</button><button className="text-button" onClick={begin}>Chơi ván mới</button></div></div>}
 </Frame>;
}

async function renderSquareImage(url){
 const image=await new Promise((resolve,reject)=>{const item=new Image();item.crossOrigin='anonymous';item.onload=()=>resolve(item);item.onerror=()=>reject(new Error('Không đọc được ảnh'));item.src=url;});
 const side=Math.min(image.naturalWidth,image.naturalHeight),canvas=document.createElement('canvas');canvas.width=canvas.height=Math.min(1400,side);
 const x=(image.naturalWidth-side)/2,y=(image.naturalHeight-side)/2;canvas.getContext('2d').drawImage(image,x,y,side,side,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/webp',.92);
}
async function renderJigsawImage(item,size=1400){
 if(!item?.url)return DEFAULT_IMAGE;
 if(item.transform?.mode==='crop')return renderSlotImage(item.url,item.transform,size);
 return renderSquareImage(item.url);
}
function JigsawLevelCard({image,index,record={},onChoose}){
 const easyDone=Boolean(record.easy),hardDone=Boolean(record.hard);
 return <article className="puzzle-level-card jigsaw-level-card">
  <div className="puzzle-level-copy"><b>Level {String(index+1).padStart(2,'0')}</b></div>
  <div className="puzzle-level-actions">
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
 return <button type="button" className={`puzzle-collection-tile ${unlocked?'unlocked':'locked'}`} disabled={!unlocked||!image?.url} onClick={()=>onOpen({...image,previewUrl:preview,record})}>
  <div className="puzzle-collection-art">{image?.url?<img src={preview} alt={`Ảnh Level ${index+1}`}/>:<span className="puzzle-collection-placeholder"><Icon name="image" size={38}/></span>}{!unlocked&&<div className="puzzle-collection-mask"><span><Icon name="lock" size={20}/></span><b>Hoàn thành để mở khóa</b></div>}</div>
  <b>Level {String(index+1).padStart(2,'0')}</b><small>{unlocked?`${record.easy?'Dễ đã đạt':''}${record.easy&&record.hard?' · ':''}${record.hard?'Khó đã đạt':''}`:'Chưa mở khóa'}</small>
 </button>;
}
function JigsawCollectionModal({album=[],progress={},onClose}){
 const [viewImage,setViewImage]=useState(null);
 return <><div className="overlay puzzle-collection-overlay" onClick={event=>{event.preventDefault();event.stopPropagation();onClose();}} role="dialog" aria-modal="true" aria-label="Bộ hình Mảnh Ghép Nhà Thơm">
  <div className="result-card puzzle-collection-modal puzzle-game-collection-modal" onClick={e=>e.stopPropagation()}>
   <button type="button" className="close-modal" onClick={event=>{event.preventDefault();event.stopPropagation();onClose();}} aria-label="Đóng bộ sưu tập"><Icon name="close" size={19}/></button><span className="eyebrow">MẢNH GHÉP NHÀ THƠM</span><h2>Bộ hình của bạn</h2><p className="puzzle-collection-modal-subtitle">Hoàn thành màn chơi để mở khóa hình.</p>
   <div className="puzzle-collection-grid">{album.map((entry,index)=><JigsawCollectionTile key={entry.id} image={entry} index={index} record={progress[entry.id]||{}} onOpen={setViewImage}/>)}</div>
  </div>
 </div>{viewImage&&createPortal(<div className="overlay puzzle-collection-overlay puzzle-collection-preview-overlay" onClick={event=>{event.preventDefault();event.stopPropagation();setViewImage(null);}}><div className="result-card puzzle-collection-modal" onClick={e=>e.stopPropagation()}><button type="button" className="close-modal" onClick={event=>{event.preventDefault();event.stopPropagation();setViewImage(null);}} aria-label="Đóng hình"><Icon name="close" size={19}/></button><h2>Ảnh đã mở khóa</h2><img src={viewImage.url||DEFAULT_IMAGE} alt="Ảnh gốc đã mở khóa"/><p>{viewImage.record?.easy?'Đã hoàn thành cấp độ Dễ. ':''}{viewImage.record?.hard?'Đã hoàn thành cấp độ Khó.':''}</p></div></div>,document.body)}</>;
}

function JigsawPieceGraphic({piece,size,imageSrc,rotation=0,outline=false}){
 const row=Math.floor(piece/size),col=piece%size,path=buildJigsawPiecePath(piece,size),clipId=`jigsaw-shape-${size}-${piece}`;
 return <svg className={`jigsaw-piece-svg ${outline?'outline':''}`} style={{'--piece-angle':`${rotation}deg`}} viewBox="-.2 -.2 1.4 1.4" role="img" aria-hidden="true">
  {!outline&&<defs><clipPath id={clipId}><path d={path}/></clipPath></defs>}
  {!outline&&<image href={imageSrc} x={-col} y={-row} width={size} height={size} preserveAspectRatio="none" clipPath={`url(#${clipId})`}/>}
  <path d={path} className="jigsaw-piece-shape" fill={outline?'#ffffff12':'none'} stroke={outline?'#f4d8a0':'#fff8'} strokeWidth=".018" vectorEffect="non-scaling-stroke"/>
 </svg>;
}
function JigsawPieceButton({piece,size,imageSrc,rotation=0,selected=false,source='tray',onClick,onDragStart,onDragEnd,onDragOver,onDrop,onPointerDown,onPointerMove,onPointerUp,onPointerCancel,dragging=false}){
 return <button type="button" className={`jigsaw-piece-button ${source==='board'?'on-board':'in-tray'} ${selected?'selected':''} ${dragging?'touch-dragging':''}`} draggable onClick={onClick} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDrop={onDrop} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} aria-label={`Mảnh ghép ${piece+1}${rotation?`, xoay ${rotation} độ`:''}`}>
  <JigsawPieceGraphic piece={piece} size={size} imageSrc={imageSrc} rotation={rotation}/>
 </button>;
}

export function JigsawGame({onHome,images={},album=[],onEvent=()=>{},onResultReady,saveRecord=()=>{},jigsawProgress={},onRestart,postResultActionsRef}){
 const savedRef=useRef(loadGameSession('jigsaw'));const saved=savedRef.current;const resumeRef=useRef(resumePhase(saved));
 const [phase,setPhase]=useState(()=>restoredPhase(saved)),[difficulty,setDifficulty]=useState(()=>saved?.difficulty||'easy'),[chosen,setChosen]=useState(()=>saved?.chosen||null),[placements,setPlacements]=useState(()=>saved?.placements||[]),[tray,setTray]=useState(()=>saved?.tray||[]),[rotations,setRotations]=useState(()=>saved?.rotations||{}),[moves,setMoves]=useState(()=>saved?.moves||0),[seconds,setSeconds]=useState(()=>saved?.seconds||0),[selectedPiece,setSelectedPiece]=useState(null),[dragged,setDragged]=useState(null),[showSample,setShowSample]=useState(false),[showCollection,setShowCollection]=useState(false),[showWinImage,setShowWinImage]=useState(false),[showWinImagePreview,setShowWinImagePreview]=useState(false),[imageSrc,setImageSrc]=useState(DEFAULT_IMAGE),[winResult,setWinResult]=useState(null);
 const finished=useRef(false),touchDragRef=useRef(null),suppressTouchClickRef=useRef(0),n=difficulty==='easy'?3:5,total=n*n;
  const openCollection=event=>{event?.preventDefault?.();event?.stopPropagation?.();setShowCollection(true);};
  const closeWinImage=event=>{event?.preventDefault?.();event?.stopPropagation?.();setShowWinImage(false);onResultReady?.(winResult);};
 useEffect(()=>{if(phase!=='paused'&&phase!=='ready'&&phase!=='won')resumeRef.current=phase;},[phase]);
 useEffect(()=>{if(phase==='playing'||phase==='paused')saveGameSession('jigsaw',{phase:phase==='paused'?resumeRef.current:phase,resumePhase:resumeRef.current,difficulty,chosen,placements,tray,rotations,moves,seconds});else clearGameSession('jigsaw');},[phase,difficulty,chosen,placements,tray,rotations,moves,seconds]);
 useEffect(()=>{if(!album.length){setChosen(null);return;}if(chosen&&!album.some(x=>x.id===chosen.id))setChosen(null);},[album]);
 useEffect(()=>{let active=true;if(!chosen?.url){setImageSrc(DEFAULT_IMAGE);return()=>{active=false;};}setImageSrc(DEFAULT_IMAGE);renderJigsawImage(chosen,1400).then(url=>{if(active)setImageSrc(url);}).catch(()=>{if(active)setImageSrc(chosen.url||DEFAULT_IMAGE);});return()=>{active=false;};},[chosen?.url,JSON.stringify(chosen?.transform||null)]);
 useEffect(()=>{if(phase!=='playing')return;const timer=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(timer);},[phase]);
 const fmt=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
 const begin=(image,mode='easy',force=false)=>{
  resumeRef.current='playing';if(!image||(!force&&!canPlayJigsawDifficulty(jigsawProgress,image.id,mode)))return;
  const size=mode==='easy'?3:5;finished.current=false;
  const initialRotations=Object.fromEntries(Array.from({length:size*size},(_,i)=>[i,Math.floor(Math.random()*4)*90]));
  if(Object.values(initialRotations).every(v=>v===0))initialRotations[size*size-1]=90;
  setChosen(image);setDifficulty(mode);setPlacements(Array(size*size).fill(null));setTray(shuffleJigsaw(size));setRotations(initialRotations);setMoves(0);setSeconds(0);setSelectedPiece(null);setDragged(null);setShowSample(false);setShowCollection(false);setShowWinImage(false);setShowWinImagePreview(false);setWinResult(null);setPhase('playing');
 };
 const reset=()=>{finished.current=false;setPhase('ready');setChosen(null);setPlacements([]);setTray([]);setRotations({});setMoves(0);setSeconds(0);setSelectedPiece(null);setDragged(null);setShowSample(false);setShowCollection(false);setShowWinImage(false);setShowWinImagePreview(false);setWinResult(null);};
 const complete=(next,nextRotations,count)=>{
  if(finished.current||!isJigsawSolved(next,nextRotations))return;
  finished.current=true;setShowWinImage(true);setPhase('won');saveRecord('jigsaw',{label:`${count} thao tác`,value:count,kind:'steps'});
  const label=`${count} thao tác · ${fmt(seconds)}`;
  const result={gameId:'jigsaw',gameName:GAME_META.jigsaw.name,title:'Ghép thành công!',summary:`${difficultyName[difficulty]} · ${count} thao tác · ${fmt(seconds)}.`,variant:`${chosen.id}-${difficulty}`,variantLabel:`${difficultyName[difficulty]}`,metricKind:'steps',metricValue:count,metricLabel:label,eligible:true,details:{imageId:chosen.id,size:n,difficulty,steps:count,seconds}};
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
  const count=moves+1;setPlacements(next);setTray(nextTray);setMoves(count);setSelectedPiece(null);complete(next,rotations,count);
 };
 const returnToTray=slot=>{
  if(phase!=='playing'||slot<0||slot>=total||placements[slot]==null)return;
  const next=[...placements],piece=next[slot];next[slot]=null;setPlacements(next);setTray(old=>[...old,piece]);setSelectedPiece(null);setMoves(v=>v+1);
 };
 const rotateSelected=direction=>{
  if(phase!=='playing'||!selectedPiece||!Number.isInteger(selectedPiece.id))return;
  const piece=selectedPiece.id;
  const nextRotations={...rotations,[piece]:normalizeJigsawRotation((rotations[piece]||0)+direction)};
  setRotations(nextRotations);
  const count=moves+1;setMoves(count);complete(placements,nextRotations,count);
 };
 const swapSelectedWith=target=>{
  if(phase!=='playing'||!selectedPiece||!target)return;
  if(selectedPiece.source===target.source&&selectedPiece.id===target.id){setSelectedPiece(null);return;}
  const swapped=swapJigsawPiecePositions(placements,tray,selectedPiece,target);
  if(!swapped.changed){setSelectedPiece(null);return;}
  const count=moves+1;
  setPlacements(swapped.placements);
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
  if(!drag||drag.pointerId!==e.pointerId)return;
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
 if(phase==='ready')return <><main className="game-intro puzzle-intro jigsaw-intro"><button className="back-link" onClick={onHome}>Tất cả trò chơi</button><div className="intro-card puzzle-intro-card"><div className="intro-icon"><Icon name="puzzle" size={48}/></div><div className="eyebrow">JIGSAW PUZZLE · THƠM PLAYGROUND</div><h1>Mảnh Ghép Nhà Thơm</h1><p>Một bức hình đã bị chia thành nhiều mảnh nhỏ. Hãy tìm đúng vị trí, xoay và ghép lại để bức hình của chú Thơm hiện ra nhé!</p><div className="new-game-rules"><span><Icon name="hand"/> Kéo thả mảnh ghép hoặc chọn một mảnh rồi chạm mảnh khác để hoán đổi vị trí.</span><span><Icon name="rotate"/> Hoán đổi không làm xoay mảnh. Muốn đổi hướng, dùng nút xoay trái hoặc phải.</span><span><Icon name="target"/> Đưa tất cả mảnh về đúng vị trí và đúng hướng để hoàn thành.</span><span><Icon name="layers"/> Thắng cấp độ Dễ để mở khóa cấp độ Khó.</span></div><div className="puzzle-difficulty-guide"><span><b>Dễ</b> · 3×3</span><span><b>Khó</b> · 5×5 · Mở sau khi thắng Dễ</span></div>
  <button type="button" className="puzzle-open-collection" onClick={openCollection} aria-label="Mở bộ sưu tập hình ảnh Mảnh Ghép Nhà Thơm"><span className="puzzle-open-collection-icon" aria-hidden="true"><Icon name="gallery" size={22}/></span><span>BỘ SƯU TẬP HÌNH ẢNH</span></button>
  {album.length?<div className="puzzle-level-grid">{album.map((image,index)=><JigsawLevelCard key={image.id} image={image} index={index} record={jigsawProgress[image.id]||{}} onChoose={begin}/>)}</div>:<p className="puzzle-empty-album">Chưa có hình trong album. Admin hãy thêm ảnh vào Mảnh Ghép Nhà Thơm.</p>}
 </div></main>{showCollection&&createPortal(<JigsawCollectionModal album={album} progress={jigsawProgress} onClose={()=>setShowCollection(false)}/>,document.body)}</>;
 const stats=[{label:'Số thao tác',value:moves},{label:'Thời gian',value:fmt(seconds)},{label:'Level',value:album.findIndex(x=>x.id===chosen?.id)>=0?`Level ${String(album.findIndex(x=>x.id===chosen.id)+1).padStart(2,'0')}`:'—'},{label:'Độ khó',value:difficultyName[difficulty]}];
 const selectedRotation=selectedPiece?rotations[selectedPiece.id]||0:0;
 return <><Frame game={GAME_META.jigsaw} onHome={onHome} onReset={reset} onRestart={onRestart} stats={stats} controls={<button className="small-select" onClick={()=>setShowSample(true)}><Icon name="image" size={16}/> Xem lại hình</button>}>
  <div className="jigsaw-game-toolbar"><span>{total} mảnh jigsaw</span></div>
  <div className="jigsaw-board jigsaw-real-board" style={{'--jigsaw-n':n}} aria-label={`Bàn ghép hình jigsaw ${n} nhân ${n}`}>
   {placements.map((piece,slot)=> <div key={slot} className={`jigsaw-target-slot ${piece!=null?'occupied':''}`} data-jigsaw-slot={slot} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropOnBoard(e,slot)} onClick={handlePieceClick(()=>selectBoardSlot(slot))} aria-label={`Vị trí ghép ${slot+1}`}>
    {piece==null?<JigsawPieceGraphic piece={slot} size={n} imageSrc={imageSrc} outline/>:<JigsawPieceButton piece={piece} size={n} imageSrc={imageSrc} rotation={rotations[piece]||0} selected={selectedPiece?.source==='board'&&selectedPiece.id===piece} source="board" dragging={dragged?.id===piece&&dragged?.source==='board'} onClick={handlePieceClick(e=>{e.stopPropagation();selectBoardSlot(slot);})} onPointerDown={handleTouchPointerDown(piece,'board',slot)} onPointerMove={handleTouchPointerMove} onPointerUp={handleTouchPointerUp} onPointerCancel={handleTouchPointerCancel} onDragStart={e=>{e.stopPropagation();setDragged({id:piece,source:'board'});e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',`piece:${piece}`);}} onDragEnd={handleNativeDragEnd}/>}
   </div>)}
  </div>
  {selectedPiece&&<div className="jigsaw-piece-tools"><b>Mảnh {selectedPiece.id+1} · {selectedRotation}°</b><button type="button" onClick={()=>rotateSelected(-90)}><Icon name="rotate-ccw" size={16}/> Xoay trái</button><button type="button" onClick={()=>rotateSelected(90)}><Icon name="rotate-cw" size={16}/> Xoay phải</button><span>Chọn mảnh rồi xoay trái hoặc phải nếu muốn đổi hướng; chạm mảnh khác để hoán đổi vị trí nhé.</span><button type="button" className="jigsaw-deselect" onClick={()=>setSelectedPiece(null)}>Bỏ chọn</button></div>}
  <div className="jigsaw-tray-wrap" onDragOver={e=>e.preventDefault()} onDrop={handleDropOnTray}>
   <div className="jigsaw-tray-heading"><b>Khay mảnh ghép</b><small>{tray.length} mảnh còn lại · Chọn mảnh rồi chọn vị trí, hoặc kéo thả</small></div>
   <div className={`jigsaw-tray jigsaw-real-tray difficulty-${difficulty}`}>
    {tray.map(piece=><div className="jigsaw-tray-cell" key={piece} data-jigsaw-piece={piece} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropOnTrayPiece(e,piece)}>
     <JigsawPieceButton piece={piece} size={n} imageSrc={imageSrc} rotation={rotations[piece]||0} selected={selectedPiece?.source==='tray'&&selectedPiece.id===piece} dragging={dragged?.id===piece&&dragged?.source==='tray'} onClick={handlePieceClick(()=>selectTrayPiece(piece))} onPointerDown={handleTouchPointerDown(piece,'tray')} onPointerMove={handleTouchPointerMove} onPointerUp={handleTouchPointerUp} onPointerCancel={handleTouchPointerCancel} onDragStart={e=>{setDragged({id:piece,source:'tray'});e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',`piece:${piece}`);}} onDragEnd={handleNativeDragEnd}/>
    </div>)}
   </div>
  </div>
  <p className="jigsaw-touch-hint">Chọn một mảnh rồi chạm mảnh khác để hoán đổi vị trí — hướng xoay được giữ nguyên. Muốn đổi hướng, dùng nút xoay trái hoặc phải nhé.</p>
  {showSample&&<div className="overlay jigsaw-sample-overlay" onClick={()=>setShowSample(false)}><div className="result-card jigsaw-sample-modal" onClick={e=>e.stopPropagation()}><button className="close-modal" onClick={()=>setShowSample(false)} aria-label="Đóng"><Icon name="close"/></button><h2>Hình gốc cần ghép</h2><img src={chosen?.url||DEFAULT_IMAGE} alt="Ảnh gốc đầy đủ của Level"/></div></div>}
  {phase==='won'&&showWinImage&&createPortal(<div className="overlay jigsaw-unlocked-overlay" role="dialog" aria-modal="true" aria-label="Ghép hình thành công"><div className="result-card jigsaw-result"><button type="button" className="image-review-close" onClick={closeWinImage} aria-label="Đóng hình gốc, xem bảng thành tích"><Icon name="close" size={19}/></button><Icon name="trophy" size={42}/><h2>Ghép thành công!</h2><img className="jigsaw-unlocked-full-image" src={chosen?.url||DEFAULT_IMAGE} onClick={()=>setShowWinImagePreview(true)} role="button" tabIndex={0} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setShowWinImagePreview(true);}}} alt="Nhấn để xem ảnh gốc đầy đủ đã mở khóa"/><p>{difficultyName[difficulty]} · {moves} thao tác · {fmt(seconds)}</p><button type="button" className="primary-button" onClick={openCollection}>Bộ sưu tập hình ảnh</button></div></div>,document.body)}
  {showWinImagePreview&&chosen&&createPortal(<div className="overlay puzzle-collection-overlay puzzle-collection-preview-overlay unlocked-image-preview-overlay" onClick={event=>{event.preventDefault();event.stopPropagation();setShowWinImagePreview(false);}}><div className="result-card puzzle-collection-modal" onClick={event=>event.stopPropagation()}><button type="button" className="close-modal" onClick={event=>{event.preventDefault();event.stopPropagation();setShowWinImagePreview(false);}} aria-label="Đóng hình"><Icon name="close" size={19}/></button><h2>Ảnh đã mở khóa</h2><img src={chosen.url||DEFAULT_IMAGE} alt="Ảnh gốc đầy đủ đã mở khóa"/></div></div>,document.body)}{phase==='paused'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="save" size={36}/></span><h2>Bạn còn một ván đang chơi dở</h2><p>Vị trí mảnh ghép, hướng xoay, khay và thời gian đã được lưu.</p><button className="primary-button" onClick={()=>setPhase(resumeRef.current)}>Tiếp tục ván trước</button><button className="text-button" onClick={reset}>Chọn Level khác / chơi mới</button></div></div>}
 </Frame>{showCollection&&createPortal(<JigsawCollectionModal album={album} progress={jigsawProgress} onClose={()=>setShowCollection(false)}/>,document.body)}</>;
}
