import {useRoundFeedback,useNearFinish,useOnetMotion,NewPhotoBadge,UnlockMarker,markNews,seePhoto} from '../effects/ProgressEffects';
import {useGameJuice, gameEffect, usePieceMotion, RewardReveal} from '../effects/GameEffects.jsx';
import {recordAiOutcome} from '../gameRankings.js';
import { LEVELS, opposite, emptyBoard, checkResult, applyCaroMove, chooseAiMove, statsKey, getCaroStats, updateCaroStats } from '../caroEngine';
import React, { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { loadGameSession, saveGameSession, clearGameSession, restoredPhase, resumePhase } from '../gameSessions';
import { GameIntro, GameFrame } from '../components/GameUI.jsx';
import { GAMES } from './catalog.js';

function TicGame({onHome,playSound,saveRecord,images,onEvent,onRestart}) {
 const savedRef=useRef(loadGameSession('tic'));const saved=savedRef.current;const resumeRef=useRef(resumePhase(saved));
 const [phase,setPhase]=useState(()=>restoredPhase(saved));
 const [size,setSize]=useState(()=>saved?.size||3);
 const [mode,setMode]=useState(()=>saved?.mode||'ai');
 const [ai,setAi]=useState(()=>saved?.ai||'medium');
 const [humanMark,setHumanMark]=useState(()=>saved?.humanMark||'X');
 const [turn,setTurn]=useState(()=>saved?.turn||'X');
 const [board,setBoard]=useState(()=>saved?.board||emptyBoard(saved?.size||3));
 const [outcome,setOutcome]=useState(()=>saved?.outcome||null);
 const [zoom,setZoom]=useState(1);
 const [allStats,setAllStats]=useState(getCaroStats);
 // Locks prevent rapid double-taps from applying two moves before React commits.
 useRoundFeedback(outcome?'over':phase);
 useGameJuice('tic',{phase,board,outcome});
 const moveLock=useRef(false);
 const finishedRef=useRef(false);
 useEffect(()=>{moveLock.current=false;},[board,phase]);
 useEffect(()=>{if(phase!=='paused'&&phase!=='ready'&&!outcome)resumeRef.current=phase;},[phase,outcome]);
 useEffect(()=>{if((phase==='playing'||phase==='paused')&&!outcome)saveGameSession('tic',{phase:phase==='paused'?resumeRef.current:phase,resumePhase:resumeRef.current,size,mode,ai,humanMark,turn,board,outcome});else clearGameSession('tic');},[phase,size,mode,ai,humanMark,turn,board,outcome]);
 const aiMark=opposite(humanMark);
 const currentStats=allStats[statsKey(size,mode,ai)]||{games:0,X:0,O:0,draw:0,wins:0,losses:0};
 const resetRound=nextSize=>{moveLock.current=false;finishedRef.current=false;setBoard(emptyBoard(nextSize));setOutcome(null);setTurn('X');};
 const start=()=>{resumeRef.current='playing';resetRound(size);setPhase('playing');};
 const changeSize=value=>{const next=Number(value);setSize(next);resetRound(next);setZoom(1);};
 const changeAi=value=>{setAi(value);resetRound(size);};
 const finish=(result,gameMode=mode,playerMark=humanMark)=>{
   if(finishedRef.current)return;
   finishedRef.current=true;
   setOutcome(result);
   const updatedStats=updateCaroStats(size,gameMode,ai,result.winner,playerMark);setAllStats(updatedStats);
   const wonByPlayer=gameMode==='ai'&&result.winner===playerMark;const winCount=updatedStats[statsKey(size,gameMode,ai)]?.wins||0;
   const aiStreak=gameMode==='ai'?recordAiOutcome('tic',wonByPlayer):0;
  onEvent({type:'tic_finish',mode:gameMode,won:wonByPlayer,completed:'tic',boardSize:size,difficulty:ai,result:{gameId:'tic',gameName:'Thơm X Thơm O',title:result.winner==='draw'?'Ngang tài ngang sức nha chim cá!':wonByPlayer?'Chim cá giỏi quá, thắng rồi nè!':'Ván này chú thắng nha, làm ván nữa không?',summary:`Bàn ${size}×${size} · ${gameMode==='ai'?`Đấu với chú Thơm · ${levelName}`:'Hai người chơi'} · ${result.winner==='draw'?'Hòa':`Bên ${result.winner} thắng`}.`,variant:`${size}-${gameMode==='ai'?ai:'local'}`,variantLabel:`${size}×${size} · ${gameMode==='ai'?levelName:'Hai người'}`,metricKind:'wins',metricValue:winCount,metricLabel:`${winCount} trận thắng`,eligible:wonByPlayer,details:{aiStreak,size,mode:gameMode,difficulty:ai,winner:result.winner,playerMark}}});
   if(gameMode==='ai'&&result.winner===playerMark)saveRecord('tic',{label:`Thắng chú Thơm ${size}×${size}`,value:1,kind:'win'});
   playSound(result.winner==='draw'?450:720);
 };
 useEffect(()=>{
   if(phase!=='playing'||mode!=='ai'||turn!==aiMark||outcome)return;
   const t=setTimeout(()=>{
     // A defensive fallback prevents a stalled match if the AI cannot return a legal index.
     let proposed=null;
     try{proposed=chooseAiMove(board,size,ai,aiMark,humanMark);}catch(error){console.error('AI move failed:',error);}
     const index=Number.isInteger(proposed)&&board[proposed]===null?proposed:board.findIndex(cell=>cell===null);
     if(index<0){const result=checkResult(board,size);if(result)finish(result);return;}
     const step=applyCaroMove(board,size,aiMark,index);
     if(!step)return;
     setBoard(step.board);
     if(step.outcome)finish(step.outcome);else {setTurn(humanMark);playSound(430);} 
   },size===3?330:100);
   return()=>clearTimeout(t);
 },[phase,mode,turn,board,outcome,size,ai,aiMark,humanMark]);
 const move=index=>{
   if(moveLock.current||phase!=='playing'||board[index]!==null||outcome||(mode==='ai'&&turn!==humanMark))return;
   const step=applyCaroMove(board,size,turn,index);
   if(!step)return;
   moveLock.current=true;
   setBoard(step.board);
   if(step.outcome)finish(step.outcome);
   else {setTurn(step.nextTurn);playSound(480);}
 };
 const levelName=LEVELS.find(([id])=>id===ai)?.[1]||ai;
 const settings=<>
   <label className="select-label">Kích thước bàn cờ
     <select value={size} onChange={e=>changeSize(e.target.value)}>
       <option value={3}>3×3 · Ba quân liên tiếp</option>
       <option value={10}>10×10 · Năm quân liên tiếp</option>
     </select>
   </label>
   <label className="select-label">Chế độ chơi
     <select value={mode} onChange={e=>{setMode(e.target.value);resetRound(size);}}>
       <option value="ai">Bạn đấu với chú Thơm</option>
       <option value="local">Hai người cùng thiết bị</option>
     </select>
   </label>
   {mode==='ai'&&<>
     <label className="select-label">Độ khó của chú Thơm
       <select value={ai} onChange={e=>changeAi(e.target.value)}>
         {LEVELS.map(([id,name])=><option value={id} key={id}>{name}</option>)}
       </select>
     </label>
     <label className="select-label">Chọn quân của bạn
       <select value={humanMark} onChange={e=>{setHumanMark(e.target.value);resetRound(size);}}>
         <option value="X">X · Đi trước</option><option value="O">O · Đi sau</option>
       </select>
     </label>
   </>}
 </>;
 if(phase==='ready')return <GameIntro images={images} game={GAMES[2]} onBack={onHome} onStart={start}>
   <div className="rules-list">
     <span><Icon name="tic"/> Bàn 3×3, chim cá nối đủ 3 quân ngang, dọc hoặc chéo là thắng nha!</span>
     <span><Icon name="flag"/> Bàn 10×10: nối 5 quân liên tiếp; kể cả khi bị chặn hai đầu vẫn được tính thắng.</span>
     <span><Icon name="check"/> X đi trước nha! Kín bàn mà chưa ai thắng thì mình hòa, làm ván nữa thôi.</span>
     <span><Icon name="brain"/> Có thể đấu với chú Thơm qua 4 mức độ hoặc rủ một người bạn cùng chơi.</span>
   </div>
   <div className="rules-list">
     <span><Icon name="sparkles"/> Dễ: Chú Thơm đi khá ngẫu nhiên, thích hợp để làm quen.</span>
     <span><Icon name="target"/> Trung bình: Biết chặn nước thắng và tận dụng cơ hội của mình.</span>
     <span><Icon name="brain"/> Khó: Biết tính toán nhiều nước và tạo thế thắng kép.</span>
     <span><Icon name="crown"/> Không thể đánh bại: Trên bàn 3×3, chú Thơm luôn chọn nước tối ưu; trên bàn 10×10, chú tính toán sâu và phòng thủ rất chặt, nhưng không bảo đảm bất bại tuyệt đối.</span>
   </div>
   <div className="caro-settings">{settings}</div>
 </GameIntro>;
 const status=outcome?(outcome.winner==='draw'?'Ngang tài ngang sức nha chim cá!':`${outcome.winner} chiến thắng${mode==='ai'?(outcome.winner===humanMark?' · Bạn thắng!':' · Chú Thơm thắng!'): '!'}`):`Lượt của ${turn}${mode==='ai'?(turn===humanMark?' · Bạn':' · Đợi chú nghĩ một xíu nha…'):''}`;
 return <GameFrame game={GAMES[2]} images={images} onHome={onHome} onReset={start} onRestart={onRestart}
   stats={[{label:'Số ván',value:currentStats.games},{label:'X thắng',value:currentStats.X},{label:'O thắng',value:currentStats.O},{label:'Hòa',value:currentStats.draw},...(mode==='ai'?[{label:'Bạn thắng',value:currentStats.wins},{label:'Bạn thua',value:currentStats.losses}]:[])]}
   controls={<span className="level-chip">{size}×{size} · {mode==='ai'?levelName:'2 người'}</span>}>
   <div className="caro-live-settings">
     <label>Bàn cờ<select value={size} onChange={e=>changeSize(e.target.value)}><option value={3}>3×3</option><option value={10}>10×10</option></select></label>
     {mode==='ai'&&<label>Chú Thơm<select value={ai} onChange={e=>changeAi(e.target.value)}>{LEVELS.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}
     <button type="button" className="caro-new-button" onClick={()=>setPhase('ready')}>Cài đặt</button>
   </div>
   {outcome?.winner==='draw'&&<div className="caro-draw-fx" aria-hidden="true"><span>X</span><span>O</span></div>}<div className="tic-status" role="status" aria-live="polite"><Icon name={outcome?'flag':'circle'} size={15}/> <b>{status}{!outcome&&mode==='ai'&&turn!==humanMark&&<span className="fx-thinking" aria-hidden="true"><i/><i/><i/></span>}</b></div>
   {size===10&&<div className="caro-zoom-controls"><span>Phóng to bàn cờ</span><button type="button" onClick={()=>setZoom(z=>Math.max(1,+(z-.5).toFixed(1)))} disabled={zoom===1} aria-label="Thu nhỏ"><Icon name="zoom-out" size={16}/></button><b>{zoom}×</b><button type="button" onClick={()=>setZoom(z=>Math.min(2.5,+(z+.5).toFixed(1)))} disabled={zoom===2.5} aria-label="Phóng to"><Icon name="zoom-in" size={16}/></button></div>}
   <div className={`caro-board-viewport ${size===10?'caro-board-scroll':''}`}>
     <div className={`tic-board caro-board-${size}`} style={{'--caro-size':size,'--caro-zoom':zoom}} role="grid" aria-label={`Bàn cờ ${size} nhân ${size}`}>
       {board.map((mark,index)=>{
         const src=mark?images[`tic-${mark.toLowerCase()}`]:null;
         return <button key={index} type="button" role="gridcell"
           className={`tic-cell ${mark==='X'?'x-cell':mark==='O'?'o-cell':''} ${mark?'filled':''} ${outcome?.line.includes(index)?'winning-cell':''}`}
           onClick={()=>move(index)} disabled={Boolean(mark)||Boolean(outcome)||(mode==='ai'&&turn!==humanMark)}
           aria-label={`Hàng ${Math.floor(index/size)+1}, cột ${index%size+1}: ${mark||'trống'}`}>
           {mark&&<span className={`tic-token ${src?'has-image':'no-image'}`} aria-hidden="true">
             {src?<><img src={src} alt="" draggable="false"/><span className="tic-mark">{mark}</span></>:<span className="tic-symbol">{mark}</span>}
           </span>}
         </button>;
       })}
     </div>
   </div>
   {size===10&&<p className="caro-mobile-hint">Có thể kéo ngang bàn cờ sau khi phóng to để chọn ô chính xác.</p>}
   {outcome&&<div className="inline-result"><b>{outcome.winner==='draw'?'Ngang tài ngang sức nha chim cá!':`Đường thắng: ${outcome.line.length} quân liên tiếp`}</b><button className="primary-button" onClick={start}>Ván mới</button></div>}
   {phase==='paused'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="save" size={36}/></span><h2>{saved?'Chim cá còn một ván đang đợi nè!':'Tạm dừng'}</h2><p>Ván cờ đã được lưu. Bạn có thể tiếp tục từ đúng nước đi trước.</p><button className="primary-button" onClick={()=>setPhase(resumeRef.current)}>Chơi tiếp ván trước</button><button className="text-button" onClick={()=>{clearGameSession('tic');start();}}>Chơi ván mới</button></div></div>}
 </GameFrame>;
}

export { TicGame };
