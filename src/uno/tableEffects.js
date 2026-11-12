import {getDealEffects} from './dealEffects.js';
export function getTableEffects(prev,next,cards){
 const deal=getDealEffects(prev,next);if(deal)return deal;
 if(!prev||prev.id!==next.id||prev.status!=='playing'||next.version<=prev.version)return null;
 // The new top card is confirmed by the game state, even if network updates skipped a version.
 // Do not guess which player threw it unless consecutive snapshots are available.
 const fx={key:`${next.id}:${next.version}`,flights:[],badges:[],reverse:false,color:false,play:next.top!==prev.top,turn:false,winner:null,message:null};
 const name=id=>next.players.find(p=>p.id===id)?.name||'Chim cá';
 // A missing intermediate snapshot must not invent an actor or skipped player.
 const adjacent=next.version===prev.version+1;
 if(adjacent){
  if(next.top!==prev.top){
   const card=cards[next.top],actor=prev.turn;
   fx.flights.push({from:actor===next.me?`card:${next.top}`:`player:${actor}`,to:'discard',card:actor===next.me?next.top:null});
   if(card?.value==='skip'){
    const i=prev.order?.indexOf(actor),n=prev.order?.length;
    if(i>=0&&n){const target=prev.order[(i+(prev.direction===-1?-1:1)+n)%n];fx.badges.push({id:target,text:'⊘ Bỏ lượt'});}
   }
   if(card?.value==='reverse')fx.reverse=true;
   if(card?.color==='wild'){fx.color=true;fx.message={title:'Đổi màu nè!',detail:next.color};}
   if(card?.value==='wild_draw4')fx.badges.push({id:next.pending?.target,text:'+4 · Chờ xử lý'});
  }
  for(const player of next.players){
   const before=prev.players.find(p=>p.id===player.id);
   const count=before&&!player.left?player.count-before.count:0;
   if(count>0){fx.badges.push({id:player.id,text:`+${count} lá`});for(let i=0;i<Math.min(count,4);i++)fx.flights.push({from:'deck',to:player.id===next.me?'hand':`player:${player.id}`,card:null,delay:i*65});}
  }
  if(prev.pending&&!next.pending){
   if(next.effect==='challenge')fx.message={title:'Bắt bài chuẩn luôn!',detail:`${name(prev.pending.actor)} nhận phạt +4.`};
   else if(/Thách thức sai/i.test(next.notice||''))fx.message={title:'Úi, đoán trật rồi!',detail:`${name(prev.pending.target)} nhận phạt +6.`};
  }
 }
 fx.turn=next.status==='playing'&&!next.pending&&next.turn===next.me&&(prev.turn!==next.me||!!prev.pending);
 if(prev.status!=='finished'&&next.status==='finished'&&next.winner)fx.winner=name(next.winner);
 return fx;
}
