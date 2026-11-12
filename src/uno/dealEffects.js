// Only an observed room start can deal. Reconnecting to an ongoing hand must not replay it.
export function getDealEffects(prev,next){
 if(!prev||prev.id!==next.id||!['lobby','waiting','finished'].includes(prev.status)||next.status!=='playing'||next.version<=prev.version)return null;
 const players=(next.order||[]).map(id=>next.players.find(p=>p.id===id)).filter(p=>p&&!p.left);
 const flights=[];
 for(let round=0;round<7;round++)for(const p of players){if(round<Math.min(p.count,7))flights.push({from:'deck',to:p.id===next.me?'hand':`player:${p.id}`,card:null,delay:flights.length*35});}
 return {key:`${next.id}:${next.version}:deal`,deal:true,flights,badges:[],reverse:false,color:false,turn:next.turn===next.me,winner:null,message:null};
}
