export function getPlayableDraw(previous,next){
 if(!previous||previous.id!==next.id||next.version<=previous.version||previous.status!=='playing'||next.status!=='playing'||next.turn!==next.me||!next.drew||next.pending)return null;
 const added=next.hand.filter(id=>!previous.hand.includes(id));
 return added.length===1&&next.legal.includes(added[0])?added[0]:null;
}
