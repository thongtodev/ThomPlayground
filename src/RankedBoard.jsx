import React,{useEffect,useState,useRef} from 'react';
import {createPortal} from 'react-dom';
import Icon from './Icon';
import {GAMES} from './games/catalog';
import {getPlayerId,loadGameRankings,loadRankingDetails} from './leaderboards';
import {movement,rankUnit,rankingRules} from './gameRankings';
import {levelLabel} from './levelLabels';

const fmt=value=>Number(value).toLocaleString('vi-VN',{maximumFractionDigits:2});
const difficulty={easy:'Dễ',medium:'Trung bình',hard:'Khó',impossible:'Không thể đánh bại',expert:'Chuyên gia'};
function challengeLabel(game,variant,album){
 if(album)return levelLabel(album,variant);
 if(game==='onet'||game==='miner')return 'Level '+variant.slice(6);
 if(difficulty[variant])return difficulty[variant];
 if(game==='reaction')return variant==='bomb'?'Thử thách Bom':'Cổ điển';
 return variant.split('-').map(part=>difficulty[part]||({ai:'Chú Thơm',classic:'Cổ điển',speed:'Tăng tốc',traps:'Bom'})[part]||part).join(' · ');
}
function secondaryLabel(game,value){
 if(game==='mines')return fmt(value)+' giây tổng';
 if(game==='reaction')return fmt(value)+' ms trung bình';
 if(game==='tic'||game==='connect4')return value?'Chuỗi '+fmt(value)+' ván thắng':'Chưa ghi nhận chuỗi thắng';
 return '';
}
function breakdownValue(game,v,best,record){
 if(game==='jigsaw'){
  const lines=[(v.endsWith('-hard')?250:100)+' dép'];
  if(record.board_best!=null)lines.push('Một bàn: '+fmt(record.board_best)+' thao tác');
  if(record.tray_best!=null)lines.push('Có khay: '+fmt(record.tray_best)+' thao tác');
  return lines.join(' · ');
 }
 if(game==='puzzle')return (v.endsWith('-hard')?250:100)+' dép · '+fmt(best)+' bước';
 if(game==='simon')return fmt(best*({easy:1,medium:2,hard:3}[v]))+' dép · '+fmt(best)+' vòng';
 if(game==='mines')return fmt(best)+' giây';
 if(game==='reaction')return fmt(best)+' ms';
 if(game==='tic'||game==='connect4')return 'Đã thắng';
 return fmt(best)+' dép';
}
function RankDetails({game,album,row,onClose}){
 const dialog=useRef(null),list=useRef(null);
 const [page,setPage]=useState(0),[retry,setRetry]=useState(0),[data,setData]=useState(null);
 useEffect(()=>{
  const el=dialog.current,origin=document.activeElement,overflow=document.body.style.overflow;
  el.showModal();document.body.style.overflow='hidden';
  return ()=>{el.close();document.body.style.overflow=overflow;origin?.focus?.({preventScroll:true});};
 },[]);
 useEffect(()=>{
  let active=true;
  setData(null);
  if(list.current)list.current.scrollTop=0;
  loadRankingDetails(game,row.id,album,page).then(rows=>{if(active)setData({rows,page});})
   .catch(()=>{if(active)setData({error:true,page});});
  return ()=>{active=false;};
 },[game,row.id,album,page,retry]);
 const ready=data?.page===page&&data.rows;
 return createPortal(<dialog ref={dialog} className="rank-detail-dialog" aria-labelledby="rank-detail-title"
  onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}}}
  onClick={e=>{e.stopPropagation();if(e.target===dialog.current)onClose();}}>
  <div className="rank-detail-panel">
   <header><div><small>{GAMES.find(g=>g.id===game)?.name}</small><h2 id="rank-detail-title">Thành tích của {row.player_name}</h2></div>
    <button type="button" className="rank-detail-close" onClick={onClose} aria-label="Đóng chi tiết"><Icon name="close" size={19}/></button></header>
   <div className="rank-detail-summary"><span>Hạng <b>#{row.position}</b></span><span>Tổng <b>{fmt(row.score)} {rankUnit(game)}</b></span></div>
   <div className="rank-detail-list" ref={list} aria-live="polite" aria-busy={!ready&&!data?.error}>
    {data?.error?<p>Chưa tải được thành tích. <button onClick={()=>setRetry(n=>n+1)}>Thử lại</button></p>:!ready?<p>Đang tải chi tiết…</p>:
     !ready.length?<p>Chưa có thành tích trên trang này.</p>:<dl>{ready.slice(0,12).map(record=><div key={record.variant}><dt>{challengeLabel(game,record.variant,album)}</dt><dd>{breakdownValue(game,record.variant,record.best,record)}</dd></div>)}</dl>}
   </div>
   <footer><button type="button" disabled={page===0} onClick={()=>setPage(n=>n-1)}>Trang trước</button><span>Trang {page+1}</span>
    <button type="button" disabled={!ready||ready.length<=12} onClick={()=>setPage(n=>n+1)}>Trang sau</button></footer>
  </div>
 </dialog>,document.body);
}
export default function RankedBoard({game,album,revision=0}){
 const [view,setView]=useState(null),[detail,setDetail]=useState(null);
 useEffect(()=>{
  let active=true;
  const viewer=getPlayerId(),key='thom-ranking-view-v1:'+viewer+':'+game;
  loadGameRankings(game,album,viewer).then(rows=>{
   if(!active)return;
   let previous={};
   try{previous=JSON.parse(localStorage.getItem(key))||{};}catch{}
   const positions=Object.fromEntries(rows.map(r=>[r.id,Number(r.position)]));
   const mine=rows.find(r=>r.id===viewer),score=Number(mine?.score||0);
   const gain=revision&&previous.positions?score-(previous.score||0):null;
   const before=previous.positions||{};
   setView({game,rows,viewer,before,gain,revision});
   try{localStorage.setItem(key,JSON.stringify({positions,score}));}catch{}
  }).catch(e=>{if(active)setView({game,revision,error:e.message||'Không tải được bảng xếp hạng.'});});
  return ()=>{active=false;};
 },[game,album,revision]);
 if(!view||view.game!==game||view.revision!==revision)return <p role="status">Đang tải bảng xếp hạng…</p>;
 if(view.error)return <p role="alert">{view.error}</p>;
 const {rows,viewer,before,gain}=view;
 return <section className="game-rankings">
  <h3>Top 9 và hạng của bạn</h3><p>{rankingRules[game]}</p>
  {gain!=null&&<p role="status">Thay đổi thành tích tổng: {gain>0?'+':''}{fmt(gain)} {rankUnit(game)}.</p>}
  {rows.length>0&&<div className="leaderboard-table-wrap"><table className="leaderboard-table"><thead><tr><th>Hạng</th><th>Người chơi</th><th>Thành tích</th></tr></thead><tbody>{rows.map(row=>{
    const mine=row.id===viewer;
    return <tr key={row.id} className={mine?'rank-viewer':''}><td><b>#{row.position}</b><small>{before[row.id]||mine?movement(before[row.id],Number(row.position)):'Mới trong bảng'}</small></td>
     <td><b>{row.player_name}</b>{mine&&<small>Bạn</small>}</td>
     <td><strong>{fmt(row.score)} {rankUnit(game)}</strong><small>{secondaryLabel(game,Number(row.secondary))}</small>
      <button type="button" className="rank-details-open" aria-haspopup="dialog" onClick={()=>setDetail(row)}>Chi tiết</button></td></tr>;
   })}</tbody></table></div>}
  {!rows.some(row=>row.id===viewer)&&<p className="rank-unlisted">Bạn · Chưa xếp hạng</p>}
  {detail&&<RankDetails game={game} row={detail} album={album} onClose={()=>setDetail(null)}/>}
 </section>;
}
