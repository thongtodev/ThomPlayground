import {convertLegacyScore} from './onetRewards.js';
const duel=game=>game==='tic'||game==='connect4';
const timed=game=>game==='mines'||game==='reaction';
const puzzle=game=>game==='puzzle'||game==='jigsaw';
export const rankUnit=game=>game==='thom-diamond'?'điểm':timed(game)||duel(game)?'thử thách':'dép';
export const rankingRules={
 'thom-diamond':'Cộng điểm cao nhất của từng màn đã thắng và gửi kỷ lục.',
 miner:'Cộng kỷ lục dép của từng Level đã thắng.',
 onet:'Cộng kỷ lục dép của từng Level.',mole:'Cộng kỷ lục dép của từng thử thách.',
 puzzle:'Mỗi ảnh trong album: Dễ 100 dép, Khó 250 dép.',jigsaw:'Mỗi ảnh trong album: Dễ 100 dép, Khó 250 dép.',
 simon:'Dép từ số vòng tốt nhất: Dễ ×1, Trung bình ×2, Khó ×3.',
 tic:'Số thử thách thắng chú Thơm, sau đó xét chuỗi thắng dài nhất.',connect4:'Số thử thách thắng chú Thơm, sau đó xét chuỗi thắng dài nhất.',
 mines:'Số mức đã thắng, sau đó xét tổng thời gian kỷ lục ngắn nhất.',
 reaction:'Số chế độ hợp lệ, sau đó xét trung bình các kỷ lục nhanh nhất.'
};
function qualifies(game,row,album){
 const v=row.variant,d=row.details||{},n=Number(row.metric_value),kind=row.metric_kind;
 if(!Number.isFinite(n)||n<0)return false;
 if(puzzle(game)){
  const m=/^(.*)-(easy|hard)$/.exec(v);
  return kind==='steps'&&m&&(album.some(x=>x.id===m[1])||(game==='puzzle'&&!album.length&&m[1]==='default-thom'));
 }
 if(game==='onet')return kind==='score'&&/^level-([1-9]|1\d|20)$/.test(v)&&n>=2400;
 if(game==='tic')return kind==='wins'&&n>0&&/^\d+-(easy|medium|hard|impossible)$/.test(v)&&(d.mode||'ai')==='ai'&&d.winner!=='draw'&&(!d.playerMark||d.winner===d.playerMark);
 if(game==='connect4')return kind==='score'&&n>0&&/^ai-(easy|medium|hard)$/.test(v)&&(d.mode||'ai')==='ai';
 if(game==='thom-diamond')return kind==='score'&&d.won===true&&/^level-([1-9][0-9]?|100)$/.test(v);
 if(game==='miner')return kind==='score'&&d.won===true&&/^level-([1-9]|10)$/.test(v)&&n>0;
 if(game==='simon')return kind==='score'&&['easy','medium','hard'].includes(v);
 if(game==='mines')return kind==='time'&&d.won!==false&&['easy','medium','hard','expert'].includes(v);
 if(game==='reaction')return kind==='reaction'&&n>0&&Number(d.validRounds??1)>0;
 return game==='mole'&&kind==='score';
}
export function localRankings(game,rows,album,viewer){
 const players=new Map(),lower=timed(game)||puzzle(game);
 for(const row of rows){
  if(row.game_id!==game||!qualifies(game,row,album))continue;
  const id=row.player_id||'legacy:'+row.player_name.trim().toLowerCase();
  const p=players.get(id)||{id,breakdown:{},secondary:0};
  if(!p.latest||row.created_at>=p.latest){p.player_name=row.player_name;p.latest=row.created_at;}
  const v=row.variant;
  let n=Number(row.metric_value);
  if(game==='onet')n=Number(row.details?.scoreVersion)===2?Math.min(3400,n):convertLegacyScore(+v.slice(6),n);
  const old=p.breakdown[v];
  if(old==null||(lower?n<old:n>old))p.breakdown[v]=n;
  if(duel(game))p.secondary=Math.max(p.secondary,Number(row.details?.aiStreak)||0);
  players.set(id,p);
 }
 for(const p of players.values()){
  const items=Object.entries(p.breakdown);
  p.score=items.reduce((sum,[v,n])=>{
   if(puzzle(game))return sum+(v.endsWith('-hard')?250:100);
 if(game==='simon')return sum+n*({easy:1,medium:2,hard:3}[v]);
   return sum+(duel(game)||timed(game)?1:n);
  },0);
  if(timed(game))p.secondary=items.reduce((sum,[,n])=>sum+n,0)/(game==='reaction'?items.length:1);
 }
 return [...players.values()].sort((a,b)=>b.score-a.score||(duel(game)?b.secondary-a.secondary:a.secondary-b.secondary)||(a.id<b.id?-1:1))
  .map((row,i)=>({...row,position:i+1})).filter(r=>r.position<=9||r.id===viewer);
}
export function movement(previous,current){
 if(!previous)return 'Mới';
 const change=previous-current;
 return change===0?'Giữ hạng':change>0?'Tăng '+change+' hạng':'Giảm '+(-change)+' hạng';
}

export function recordAiOutcome(game,won,storage=globalThis.localStorage){
 const key='thom-ranked-ai-streak-v1-'+game;
 const streak=won?(Number(storage.getItem(key))||0)+1:0;
 storage.setItem(key,String(streak));
 return streak;
}
