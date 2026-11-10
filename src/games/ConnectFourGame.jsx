import {recordAiOutcome} from '../gameRankings.js';
import React, { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { loadGameSession, saveGameSession, clearGameSession, restoredPhase, resumePhase } from '../gameSessions';
import { CONNECT_COLS, CONNECT_ROWS, emptyConnectBoard, dropConnectDisc, connectFourWinner, connectBoardFull, chooseConnectFourMove } from '../connectFourEngine';
import { GAME_META, difficultyName } from './newGameMeta.js';
import { Intro, Frame } from '../components/NewGameUI.jsx';

function ConnectFourGame({onHome,images={},playSound=()=>{},onEvent=()=>{},onRestart}){
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
  const aiStreak=mode==='ai'?recordAiOutcome('connect4',eligible):0;
  onEvent({type:'connect4_finish',won:eligible,mode,difficulty,completed:'connect4',result:{gameId:'connect4',gameName:GAME_META.connect4.name,title:winner===null?'Hai bên hòa nhau!':mode==='ai'?(eligible?'Bạn đã nối đủ bốn quân!':'Chú Thơm đã nối đủ bốn quân!'):`${winner==='R'?'Đỏ':'Vàng'} đã nối đủ bốn quân!`,summary:`${mode==='ai'?`Đấu với chú Thơm · ${difficultyName[difficulty]}`:'Hai người chơi'} · ${count} lượt thả quân · ${label}.`,variant:`${mode}-${mode==='ai'?difficulty:'local'}`,variantLabel:mode==='ai'?`Đấu với chú Thơm · ${difficultyName[difficulty]}`:'Hai người chơi',metricKind:'score',metricValue:eligible?Math.max(1,100-count):0,metricLabel:eligible?`Thắng trong ${count} lượt`:'Chưa có chiến thắng',eligible:eligible&&mode==='ai',details:{aiStreak,mode,difficulty,winner,moves:count,rows:CONNECT_ROWS,cols:CONNECT_COLS}}});
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

export { ConnectFourGame };
