import test from 'node:test';
import assert from 'node:assert/strict';
import {getTableEffects} from '../src/uno/tableEffects.js';
const cards={r:{value:'reverse',color:'red'},s:{value:'skip',color:'red'},w:{value:'wild_draw4',color:'wild'},n:{value:'5',color:'red'}};
const prev={id:'x',version:10,status:'playing',me:'a',turn:'a',order:['a','b','c'],direction:1,top:'n',players:[{id:'a',name:'A',count:3},{id:'b',name:'B',count:3},{id:'c',name:'C',count:3}],pending:null};
const next=over=>({...prev,version:11,...over});
test('play, reverse, skip and private opponent flights',()=>{
 assert.equal(getTableEffects(prev,next({top:'r',direction:-1}),cards).reverse,true);
 assert.equal(getTableEffects(prev,next({top:'s'}),cards).badges[0].id,'b');
 assert.equal(getTableEffects({...prev,direction:-1},next({top:'s'}),cards).badges[0].id,'c');
 assert.equal(getTableEffects(prev,next({top:'r'}),cards).flights[0].card,'r');
 assert.equal(getTableEffects({...prev,turn:'b'},next({top:'r'}),cards).flights[0].card,null);
});
test('+4 waits for resolution, actual penalties fly face down, challenge outcome',()=>{
 const pending=next({top:'w',color:'blue',pending:{actor:'a',target:'b'},turn:'b'});
 const fx=getTableEffects(prev,pending,cards);assert.equal(fx.color,true);assert.equal(fx.flights.length,1);assert.match(fx.badges[0].text,/Chờ/);
 const resolved={...pending,version:12,pending:null,effect:'draw',notice:'Thách thức sai: rút 6 lá, mất lượt.',players:prev.players.map(p=>p.id==='b'?{...p,count:9}:p)};
 const penalty=getTableEffects(pending,resolved,cards);assert.equal(penalty.flights.length,4);assert.ok(penalty.flights.every(f=>f.card===null));assert.match(penalty.message.title,/trật/);assert.equal(penalty.badges[0].text,'+6 lá');
 assert.match(getTableEffects(pending,{...resolved,effect:'challenge'},cards).message.title,/chuẩn/);
});
test('turn, winner, duplicate reconnect and skipped versions',()=>{
 assert.equal(getTableEffects({...prev,turn:'b'},next({turn:'a'}),cards).turn,true);
 assert.equal(getTableEffects(prev,next({status:'finished',winner:'c'}),cards).winner,'C');
 assert.equal(getTableEffects(null,next({}),cards),null);assert.equal(getTableEffects(prev,prev,cards),null);
 assert.equal(getTableEffects(prev,next({id:'other'}),cards),null);
 assert.equal(getTableEffects(prev,next({version:14,top:'s'}),cards).flights.length,0);
});
