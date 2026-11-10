import React from 'react';
export function TurnRing({room}){
 const order=room.order||[],current=order.indexOf(room.turn),dir=room.direction===-1?-1:1;
 const nextId=current>=0&&order.length>1?order[(current+dir+order.length)%order.length]:null;
 const next=room.players.find(p=>p.id===nextId);
 const label=nextId===room.me?'Bạn':next?.name;
 return <div className="uno-turn-strip" onClick={e=>e.stopPropagation()}>
  <span className="uno-turn-direction"><span aria-hidden="true">{dir===1?'↻':'↺'}</span> {dir===1?'Thuận chiều':'Ngược chiều'}</span>
  <span className="uno-turn-next" title={room.pending?'Đang chờ xử lý +4':label?`Kế theo chiều: ${label}. Lá chức năng có thể đổi lượt.`:undefined}>{room.pending?'Đang xử lý +4':label?<>Kế: <b>{label}</b></>:'Chờ lượt'}</span>
 </div>;
}
