import React,{useId} from 'react';
export function TurnRing({room}){
 const marker=useId().replace(/:/g,'');
 const order=room.order||[],n=order.length;
 if(n<2)return <p className="uno-turn-summary">Cần cập nhật SQL 1.61.5 để hiện chiều lượt.</p>;
 const points=n===2?[[22,50],[78,50]]:n===3?[[50,16],[79,80],[21,80]]:[[23,22],[77,22],[77,78],[23,78]];
 const current=order.indexOf(room.turn),dir=room.direction===-1?-1:1;
 const next=(current+dir+n)%n;
 const player=id=>room.players.find(p=>p.id===id);
 const label=id=>(player(id)?.name||'Chim cá')+(id===room.me?' (Bạn)':'');
 return <div className="uno-turn-ring" onClick={e=>e.stopPropagation()}>
  <div className="uno-turn-map" role="img" aria-label={`Chiều lượt: ${order.map((_,i)=>label(order[(Math.max(current,0)+dir*i+n*n)%n])).join(' → ')}`}>
   <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>
   {order.map((id,i)=>{const j=(i+dir+n)%n,a=points[i],b=points[j],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),pad=n===2?15:17;
    const offset=n===2?(i===0?-15:15):0;
    return <path key={id} d={`M ${a[0]+dx/len*pad} ${a[1]+dy/len*pad+offset} L ${b[0]-dx/len*pad} ${b[1]-dy/len*pad+offset}`} fill="none" stroke={i===current?'#ffda82':'#9a91ac'} strokeWidth={i===current?2:1.2} markerEnd={`url(#${marker})`}/>;})}</svg>
   <span className="uno-turn-direction" aria-hidden="true">{dir===1?'↻':'↺'}</span>
   {order.map((id,i)=><div key={id} className={`uno-turn-seat ${i===current?'current':i===next?'next':''}`} style={{left:points[i][0]+'%',top:points[i][1]+'%'}}><b title={label(id)}>{label(id)}</b><small>{i===current?(room.pending?'Xử lý +4':'Đang đi'):i===next?'Kế theo chiều':`${player(id)?.count??0} lá`}</small></div>)}
  </div>
  <p className="uno-turn-summary" aria-live="polite"><b>{label(room.turn)}</b>{room.pending?' đang xử lý +4':' đang đi'}<span>→ Kế theo chiều: <b>{label(order[next])}</b></span></p>
  <small className="uno-turn-note">Lá chức năng có thể đổi lượt kế tiếp.</small>
 </div>;
}
