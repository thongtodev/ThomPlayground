import {createMinerRun,advanceMiner,castMiner,firstMinerCollision,hookPoint,MINER_HOME,MINER_SWING,MINER_SWING_SPEED,MINER_CAST_SPEED,MINER_PULL_SPEED,MINER_ITEMS} from '../src/minerEngine.js';
export function solve(level,seed){let s=createMinerRun(level,seed);let pulls=0;
while(s.phase==='playing'&&pulls++<40){
 const picks=s.items.map(item=>{
 const angle=Math.atan2(item.x-360,item.y-95),distance=Math.hypot(item.x-360,item.y-95);
 const hit=firstMinerCollision(hookPoint(angle,MINER_HOME),item,s.items);
 if(hit?.item.id!==item.id)return null;
 const wait=(s.direction>0?(angle>=s.angle?angle-s.angle:2*MINER_SWING-s.angle-angle):(angle<=s.angle?s.angle-angle:s.angle+angle+2*MINER_SWING))/MINER_SWING_SPEED;
 const type=MINER_ITEMS[item.kind],cost=wait+distance/MINER_CAST_SPEED+distance/(MINER_PULL_SPEED*type.speed);
 const value=type.value||(item.kind==='clock'?130:item.kind==='boost'?110:item.kind==='magnet'?50:1);
 return {angle,wait,utility:value/(cost+.6)};
 }).filter(Boolean).sort((a,b)=>b.utility-a.utility);
 if(!picks.length)break;
 s=advanceMiner(s,picks[0].wait);s=castMiner(s);
 let frames=0;while(s.phase==='playing'&&s.motion!=='swing'&&frames++<1500)s=advanceMiner(s,1/60);
}
return s;}
