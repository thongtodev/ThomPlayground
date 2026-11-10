import {getUnoEffect} from '../uno/effects';
import {TurnRing} from '../uno/TurnRing';
import React,{useState,useEffect,useRef} from 'react';
import {unoClient,connectUno,unoRequest} from '../uno/client';
import {UnoCard,CARD_MAP,COLORS} from '../uno/Card';
const friendlyNotice = text => ({
 'Đã chia 7 lá. Bắt đầu!':'Chia bài xong rồi, chim cá chơi thôi!',
 'Bắt UNO thành công: rút 2 lá.':'Chim cá quên UNO rồi nè! Nhận thêm 2 lá nha.',
 'Thách thức đúng! Người đánh +4 rút 4 lá; bạn được đi.':'Bắt đúng rồi! Người ra +4 rút 4 lá, tới lượt bạn nhé.',
 'Thách thức sai: rút 6 lá, mất lượt.':'Đoán trật rồi! Bạn rút 6 lá và nhường lượt nhé.',
 'Đã rút 4 lá, mất lượt.':'Nhận 4 lá nhé, lượt này nhường bạn kế bên.',
 'Đã rút bài. Chỉ được đánh lá vừa rút hoặc chuyển lượt.':'Rút rồi nè, chim cá xem lá mới nha!',
 'Đã chuyển lượt.':'Tới chim cá kế bên rồi nha!',
 'Đã đánh bài.':'Ra bài rồi nhé!',
 '+4: chấp nhận hoặc thách thức.':'Có +4 kìa! Nhận bài hay thách thức đây?',
 'Đối thủ rút 2 lá và mất lượt.':'Gửi chim cá kế bên 2 lá, nhường lượt nha!',
 'Một người chơi đã bỏ cuộc.':'Một chim cá rời bàn rồi, cả nhà chơi tiếp nha.'
})[text] || text;
const ROOM_KEY='thom-uno-room-v1';
const readRoom=()=>{try{return localStorage.getItem(ROOM_KEY)||'';}catch{return '';}};
export function UnoGame({onHome,assets={},playSound=()=>{}}){
 const invite=new URLSearchParams(location.search).get('room')||'';
 const [room,setRoom]=useState(null),[name,setName]=useState(()=>localStorage.getItem('thom-uno-name')||''),[code,setCode]=useState(invite),[capacity,setCapacity]=useState(4),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[selected,setSelected]=useState(null),[colorPicker,setColorPicker]=useState(false),[help,setHelp]=useState(false),[copy,setCopy]=useState(''),[drawn,setDrawn]=useState([]),[drawPulse,setDrawPulse]=useState(0);
 const [clock,setClock]=useState(()=>Date.now());
 const clockOffset=useRef(0);
 const [unoEffect,setUnoEffect]=useState(null);
 const handRef=useRef(null);
 useEffect(()=>{const hand=handRef.current,card=hand?.querySelector('.selected');if(!card)return;const box=hand.getBoundingClientRect(),item=card.getBoundingClientRect();hand.scrollTo({left:hand.scrollLeft+item.left-box.left-(box.width-item.width)/2,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},[selected]);
 const roomRef=useRef(null),alive=useRef(true),actionBusy=useRef(false),refreshing=useRef(false),soundRef=useRef(playSound);soundRef.current=playSound;
 function apply(next){if(!alive.current)return;if(next?.removed){setError(next.notice);setUnoEffect(null);setRoom(null);roomRef.current=null;localStorage.removeItem(ROOM_KEY);return;}if(roomRef.current?.id===next.id&&next.version<roomRef.current.version)return;
  if(next.serverNow)clockOffset.current=Date.parse(next.serverNow)-Date.now();
  setClock(Date.now());
  const prev=roomRef.current;
  const event=getUnoEffect(prev,next);
  if(event)setUnoEffect(event);
  else if(prev?.id!==next.id||next.status!=='playing')setUnoEffect(null);
  if(prev?.id===next.id&&prev.status==='playing'){const added=next.hand.filter(id=>!prev.hand.includes(id));if(added.length){setDrawn(added);setDrawPulse(n=>n+1);}}
  roomRef.current=next;setRoom(next);localStorage.setItem(ROOM_KEY,next.code);setStatus('');
  if(prev&&next.version>prev.version){setSelected(null);setColorPicker(false);soundRef.current(event?.kind==='uno'?1046:event?.kind==='catch'?196:next.status==='finished'?880:next.effect==='draw'?260:530,event?.kind==='catch'?.18:.07);}
 }
 useEffect(()=>{if(!drawn.length)return;const timer=setTimeout(()=>setDrawn([]),900);return()=>clearTimeout(timer);},[drawn]);
 useEffect(()=>{if(!unoEffect)return;const timer=setTimeout(()=>setUnoEffect(null),2000);return()=>clearTimeout(timer);},[unoEffect]);
 async function refresh(){if(refreshing.current||!roomRef.current)return;refreshing.current=true;try{apply(await unoRequest('snapshot',roomRef.current.code));}catch(e){if(alive.current)setStatus('Mạng đứt rồi, đang nối lại nhé');}finally{refreshing.current=false;}}
 useEffect(()=>{alive.current=true;let cancelled=false;const old=readRoom();if(old&&!invite&&unoClient){setBusy(true);connectUno().then(()=>unoRequest('snapshot',old)).then(x=>{if(!cancelled)apply(x);}).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setBusy(false);});}return()=>{alive.current=false;cancelled=true;};},[]);
 useEffect(()=>{if(!room?.id)return;let channel;let stopped=false;
  unoClient.auth.getSession().then(({data})=>{if(stopped)return;unoClient.realtime.setAuth(data.session?.access_token);channel=unoClient.channel('uno:'+room.id,{config:{private:true}}).on('broadcast',{event:'changed'},refresh).subscribe(s=>{if(!stopped)setStatus(s==='CHANNEL_ERROR'?'Mạng hơi chậm, chờ chút nhé':'');if(s==='SUBSCRIBED')refresh();});});
  const timer=setInterval(refresh,5000),online=()=>refresh();window.addEventListener('online',online);document.addEventListener('visibilitychange',online);
  return()=>{stopped=true;clearInterval(timer);window.removeEventListener('online',online);document.removeEventListener('visibilitychange',online);if(channel)unoClient.removeChannel(channel);};
 },[room?.id]);
 async function act(action,args={}){if(actionBusy.current)return;actionBusy.current=true;setBusy(true);setError('');try{
  await connectUno();if(action==='create'||action==='join')localStorage.setItem('thom-uno-name',name.trim());
  const next=await unoRequest(action,roomRef.current?.code||code,{...args,...(['create','join'].includes(action)?{name:name.trim(),capacity}: {})},roomRef.current?.version??null);
  if(action==='leave'){setUnoEffect(null);roomRef.current=null;setRoom(null);localStorage.removeItem(ROOM_KEY);}else apply(next);
 }catch(e){setError(e.message||'Chưa được rồi, thử lại nhé.');await refresh();}finally{actionBusy.current=false;if(alive.current)setBusy(false);}}
 useEffect(()=>{if(room?.status!=='playing'||!room.deadline)return;const tick=()=>{setClock(Date.now());if(Date.now()+clockOffset.current>=Date.parse(roomRef.current?.deadline))refresh();};const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[room?.status,room?.deadline]);
 const remaining=room?.deadline?Math.max(0,Math.ceil((Date.parse(room.deadline)-clock-clockOffset.current)/1000)):null;
 const me=room?.players.find(p=>p.id===room.me),playing=room?.status==='playing',myTurn=playing&&room.turn===room.me&&!me?.left;
 const others=room?.players.filter(p=>p.id!==room.me&&!p.left)||[];
 const sendCard=color=>{if(!selected)return;act('play',{card:selected,...(color?{color}:{})});};
 const canPlay=!busy&&myTurn&&room?.legal.includes(selected)&&!room?.pending;
 const canDraw=!busy&&myTurn&&!room?.drew&&!room?.pending;
 const needsDraw=canDraw&&room.legal.length===0;
 const confirmPlay=()=>{if(!canPlay)return;if(CARD_MAP[selected]?.color==='wild')setColorPicker(true);else sendCard();};
 async function copyInvite(link){const value=link?`${location.origin}/games/uno?room=${room.code}`:room.code;try{await navigator.clipboard.writeText(value);setCopy(link?'Đã sao chép link':'Đã sao chép mã');}catch{setCopy(value);}}
 return <main className={`uno-page ${playing?'uno-in-game':''}`}><header className="uno-heading"><button className="back-link" onClick={onHome}>Trang chủ</button><span className="eyebrow">THƠM PLAYGROUND · 2–4 NGƯỜI</span><h1>JGKiD <em>Uno</em></h1><button className="secondary-button" onClick={()=>setHelp(true)}>Luật chơi</button></header>
 {error&&<p className="uno-error" role="alert">{error}</p>}
 {!room?<section className="uno-welcome"><div className="uno-fan"><UnoCard id="red_5_a" assets={assets}/><UnoCard back/><UnoCard id="blue_reverse_a" assets={assets}/></div><h2>Chim cá ơi, vào chơi với Thơm nào!</h2><label>Biệt danh<input maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="Chim cá tên gì nè?"/></label><div className="uno-entry"><section><h3>Mở bàn đón chim cá</h3><label>Số người tối đa<select value={capacity} onChange={e=>setCapacity(+e.target.value)}>{[2,3,4].map(n=><option key={n}>{n}</option>)}</select></label><button className="primary-button" disabled={busy||!name.trim()||!unoClient} onClick={()=>act('create')}>Mở bàn nào</button></section><section><h3>Chim cá có hẹn rồi à?</h3><label>Mã phòng<input value={code} maxLength={8} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}/></label><button className="primary-button" disabled={busy||!name.trim()||code.length!==8||!unoClient} onClick={()=>act('join')}>Vào bàn</button></section></div>{!unoClient&&<p>Game cần kết nối Supabase. Xem hướng dẫn cài đặt đi kèm bản cập nhật.</p>}</section>:<>
 <div className="uno-room-bar"><strong>Phòng {room.code}</strong>{status&&<small role="status">{status}</small>}<button onClick={()=>copyInvite(false)}>Chép mã</button><button onClick={()=>copyInvite(true)}>Link mời</button><button disabled={busy} onClick={()=>act('leave')}>Rời phòng</button></div>{copy&&<p role="status">{copy}</p>}
 {!playing?<section className="uno-lobby"><h2>{room.status==='finished'?`🎉 ${room.players.find(p=>p.id===room.winner)?.name||'Ván đấu'} chiến thắng!`:'Phòng chờ'}</h2>{room.status==='finished'&&<p>Thời gian ván: {Math.max(0,Math.round((Date.parse(room.endedAt)-Date.parse(room.startedAt))/1000))} giây.</p>}
 <ol>{[...room.players].filter(p=>!p.left||room.status==='finished').sort((a,b)=>room.status==='finished'?(a.id===room.winner?-1:b.id===room.winner?1:a.left&&!b.left?1:b.left&&!a.left?-1:a.count-b.count):0).map(p=><li key={p.id}><span className="uno-avatar">{p.name.slice(0,1)}</span><b>{p.name}{p.id===room.me?' (Bạn)':''}</b><span>{p.left?'Đã rời':room.status==='finished'?`${p.count} lá`:p.id===room.host?'Chủ phòng':''}</span><small>{p.left?'':p.ready?'✓ Sẵn sàng':'Chưa sẵn sàng'}</small></li>)}</ol>
 <p>{room.players.filter(p=>!p.left).length}/{room.capacity} người</p><div className="uno-actions"><button className="primary-button" disabled={busy} onClick={()=>act('ready',{ready:!me?.ready})}>{me?.ready?'Hủy sẵn sàng':room.status==='finished'?'Thêm ván nữa nha':'Sẵn sàng'}</button>{room.me===room.host&&<button className="primary-button" disabled={busy||room.players.filter(p=>!p.left).length<2||room.players.some(p=>!p.left&&!p.ready)} onClick={()=>act('start')}>{room.status==='finished'?'Chim cá ơi, chơi tiếp!':'Đủ hội rồi, chơi thôi!'}</button>}{room.status==='finished'&&room.me===room.host&&<button disabled={busy} onClick={()=>act('lobby')}>Về phòng chờ</button>}</div></section>:<>
 <div className="uno-opponents">{others.map(p=><article key={p.id} className={room.turn===p.id?'is-turn':''}><span className="uno-avatar">{p.name.slice(0,1)}</span><b>{p.name}</b><span>{p.count} lá</span>{p.count===1&&(room.unoTarget===p.id?<button className="uno-catch" disabled={busy} onClick={()=>act('catch')}>Bắt UNO!</button>:<strong>UNO!</strong>)}</article>)}</div>
 <section className={`uno-table uno-color-${room.color} ${canPlay?'can-play':''}`} onClick={e=>{if(!e.target.closest('button'))confirmPlay();}}>{unoEffect&&<div key={unoEffect.key} className={`uno-event uno-event-${unoEffect.kind}`} role="status" aria-live="polite"><div className="uno-event-burst"><span className="uno-event-name">{unoEffect.name}</span><strong>{unoEffect.kind==='uno'?'UNO!':'BỊ BẮT UNO!'}</strong><span className="uno-event-caption">{unoEffect.kind==='uno'?'Còn một lá thôi!':'+2 lá · Quên hô UNO rồi!'}</span></div></div>}<div className="uno-table-meta"><b>Màu: {COLORS[room.color]}</b>{remaining!==null&&<div className={`uno-countdown ${remaining<=5?'is-urgent':''}`} role="timer" aria-label={`${room.pending?'Xử lý cộng 4':'Lượt chơi'} còn ${remaining} giây`}><span>{room.pending?'Quyết định +4':'Lượt chơi'}</span><b>{remaining}s</b></div>}</div><TurnRing room={room}/><div className="uno-piles"><div className={`uno-draw-stack ${needsDraw?'needs-draw':''}`} onClick={e=>{e.stopPropagation();if(!e.target.closest('button')&&canDraw)act('draw');}}><button className="uno-pile-button" aria-label="Rút một lá bài" disabled={!canDraw} onClick={()=>act('draw')}><UnoCard back/></button><small>{room.drawCount} lá · Rút bài</small>{drawn.length>0&&<span key={drawPulse} className="uno-draw-flight" aria-hidden="true"><UnoCard back/></span>}</div><div key={room.top} className="uno-discard"><button className="uno-pile-button" disabled={!canPlay} aria-label="Đánh lá đã chọn lên bàn" onClick={confirmPlay}><UnoCard id={room.top} assets={assets}/></button><small>{canPlay?'Chạm để ra bài':'Lá trên bàn'}</small></div></div><p key={room.version} className="uno-notice" role="status">{friendlyNotice(room.notice)}</p><strong>{needsDraw?'CHIM CÁ ƠI, CHẠM BỘ BÀI ÚP ĐỂ RÚT NHA!':myTurn?'TỚI CHIM CÁ RỒI, RA BÀI NÀO!':`Đang chờ ${room.players.find(p=>p.id===room.turn)?.name||'đối thủ'}`}</strong></section>
 {room.pending?.target===room.me&&<section className="uno-challenge"><h3>Ú òa, chim cá nhận +4 nè! {remaining!==null&&<span>({remaining}s)</span>}</h3><p>Chấp nhận: rút 4, mất lượt. Thách thức đúng: người đánh rút 4, bạn được đi. Thách thức sai: bạn rút 6, mất lượt.</p><button disabled={busy} onClick={()=>act('accept')}>Chấp nhận +4</button><button disabled={busy} onClick={()=>act('challenge')}>Thách thức</button></section>}
 <section className="uno-hand-area"><h2>Bài của chim cá <small>{room.hand.length} lá</small></h2><div className="uno-hand" ref={handRef}>{room.hand.map(id=><button key={id} className={`uno-hand-card ${room.legal.includes(id)?'is-legal':''} ${selected===id?'selected':''} ${drawn.includes(id)?'just-drawn':''}`} onClick={()=>setSelected(selected===id?null:id)} aria-pressed={selected===id} aria-label={CARD_MAP[id]?.name}><UnoCard id={id} assets={assets}/></button>)}</div><div className="uno-actions uno-hand-tools"><span className="uno-hand-hint">{room.unoTarget===room.me?'Một lá rồi, chim cá hô UNO mau!':needsDraw?'Chưa có lá hợp, rút thêm một lá nha!':room.hand.length===2?'Sắp UNO rồi, chim cá nhớ nha!':selected?(room.legal.includes(selected)&&myTurn?'Chạm lên bàn để ra bài':'Lá này chưa đánh được nhé'):'Chạm lá để chọn'}</span>{room.unoTarget===room.me&&<button className="uno-call uno-call-now" disabled={busy} onClick={()=>act('uno')}>UNO!</button>}</div>{room.drew&&myTurn&&<p>Lá mới hợp đó! Chim cá chọn rồi chạm bàn để đánh nha.</p>}</section>
 </>}
 </>}
 {colorPicker&&<div className="overlay" role="dialog" aria-modal="true" aria-label="Chọn màu"><div className="result-card"><h2>Chim cá thích màu nào?</h2><div className="uno-color-picker">{Object.entries(COLORS).map(([c,label])=><button className={'uno-color-'+c} key={c} disabled={busy} onClick={()=>sendCard(c)}>{label}</button>)}</div><button onClick={()=>setColorPicker(false)}>Hủy</button></div></div>}
 {help&&<div className="overlay" role="dialog" aria-modal="true" aria-label="Luật JGKiD Uno"><div className="result-card uno-help"><h2>Luật JGKiD Uno</h2><p>Mỗi lượt có 30 giây. Hết giờ tự rút 1 lá rồi chuyển lượt; nếu đã rút thì chỉ chuyển lượt. Khi nhận +4, có 15 giây để chấp nhận hoặc thách thức, quá giờ tự nhận 4 lá và mất lượt.</p><p>Mỗi người 7 lá. Đánh cùng màu, số hoặc ký hiệu. Hết bài trước sẽ thắng.</p><p>⊘ bỏ lượt · ⇄ đảo chiều (2 người: được đi tiếp) · +2: người kế rút 2 và mất lượt. Không cộng dồn.</p><p>Rút 1 lá mỗi lượt. Lá mới đánh được thì chọn lá đó và chạm bàn; không đánh được thì tự nhường lượt.</p><p>Wild chọn màu. +4 chỉ đúng luật khi không còn lá cùng màu hiện hành. Bạn vẫn có thể đánh +4 sai luật nhưng sẽ bị phạt nếu đối thủ thách thức.</p><p>Còn 1 lá: nhấn UNO trước khi đối thủ thực hiện nước đi kế tiếp. Quên báo có thể bị bắt và rút 2 lá.</p><p>Chim cá rời bàn là bỏ cuộc nhé. Lỡ mất mạng thì có 90 giây để quay lại.</p><button className="primary-button" onClick={()=>setHelp(false)}>Hiểu rồi, chơi nha!</button></div></div>}
 </main>;
}
