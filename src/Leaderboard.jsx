import {ResultEffects,CountUp} from './effects/GameEffects.jsx';
import RankedBoard from './RankedBoard';
import {levelLabel} from './levelLabels';
import React, {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import Icon from './Icon';
import {getPlayerName, getPersonalHistory, setPlayerName, submitLeaderboardEntry} from './leaderboards';

const asDepText = value => typeof value==='string' ? value.replace(/điểm/gi,'dép').replace(/Thắng AI/gi,'Thắng chú Thơm').replace(/AI\s+/gi,'Đấu với chú Thơm · ').replace(/Máy chiến thắng/gi,'Chú Thơm chiến thắng').replace(/Máy thắng/gi,'Chú Thơm thắng').replace(/Lượt của Máy/gi,'Lượt của chú Thơm').replace(/Đấu máy/gi,'Đấu với chú Thơm').replace(/Máy đang suy nghĩ/gi,'Chú Thơm đang suy nghĩ').replace(/Máy đã nối đủ bốn quân/gi,'Chú Thơm đã nối đủ bốn quân') : value;
const formatDate = value => {
  try { return new Date(value).toLocaleString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch { return ''; }
};

export function LeaderboardResultModal({playSound,onViewAlbum,albums,result,onClose,onRestart,onOpenBoard}) {
  const [name,setName] = useState(getPlayerName());
  const [sending,setSending] = useState(false);
  const [sent,setSent] = useState(false);
  const [message,setMessage] = useState('');
  const [recentRuns,setRecentRuns] = useState([]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    const appRoot = document.querySelector('.app-shell');
    const previousInert = appRoot?.inert ?? false;
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    if (appRoot) { appRoot.inert = true; appRoot.setAttribute('aria-hidden', 'true'); }
    const handleKeyDown = event => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      if (appRoot) {
        appRoot.inert = previousInert;
        if (previousAriaHidden === null) appRoot.removeAttribute('aria-hidden');
        else appRoot.setAttribute('aria-hidden', previousAriaHidden);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  useEffect(() => { setRecentRuns(getPersonalHistory(result.gameId,result.variant).slice(0,3)); }, [result.gameId,result.variant]);
  const submit = async event => {
    event.preventDefault();
    if (!result.eligible || sending || sent) return;
    setSending(true);setMessage('');
    try {
      await submitLeaderboardEntry(result,name);
      setName(getPlayerName());setSent(true);setMessage('Đã ghi nhận kỷ lục của bạn!');
    } catch(error) { setMessage(error.message || 'Chưa gửi được kỷ lục.'); }
    finally { setSending(false); }
  };
  const share = async () => {
    const text = `${result.gameName} · ${result.summary} — Thơm Playground`;
    try {
      if (navigator.share) await navigator.share({title:'Kỷ lục Thơm Playground',text,url:location.href});
      else { await navigator.clipboard.writeText(text);setMessage('Đã sao chép kết quả để chia sẻ.'); }
    } catch {}
  };
  return createPortal(<div className="overlay leaderboard-overlay" role="dialog" aria-modal="true" aria-label="Kết quả và bảng kỷ lục" onClick={onClose}>
    <div className="result-card leaderboard-result-card" onClick={event=>event.stopPropagation()}>
      <button type="button" className="close-modal leaderboard-result-close" onClick={onClose} aria-label="Đóng bảng thành tích"><Icon name="close" size={18}/></button>
      <ResultEffects result={result} playSound={playSound}/>{result.gameId==='mole'&&result.metricValue>0&&<div className="game-loot" aria-hidden="true">{[0,1,2,3,4].map(i=><img key={i} src="/assets/slipper-cursor.png" alt="" style={{'--start-x':`${(i-2)*42}px`,animationDelay:`${i*.05}s`}}/>)}</div>}{!['tic','connect4'].includes(result.gameId)&&<div className="game-result-count"><CountUp value={result.metricValue}/><small> {result.metricKind==='steps'?'thao tác':result.metricKind==='reaction'?'ms':result.metricKind==='time'?'giây':result.metricKind==='wins'?'trận thắng':result.gameId==='simon'?'vòng':result.gameId==='connect4'?'điểm':'dép'}</small></div>}<div className="leaderboard-result-scroll"><div className="leaderboard-result-top"><span className="leaderboard-result-icon"><Icon name="trophy" size={38}/></span><span className="eyebrow">{result.gameName}</span><h2>{result.title || 'Ván chơi kết thúc!'}</h2><p>{asDepText(result.summary)}</p>{onViewAlbum&&<button type="button" className="primary-button miner-view-album" onClick={onViewAlbum}><Icon name="gallery" size={20}/> Xem bộ sưu tập</button>}</div>
      <div className="leaderboard-personal-best"><span><small>Kỷ lục cá nhân</small><b>{asDepText(result.personalBest?.metricLabel || (result.eligible ? result.metricLabel : 'Chưa có'))}</b></span><span className="leaderboard-personal-badge"><Icon name="star" size={13}/> Cá nhân</span></div>
      {result.eligible ? <form className="leaderboard-submit-form" onSubmit={submit}>
        <label htmlFor="leaderboard-player-name">Tên của bạn</label>
        <input id="leaderboard-player-name" value={name} onChange={e=>setName(e.target.value)} maxLength={24} minLength={2} placeholder="Nhập tên hiển thị" required/>
        <button className="primary-button" type="submit" disabled={sending||sent||name.trim().length<2}>{sent?<><Icon name="check" size={16}/> Đã gửi kỷ lục</>:sending?'Đang gửi…':<><Icon name="trophy" size={16}/> Gửi kỷ lục</>}</button>
      </form> : <div className="leaderboard-ineligible">Ván này chưa đủ điều kiện ghi bảng xếp hạng. Bạn vẫn có thể xem bàn chơi và thử lại.</div>}
      {message&&<p className={`leaderboard-message ${sent?'success':''}`} role="status">{message}</p>}
      {recentRuns.length>0&&<section className="leaderboard-result-history"><b>Ván gần đây của bạn</b>{recentRuns.map(run=><div key={run.id}><span>{formatDate(run.playedAt)}</span><strong>{asDepText(run.metricLabel)}</strong></div>)}</section>}
      <div className="leaderboard-result-board"><RankedBoard game={result.gameId} album={albums[result.gameId]} revision={sent?1:0}/><button className="secondary-button" type="button" onClick={onOpenBoard}>Xem bảng xếp hạng</button></div>
      </div>
      <div className="leaderboard-result-actions"><button type="button" className="secondary-button" onClick={onClose}>Xem bàn</button><button type="button" className="secondary-button" onClick={share}>Chia sẻ</button><button type="button" className="primary-button" onClick={onRestart}><Icon name="rotate" size={16}/> Ván mới</button></div>
    </div>
  </div>, document.body);
}

export default function LeaderboardPage({games,onHome,albums,onetTotal}) {
  const requested=new URLSearchParams(window.location.search).get('game');
  const [choice,setGameId]=useState(requested);
  const game=games.find(item=>item.id===choice)||games[0];
  const gameId=game?.id;
  const history=getPersonalHistory(gameId).filter(run=>!albums[gameId]||levelLabel(albums[gameId],run.variant));
  return <main className="leaderboard-page">
    <button className="back-link" onClick={onHome}>Trang chủ</button>
    <div className="leaderboard-page-heading"><span className="eyebrow">THƠM PLAYGROUND</span><h1><Icon name="trophy" size={34}/> Bảng xếp hạng</h1></div>
    {!games.length?<section className="leaderboard-page-card"><div className="leaderboard-empty"><span><Icon name="gamepad" size={26}/></span><b>Chưa có trò chơi đang mở</b></div></section>:<section className="leaderboard-page-card">
      <div className="leaderboard-page-filters"><label>Trò chơi<select value={gameId} onChange={e=>setGameId(e.target.value)}>{games.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>
      <RankedBoard key={gameId} game={gameId} album={albums[gameId]}/>
      <section className="personal-records-section">
        <div className="personal-records-heading"><div><small>THÀNH TÍCH CỦA BẠN</small><h2>{gameId==='onet'?'Tổng cá nhân: '+onetTotal.toLocaleString('vi-VN')+' dép':'Lịch sử từng ván'}</h2><p>{history.length} ván đã lưu trên thiết bị này</p></div><span><Icon name="book" size={24}/></span></div>
        {!history.length?<div className="leaderboard-empty"><span><Icon name="target" size={24}/></span><b>Chưa có lịch sử ván chơi</b><small>Kết quả các ván hoàn thành sẽ xuất hiện tại đây.</small></div>:<div className="personal-history-list">{history.slice(0,50).map((run,index)=><article className="personal-history-row" key={run.id||`${run.playedAt}-${index}`}><div className="personal-history-index">{index+1}</div><div className="personal-history-copy"><b>{run.title}</b><small>{albums[run.gameId]?levelLabel(albums[run.gameId],run.variant):run.variantLabel} · {formatDate(run.playedAt)}</small>{run.summary&&<p>{run.summary}</p>}</div><strong className={run.eligible?'':'not-ranked'}>{asDepText(run.metricLabel)}</strong></article>)}</div>}
      </section>
    </section>}
  </main>;
}
