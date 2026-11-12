import React from 'react';
import cards from './cards.json';
export const CARD_MAP=Object.fromEntries(cards.map(c=>[c.id,c]));
export const COLORS={red:'Đỏ',yellow:'Vàng',green:'Xanh lá',blue:'Xanh dương'};
export const symbol=c=>({skip:'⊘',reverse:'⇄',draw2:'+2',wild:'ĐỔI MÀU',wild_draw4:'+4'})[c?.value]||c?.value;
export const UnoCard=React.memo(function UnoCard({id,assets={},back=false,priority=false}){
 const c=CARD_MAP[id];
 if(back||!c)return <span className="uno-card uno-back"><img src="/assets/uno/back.webp" alt="Mặt sau bài JGKiD Uno" decoding="async" draggable="false"/></span>;
 const replacement=assets[id];
 return <span className={`uno-card uno-${c.color}`}><img src={replacement||c.image.replace(/\.svg$/i,".webp")} alt={c.name} loading={priority?"eager":"lazy"} decoding="async" draggable="false"/>{replacement&&<><b className="uno-corner">{symbol(c)}</b><b className="uno-corner bottom">{symbol(c)}</b></>}</span>;
});
