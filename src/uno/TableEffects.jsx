import React from 'react';
import {UnoCard,COLORS} from './Card';
export function locateEffects(fx,root){
 if(!fx||!root)return fx;
 // Resolve layout anchors once per action; dealing can spawn dozens of flights.
 const anchors=new Map(Array.from(root.querySelectorAll('[data-fx-anchor]'),el=>[el.dataset.fxAnchor,el]));
 const rects=new Map();
 const find=key=>{const node=anchors.get(key);if(!node)return null;if(!rects.has(key))rects.set(key,node.getBoundingClientRect());return rects.get(key);};
 const flights=fx.flights.flatMap((flight,i)=>{const a=find(flight.from),b=find(flight.to);if(!a||!b)return [];return [{...flight,key:i,x:a.left+a.width/2-30,y:a.top+a.height/2-45,dx:b.left+b.width/2-a.left-a.width/2,dy:b.top+b.height/2-a.top-a.height/2}];});
 return {...fx,flights};
}
export function TableEffects({fx,assets}){
 if(!fx)return null;
 const message=fx.winner?{title:'Chim cá này đỉnh quá ta!',detail:fx.winner}:fx.message;
 return <>
  <div className="uno-flight-layer" aria-hidden="true">{fx.flights.filter(f=>Number.isFinite(f.x)).map(f=><span key={`${fx.key}-${f.key}`} className="uno-moving-card" style={{left:f.x,top:f.y,'--dx':`${f.dx}px`,'--dy':`${f.dy}px`,animationDelay:`${f.delay||0}ms`}}><UnoCard id={f.card} back={!f.card} assets={assets} priority/></span>)}</div>
  {fx.turn&&<div key={fx.key+'turn'} className="uno-turn-toast" role="status">Tới chim cá rồi nè!</div>}
  {message&&<div key={fx.key+'message'} className={`uno-fx-message ${fx.winner?'is-winner':''}`} role="status"><strong>{message.title}</strong><span>{COLORS[message.detail]||message.detail}</span>{fx.winner&&Array.from({length:12},(_,i)=><i key={i} aria-hidden="true" style={{'--x':`${i*8}%`,'--delay':`${i%4*.1}s`}}/>)}</div>}
 </>;
}
