// Only animate a newly resolved UNO window, never a replayed room snapshot.
export function getUnoEffect(previous,next){
 if(!previous||previous.id!==next.id||previous.status!=='playing'||next.status!=='playing'||next.version<=previous.version||!previous.unoTarget||next.unoTarget)return null;
 const kind=next.effect;
 if(kind!=='uno'&&kind!=='catch')return null;
 const player=next.players.find(p=>p.id===previous.unoTarget&&!p.left);
 if(!player||player.count!==(kind==='uno'?1:3))return null;
 return {kind,key:`${next.id}:${next.version}`,name:player.id===next.me?'Bạn':player.name};
}
