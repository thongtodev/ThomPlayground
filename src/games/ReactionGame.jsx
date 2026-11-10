import { DEFAULT_IMAGE } from '../assetStore';
import React, { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { loadGameSession, saveGameSession, clearGameSession, restoredPhase, resumePhase } from '../gameSessions';
import { GameIntro, GameFrame, Mascot } from '../components/GameUI.jsx';
import { GAMES } from './catalog.js';

function ReactionGame({onHome,playSound,saveRecord,images,onEvent,onRestart}) {
 const savedRef=useRef(loadGameSession('reaction'));const saved=savedRef.current;const resumeRef=useRef(resumePhase(saved));
 const [phase,setPhase]=useState(()=>restoredPhase(saved)),[mode,setMode]=useState(()=>saved?.mode||'classic'),[round,setRound]=useState(()=>saved?.round||0),[times,setTimes]=useState(()=>saved?.times||[]),[status,setStatus]=useState(()=>saved?.status==='go'?'waiting':saved?.status||'idle'),[value,setValue]=useState(()=>saved?.value??null),[signal,setSignal]=useState(()=>saved?.signal||'thom'),[bombHits,setBombHits]=useState(()=>saved?.bombHits||0),[bombAvoided,setBombAvoided]=useState(()=>saved?.bombAvoided||0);
 const startAt=useRef(0),finished=useRef(false);
 useEffect(()=>{if(phase!=='paused'&&phase!=='ready'&&phase!=='result')resumeRef.current=phase;},[phase]);
 useEffect(()=>{if(phase==='playing'||phase==='paused')saveGameSession('reaction',{phase:phase==='paused'?resumeRef.current:phase,resumePhase:resumeRef.current,mode,round,times,status,value,signal,bombHits,bombAvoided});else clearGameSession('reaction');},[phase,mode,round,times,status,value,signal,bombHits,bombAvoided]);
 useEffect(()=>{if(phase!=='playing'||status!=='waiting')return;
  const t=setTimeout(()=>{startAt.current=performance.now();setSignal(mode==='bomb'&&Math.random()<.32?'bomb':'thom');setStatus('go');playSound(900,.12);},1500+Math.random()*3500);
  return()=>clearTimeout(t);
 },[phase,status,round,mode,playSound]);
 useEffect(()=>{if(phase!=='playing'||status!=='go'||signal!=='bomb')return;
  const t=setTimeout(()=>{setBombAvoided(x=>x+1);setStatus('avoided');setValue('Đã né bom!');playSound(650,.07);},1150);
  return()=>clearTimeout(t);
 },[phase,status,signal,playSound]);
 const start=()=>{resumeRef.current='playing';finished.current=false;setRound(1);setTimes([]);setValue(null);setSignal('thom');setBombHits(0);setBombAvoided(0);setStatus('waiting');setPhase('playing');};
 const tap=()=>{if(phase!=='playing')return;
  if(status==='waiting'){setStatus('early');setValue('Bấm quá sớm!');playSound(170,.15);}
  else if(status==='go'){
   if(signal==='bomb'){setBombHits(x=>x+1);setValue('Chạm bom!');setStatus('bomb-hit');playSound(170,.15);}
   else{const ms=Math.max(0,Math.round(performance.now()-startAt.current));setTimes(t=>[...t,ms]);setValue(ms);setStatus('measured');playSound(720,.06);}
  }
 };
 const next=()=>{if(status==='early'){setValue(null);setStatus('waiting');return;}
  if(round>=5){setPhase('result');setStatus('idle');return;}
  setRound(r=>r+1);setValue(null);setStatus('waiting');};
 useEffect(()=>{if(phase!=='result'||finished.current)return;finished.current=true;
  const average=times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):0;const best=times.length?Math.min(...times):0;if(times.length)saveRecord('reaction',{label:`${average} ms`,value:average,kind:'time'});onEvent({type:'reaction_finish',best,completed:times.length?'reaction':undefined,result:{gameId:'reaction',gameName:'Nhanh Tay Bắt Thơm',title:times.length?'Thử thách hoàn thành!':'Chưa có lượt hợp lệ',summary:times.length?`Trung bình ${average} ms · Nhanh nhất ${best} ms · ${mode==='bomb'?`Né ${bombAvoided} bom, chạm ${bombHits} bom`:'Cổ điển'}.`:'Bạn chưa chạm được tín hiệu hợp lệ trong lượt chơi này.',variant:mode,variantLabel:mode==='bomb'?'Thử thách Bom':'Cổ điển',metricKind:'reaction',metricValue:average,metricLabel:times.length?`${average} ms`:'Chưa có kết quả',eligible:times.length>0,details:{mode,average,best,bombHits,bombAvoided,validRounds:times.length}}});
 },[phase,times,saveRecord,onEvent]);
 const avg=times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):0,best=times.length?Math.min(...times):0;
 const rating=!times.length?'Chưa có lượt phản xạ hợp lệ':avg<200?'Cực nhanh':avg<=250?'Xuất sắc':avg<=350?'Rất tốt':avg<=500?'Khá tốt':'Cần luyện thêm';
 if(phase==='ready')return <GameIntro images={images} game={GAMES[3]} onBack={onHome} onStart={start}><div className="rules-list"><span><Icon name="eye"/> Chờ chú Thơm xuất hiện rồi chạm nhanh nhất có thể.</span><span><Icon name="bomb"/> Thấy bom thì đừng chạm nhé, hãy đợi nó biến mất.</span><span><Icon name="alert"/> Chạm quá sớm sẽ phải thử lại lượt đó; chạm nhầm bom sẽ bị tính một lỗi.</span><span><Icon name="chart"/> Mỗi ván có 5 lượt. Cố gắng giữ tốc độ thật ổn định để có kết quả tốt nhất!</span></div><label className="select-label">Chế độ<select value={mode} onChange={e=>setMode(e.target.value)}><option value="classic">Cổ điển · Chạm nhanh</option><option value="bomb">Thử thách Bom · Chạm Thơm, né bom</option></select></label></GameIntro>;
 if(phase==='result')return <GameFrame game={GAMES[3]} images={images} onHome={onHome} onReset={()=>setPhase('ready')} onRestart={onRestart} stats={[{label:'Trung bình',value:times.length?`${avg} ms`:'—'},{label:'Nhanh nhất',value:times.length?`${best} ms`:'—'},{label:'Chạm bom',value:bombHits},{label:'Né bom',value:bombAvoided}]}><div className="reaction-finish"><Mascot size="md"/><h2>{rating}!</h2><p>{times.length?`Trung bình ${avg} ms trên ${times.length} lượt chạm Thơm.`:'Bạn chưa chạm được tín hiệu chú Thơm.'} {mode==='bomb'?`Né ${bombAvoided} bom · Chạm nhầm ${bombHits} bom.`:''}</p><button className="primary-button" onClick={start}>Thử lại</button></div></GameFrame>;
 const complete=['early','measured','bomb-hit','avoided'].includes(status);
 return <GameFrame game={GAMES[3]} images={images} onHome={onHome} onReset={()=>setPhase('ready')} onRestart={onRestart} stats={[{label:'Lượt',value:`${round}/5`},{label:'Gần nhất',value:value===null?'—':typeof value==='number'?`${value} ms`:value},...(mode==='bomb'?[{label:'Né bom',value:bombAvoided},{label:'Chạm bom',value:bombHits}]:[])]}>
 {mode==='bomb'&&<div className="reaction-legend"><span><img src={images.reaction||DEFAULT_IMAGE} alt=""/> Chạm chú Thơm</span><span><span className="reaction-bomb-icon"><Icon name="bomb"/></span> Không chạm bom</span></div>}
 <button className={`reaction-zone ${status} ${status==='go'&&signal==='bomb'?'reaction-trap':''}`} onPointerDown={tap} disabled={complete}>
 <div className="reaction-zone-inner">{status==='waiting'&&<><span className="reaction-symbol"><Icon name="hourglass" size={42}/></span><h2>CHỜ TÍN HIỆU...</h2><p>Đừng chạm vội nhé!</p></>}
 {status==='go'&&(signal==='bomb'?<><div className="reaction-bomb-visual">{images['reaction-bomb']?<img src={images['reaction-bomb']} alt="Bom"/>:<span><Icon name="bomb" size={42}/></span>}</div><h2>ĐỪNG CHẠM!</h2><p>Né bom cho đến khi nó biến mất</p></>:<><Mascot size="md" src={images.reaction||DEFAULT_IMAGE}/><h2>BẤM NGAY!</h2><p>Chạm vào chú Thơm</p></>)}
 {status==='early'&&<><span className="reaction-symbol"><Icon name="close" size={42}/></span><h2>BẤM QUÁ SỚM!</h2><p>Thử lại lượt này</p></>}
 {status==='measured'&&<><span className="reaction-symbol"><Icon name="zap" size={42}/></span><h2>{value} ms</h2><p>Đã ghi nhận phản xạ</p></>}
 {status==='bomb-hit'&&<><span className="reaction-symbol"><Icon name="bomb" size={42}/></span><h2>TRÚNG BOM!</h2><p>Lần sau đừng chạm vào bom</p></>}
 {status==='avoided'&&<><span className="reaction-symbol"><Icon name="shield" size={42}/></span><h2>NÉ BOM THÀNH CÔNG!</h2><p>Không chạm là đúng</p></>}</div></button>
 {complete&&<button className="primary-button next-round" onClick={next}>{status==='early'?'Thử lại lượt này':round===5?'Xem kết quả':'Lượt tiếp theo'}</button>}
 {phase==='paused'&&<div className="overlay"><div className="result-card"><span className="result-emoji"><Icon name="save" size={36}/></span><h2>Bạn còn một ván đang chơi dở</h2><p>Tiến trình 5 lượt đã được lưu. Tiếp tục khi bạn sẵn sàng.</p><button className="primary-button" onClick={()=>setPhase(resumeRef.current)}>Tiếp tục ván trước</button><button className="text-button" onClick={()=>{clearGameSession('reaction');start();}}>Chơi ván mới</button></div></div>}
 </GameFrame>;
}

export { ReactionGame };
