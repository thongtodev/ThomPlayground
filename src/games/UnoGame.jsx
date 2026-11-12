import {MobileHeader,useMobileTable} from '../uno/MobileTable';
import {tableSeats,toggleLandscape,isFullscreenActive} from '../uno/seating';
import {OpponentSeats, CenterBoard, PlayerHand} from '../uno/GameplayViews';
import {getTableEffects} from '../uno/tableEffects.js';
import {TableEffects,locateEffects} from '../uno/TableEffects.jsx';
import {getPlayableDraw} from '../uno/drawnSelection';
import {getUnoEffect} from '../uno/effects';
import React,{useState,useEffect,useRef} from 'react';
import {unoClient,connectUno,unoRequest} from '../uno/client';
import {UnoCard,CARD_MAP,COLORS} from '../uno/Card';
const ROOM_KEY='thom-uno-room-v1';
const readRoom=()=>{try{return localStorage.getItem(ROOM_KEY)||'';}catch{return '';}};
export function UnoGame({onHome,assets={},playSound=()=>{},soundEnabled=true,onToggleSound=()=>{}}){
 const mobile=useMobileTable();
 const [fullscreen,setFullscreen]=useState(()=>isFullscreenActive());
 const fullscreenBusy=useRef(false);
 useEffect(()=>{
  const sync=()=>setFullscreen(isFullscreenActive());
  document.addEventListener('fullscreenchange',sync);
  document.addEventListener('webkitfullscreenchange',sync);
  return()=>{
   document.removeEventListener('fullscreenchange',sync);
   document.removeEventListener('webkitfullscreenchange',sync);
  };
 },[]);
 const toggleFullscreen=async()=>{
  if(fullscreenBusy.current)return;
  fullscreenBusy.current=true;
  try{await toggleLandscape(document.documentElement);}
  finally{fullscreenBusy.current=false;setFullscreen(isFullscreenActive());}
 };
 const [playSubmitting,setPlaySubmitting]=useState(false);
 const [zoom,setZoom]=useState(true);
 const [catchNotice,setCatchNotice]=useState('');
 useEffect(()=>{
  if(!catchNotice)return;
  const timer=setTimeout(()=>setCatchNotice(''),2300);
  return ()=>clearTimeout(timer);
 },[catchNotice]);
 const invite=new URLSearchParams(location.search).get('room')||'';
 const [room,setRoom]=useState(null),[name,setName]=useState(()=>localStorage.getItem('thom-uno-name')||''),[code,setCode]=useState(invite),[capacity,setCapacity]=useState(4),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[selected,setSelected]=useState(null),[colorPicker,setColorPicker]=useState(false),[help,setHelp]=useState(false),[copy,setCopy]=useState(''),[drawn,setDrawn]=useState([]),[drawPulse,setDrawPulse]=useState(0);
 const [clock,setClock]=useState(()=>Date.now());
 const clockOffset=useRef(0);
 const [unoEffect,setUnoEffect]=useState(null);
 const [tableFx,setTableFx]=useState(null),rootRef=useRef(null);
 const handRef=useRef(null),focusDrawn=useRef(false);
 useEffect(()=>{const hand=handRef.current,card=hand?.querySelector('.selected');if(!card)return;if(focusDrawn.current){card.focus({preventScroll:true});focusDrawn.current=false;}const box=hand.getBoundingClientRect(),item=card.getBoundingClientRect();hand.scrollTo({left:hand.scrollLeft+item.left-box.left-(box.width-item.width)/2,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},[selected]);
 const roomRef=useRef(null),alive=useRef(true),actionBusy=useRef(false),refreshing=useRef(false),soundRef=useRef(playSound);soundRef.current=playSound;
 function apply(next){if(!alive.current)return;if(next?.removed){setError(next.notice);setTableFx(null);setUnoEffect(null);setRoom(null);roomRef.current=null;localStorage.removeItem(ROOM_KEY);return;}if(roomRef.current?.id===next.id&&next.version<=roomRef.current.version){
   // Polling and duplicate broadcasts must not rerender every card or restart visual effects.
   if(next.serverNow)clockOffset.current=Date.parse(next.serverNow)-Date.now();
   return;
  }
  if(next.serverNow)clockOffset.current=Date.parse(next.serverNow)-Date.now();
  setClock(Date.now());
  const prev=roomRef.current;
  const event=getUnoEffect(prev,next);
  const fx=getTableEffects(prev,next,CARD_MAP);if(fx)setTableFx(fx.deal?fx:locateEffects(fx,rootRef.current));
  else if(prev?.id!==next.id)setTableFx(null);
  if(event)setUnoEffect(event);
  else if(prev?.id!==next.id||next.status!=='playing')setUnoEffect(null);
  if(prev?.id===next.id&&prev.status==='playing'){const added=next.hand.filter(id=>!prev.hand.includes(id));if(added.length){setDrawn(added);setDrawPulse(n=>n+1);}}
  roomRef.current=next;setRoom(next);localStorage.setItem(ROOM_KEY,next.code);setStatus('');
  if(prev&&next.version>prev.version){const playableDraw=getPlayableDraw(prev,next);focusDrawn.current=!!playableDraw;setSelected(playableDraw);setColorPicker(false);soundRef.current(event?.kind==='uno'?1046:event?.kind==='catch'?196:next.status==='finished'?880:next.effect==='draw'?260:530,event?.kind==='catch'?.18:.07);}
 }
 useEffect(()=>{if(tableFx?.deal&&!tableFx.located&&rootRef.current)setTableFx({...locateEffects(tableFx,rootRef.current),located:true});},[tableFx?.key,room?.version]);
 useEffect(()=>{if(!drawn.length)return;const timer=setTimeout(()=>setDrawn([]),900);return()=>clearTimeout(timer);},[drawn]);
 useEffect(()=>{if(!unoEffect)return;const timer=setTimeout(()=>setUnoEffect(null),2000);return()=>clearTimeout(timer);},[unoEffect]);
 useEffect(()=>{if(!tableFx)return;const timer=setTimeout(()=>setTableFx(null),tableFx.winner?2600:1500);return()=>clearTimeout(timer);},[tableFx]);
 async function refresh(){if(refreshing.current||!roomRef.current)return;refreshing.current=true;try{apply(await unoRequest('snapshot',roomRef.current.code));}catch(e){if(alive.current)setStatus('Mạng đứt rồi, đang nối lại nhé');}finally{refreshing.current=false;}}
 useEffect(()=>{alive.current=true;let cancelled=false;const old=readRoom();if(old&&!invite&&unoClient){setBusy(true);connectUno().then(()=>unoRequest('snapshot',old)).then(x=>{if(!cancelled)apply(x);}).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setBusy(false);});}return()=>{alive.current=false;cancelled=true;};},[]);
 useEffect(()=>{if(!room?.id)return;let channel;let stopped=false;
  unoClient.auth.getSession().then(({data})=>{if(stopped)return;unoClient.realtime.setAuth(data.session?.access_token);channel=unoClient.channel('uno:'+room.id,{config:{private:true}}).on('broadcast',{event:'changed'},refresh).subscribe(s=>{if(!stopped)setStatus(s==='CHANNEL_ERROR'?'Mạng hơi chậm, chờ chút nhé':'');if(s==='SUBSCRIBED')refresh();});});
  const timer=setInterval(refresh,5000),online=()=>refresh();window.addEventListener('online',online);document.addEventListener('visibilitychange',online);
  return()=>{stopped=true;clearInterval(timer);window.removeEventListener('online',online);document.removeEventListener('visibilitychange',online);if(channel)unoClient.removeChannel(channel);};
 },[room?.id]);
 async function act(action,args={},attempt=null){if(actionBusy.current)return;actionBusy.current=true;setBusy(true);setError('');try{
  await connectUno();if(action==='create'||action==='join')localStorage.setItem('thom-uno-name',name.trim());
  if(action==='catch' && (!attempt || roomRef.current?.id!==attempt.roomId ||
      roomRef.current?.version!==attempt.version || roomRef.current?.unoTarget!==attempt.target)){
    setCatchNotice('Đã qua thời điểm bắt UNO.');await refresh();return;
  }
  const next=await unoRequest(action,roomRef.current?.code||code,{...args,...(['create','join'].includes(action)?{name:name.trim(),capacity}: {})},attempt?.version??roomRef.current?.version??null);
  if(action==='leave'){setTableFx(null);setUnoEffect(null);roomRef.current=null;setRoom(null);localStorage.removeItem(ROOM_KEY);}else apply(next);
 }catch(e){
  if(action==='catch' && /Trạng thái đã thay đổi|Không có lỗi UNO để bắt/i.test(e.message||'')){
   setCatchNotice('Đã qua thời điểm bắt UNO.');
  }else{setError(e.message||'Chưa được rồi, thử lại nhé.');}
  await refresh();
 }finally{actionBusy.current=false;if(alive.current)setBusy(false);}}
 useEffect(()=>{if(room?.status!=='playing'||!room.deadline)return;const tick=()=>{setClock(Date.now());if(Date.now()+clockOffset.current>=Date.parse(roomRef.current?.deadline)||Date.now()+clockOffset.current>=Date.parse(roomRef.current?.botDue))refresh();};const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[room?.status,room?.deadline]);
 const remaining=room?.deadline?Math.max(0,Math.ceil((Date.parse(room.deadline)-clock-clockOffset.current)/1000)):null;
 const activePlayerId=room?.pending?.target||room?.turn;
 const me=room?.players.find(p=>p.id===room.me),playing=room?.status==='playing',myTurn=playing&&room.turn===room.me&&!me?.left;
 const others=tableSeats(room);
 useEffect(()=>{if(!playing)return;document.body.classList.add('uno-table-mode');return()=>{document.body.classList.remove('uno-table-mode');try{screen.orientation?.unlock?.();}catch{}if((document.fullscreenElement||document.webkitFullscreenElement)===document.documentElement){try{const result=document.exitFullscreen?document.exitFullscreen():document.webkitExitFullscreen?.();result?.catch?.(()=>{});}catch{}}};},[playing]);
 // Immediate visual acknowledgment while awaiting the server; card state stays server-authoritative.
 const sendCard=async color=>{
  if(!selected||actionBusy.current)return;
  setPlaySubmitting(true);
  try{await act('play',{card:selected,...(color?{color}:{})});}
  finally{if(alive.current)setPlaySubmitting(false);}
 };
 const canPlay=!busy&&myTurn&&room?.legal.includes(selected)&&!room?.pending;
 const canDraw=!busy&&myTurn&&!room?.drew&&!room?.pending;
 const needsDraw=canDraw&&room.legal.length===0;
 const confirmPlay=()=>{if(!canPlay)return;if(CARD_MAP[selected]?.color==='wild')setColorPicker(true);else sendCard();};
 async function copyInvite(link){const value=link?`${location.origin}/games/uno?room=${room.code}`:room.code;try{await navigator.clipboard.writeText(value);setCopy(link?'Đã sao chép link':'Đã sao chép mã');}catch{setCopy(value);}}
 return <main ref={rootRef} className={`uno-page ${mobile&&playing?'uno-mobile-table':''} ${zoom?'':'uno-zoom-off'} ${playing?'uno-in-game':''} ${tableFx?.turn?'uno-my-turn-fx':''} ${tableFx?.reverse?'uno-reverse-fx':''}`}><TableEffects fx={tableFx} assets={assets}/>{mobile&&playing?<MobileHeader room={room} onHome={onHome} onHelp={()=>setHelp(true)} copyInvite={copyInvite} copy={copy} onLeave={()=>act('leave')} busy={busy} zoom={zoom} toggleZoom={()=>setZoom(value=>!value)} status={status} fullscreen={fullscreen} toggleFullscreen={toggleFullscreen}/>:<header className="uno-heading"><button className="back-link" onClick={onHome} aria-label="Trang chủ">{playing?'⌂':'Trang chủ'}</button><span className="eyebrow">THƠM PLAYGROUND · 2–4 NGƯỜI</span><h1>JGKiD <em>Uno</em></h1><button className="secondary-button" onClick={()=>setHelp(true)} aria-label="Luật chơi">{playing?'?':'Luật chơi'}</button>{playing&&<><button type="button" className="uno-screen-button" onClick={toggleFullscreen} aria-label={fullscreen?'Thoát toàn màn hình':'Toàn màn hình và thử xoay ngang'} aria-pressed={fullscreen}>{fullscreen?'⤡':'⛶'}</button><button type="button" className="uno-sound-button" onClick={onToggleSound} aria-label={soundEnabled?'Tắt âm thanh game':'Bật âm thanh game'}>{soundEnabled?'♫':'♪̸'}</button></>}</header>}
 {playing&&catchNotice&&<div className="uno-catch-notice" role="status">{catchNotice}</div>}
 {error&&<p className="uno-error" role="alert">{error}</p>}
 {!room?<section className="uno-welcome"><div className="uno-fan"><UnoCard id="red_5_a" assets={assets}/><UnoCard back/><UnoCard id="blue_reverse_a" assets={assets}/></div><h2>Chim cá ơi, vào chơi với Thơm nào!</h2><label>Biệt danh<input maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="Chim cá tên gì nè?"/></label><div className="uno-entry"><section><h3>Mở bàn đón chim cá</h3><label>Số người tối đa<select value={capacity} onChange={e=>setCapacity(+e.target.value)}>{[2,3,4].map(n=><option key={n}>{n}</option>)}</select></label><button className="primary-button" disabled={busy||!name.trim()||!unoClient} onClick={()=>act('create')}>Mở bàn nào</button></section><section><h3>Chim cá có hẹn rồi à?</h3><label>Mã phòng<input value={code} maxLength={8} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}/></label><button className="primary-button" disabled={busy||!name.trim()||code.length!==8||!unoClient} onClick={()=>act('join')}>Vào bàn</button></section></div>{!unoClient&&<p>Game cần kết nối Supabase. Xem hướng dẫn cài đặt đi kèm bản cập nhật.</p>}</section>:<>
 {(!mobile||!playing)&&<><div className="uno-room-bar"><strong>Phòng {room.code}</strong>{status&&<small role="status">{status}</small>}<button onClick={()=>copyInvite(false)}>Chép mã</button><button onClick={()=>copyInvite(true)}>Link mời</button><button disabled={busy} onClick={()=>act('leave')}>Rời phòng</button></div>{copy&&<p role="status">{copy}</p>}</>}
 {!playing?<section className="uno-lobby"><h2>{room.status==='finished'?`🎉 ${room.players.find(p=>p.id===room.winner)?.name||'Ván đấu'} chiến thắng!`:'Phòng chờ'}</h2>{room.status==='finished'&&<p>Thời gian ván: {Math.max(0,Math.round((Date.parse(room.endedAt)-Date.parse(room.startedAt))/1000))} giây.</p>}
 <p className="uno-landscape-tip">↻ Chim cá dùng điện thoại thì xoay ngang trước khi sẵn sàng nha.</p><ol>{[...room.players].filter(p=>!p.left||room.status==='finished').sort((a,b)=>room.status==='finished'?(a.id===room.winner?-1:b.id===room.winner?1:a.left&&!b.left?1:b.left&&!a.left?-1:a.count-b.count):0).map(p=><li key={p.id}><span className="uno-avatar">{p.name.slice(0,1)}</span><b>{p.name}{p.bot?' · BOT':p.id===room.me?' (Bạn)':''}</b><span>{p.left?'Đã rời':room.status==='finished'?`${p.count} lá`:p.id===room.host?'Chủ phòng':''}</span><small>{p.left?'':p.ready?'✓ Sẵn sàng':'Chưa sẵn sàng'}</small></li>)}</ol>
 <p>{room.players.filter(p=>!p.left).length}/{room.capacity} ghế</p>{room.me===room.host&&<label className="uno-bot-picker">Bot trong phòng<select aria-label="Số bot trong phòng" disabled={busy} value={room.players.filter(p=>p.bot&&!p.left).length} onChange={e=>act('set_bots',{count:Number(e.target.value)})}>{[0,1,2,3].map(n=><option key={n} value={n} disabled={n+room.players.filter(p=>!p.bot&&!p.left).length>room.capacity}>{n===0?'Không có bot':`${n} bot`}</option>)}</select><small>Bot tự sẵn sàng. Giảm số bot để dành ghế cho bạn bè.</small></label>}<div className="uno-actions"><button className="primary-button" disabled={busy} onClick={()=>act('ready',{ready:!me?.ready})}>{me?.ready?'Hủy sẵn sàng':room.status==='finished'?'Thêm ván nữa nha':'Sẵn sàng'}</button>{room.me===room.host&&<button className="primary-button" disabled={busy||room.players.filter(p=>!p.left).length<2||room.players.some(p=>!p.left&&!p.ready)} onClick={()=>act('start')}>{room.status==='finished'?'Chim cá ơi, chơi tiếp!':'Đủ hội rồi, chơi thôi!'}</button>}{room.status==='finished'&&room.me===room.host&&<button disabled={busy} onClick={()=>act('lobby')}>Về phòng chờ</button>}</div></section>:<>
 <OpponentSeats others={others} room={room} activePlayerId={activePlayerId} remaining={remaining} tableFx={tableFx} busy={busy} act={act}/>
 <CenterBoard room={room} canPlay={canPlay} confirmPlay={confirmPlay} unoEffect={unoEffect} remaining={remaining} needsDraw={needsDraw} canDraw={canDraw} act={act} assets={assets} myTurn={myTurn} mobile={mobile} tableFx={tableFx} playSubmitting={playSubmitting}/>
 {room.pending?.target===room.me&&<section className="uno-challenge"><h3>Ú òa, chim cá nhận +4 nè! {remaining!==null&&<span>({remaining}s)</span>}</h3><p>Chấp nhận: rút 4, mất lượt. Thách thức đúng: người đánh rút 4, bạn được đi. Thách thức sai: bạn rút 6, mất lượt.</p><button disabled={busy} onClick={()=>act('accept')}>Chấp nhận +4</button><button disabled={busy} onClick={()=>act('challenge')}>Thách thức</button></section>}
 <PlayerHand activePlayerId={activePlayerId} room={room} remaining={remaining} me={me} tableFx={tableFx} handRef={handRef} selected={selected} setSelected={setSelected} zoom={zoom} myTurn={myTurn} drawn={drawn} assets={assets} needsDraw={needsDraw} busy={busy} act={act} mobile={mobile}/>
 </>}
 </>}
 {colorPicker&&<div className="overlay" role="dialog" aria-modal="true" aria-label="Chọn màu"><div className="result-card"><h2>Chim cá thích màu nào?</h2><div className="uno-color-picker">{Object.entries(COLORS).map(([c,label])=><button className={'uno-color-'+c} key={c} disabled={busy} onClick={()=>sendCard(c)}>{label}</button>)}</div><button onClick={()=>setColorPicker(false)}>Hủy</button></div></div>}
 {help&&<div className="overlay" role="dialog" aria-modal="true" aria-label="Luật JGKiD Uno"><div className="result-card uno-help"><h2>Luật JGKiD Uno</h2><p>Mỗi lượt có 30 giây. Hết giờ tự rút 1 lá rồi chuyển lượt; nếu đã rút thì chỉ chuyển lượt. Khi nhận +4, có 15 giây để chấp nhận hoặc thách thức, quá giờ tự nhận 4 lá và mất lượt.</p><p>Mỗi người 7 lá. Đánh cùng màu, số hoặc ký hiệu. Hết bài trước sẽ thắng.</p><p>⊘ bỏ lượt · ⇄ đảo chiều (2 người: được đi tiếp) · +2: người kế rút 2 và mất lượt. Không cộng dồn.</p><p>Rút 1 lá mỗi lượt. Lá mới đánh được thì chọn lá đó và chạm bàn; không đánh được thì tự nhường lượt.</p><p>Wild chọn màu. +4 chỉ đúng luật khi không còn lá cùng màu hiện hành. Bạn vẫn có thể đánh +4 sai luật nhưng sẽ bị phạt nếu đối thủ thách thức.</p><p>Còn 1 lá: nhấn UNO trước khi đối thủ thực hiện nước đi kế tiếp. Quên báo có thể bị bắt và rút 2 lá.</p><p>Chim cá rời bàn là bỏ cuộc nhé. Lỡ mất mạng thì có 90 giây để quay lại.</p><button className="primary-button" onClick={()=>setHelp(false)}>Hiểu rồi, chơi nha!</button></div></div>}
 {playing&&<aside className="uno-rotate-guide" role="status"><div className="uno-phone-outline" aria-hidden="true">↻</div><h2>Chim cá mở toàn màn hình để chơi UNO nha!</h2><p>Bàn Uno sẽ vừa màn hình, bài trên tay cũng dễ nhìn hơn.</p><button type="button" onClick={toggleFullscreen}>⛶ {fullscreen?'Thoát toàn màn hình':'Mở toàn màn hình'}</button><button type="button" onClick={onHome}>Về trang chủ</button></aside>}</main>;
}
