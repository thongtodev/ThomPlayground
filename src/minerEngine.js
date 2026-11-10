export const MINER_LEVELS = [
  [250,70],[340,72],[440,73],[540,74],[680,75],
  [800,76],[980,74],[1160,73],[1380,69],[1660,69],
].map(([target,time],i)=>({level:i+1,target,time}));
export const MINER_ITEMS = {
  slipper:{name:'Dép thường',value:50,speed:1,radius:23},
  pair:{name:'Dép đôi',value:90,speed:.8,radius:26},
  gold:{name:'Dép vàng',value:200,speed:.75,radius:22},
  mic:{name:'Micro',value:150,speed:.9,radius:20},
  rock:{name:'Đá nhỏ',value:0,speed:.6,radius:22},
  boulder:{name:'Đá lớn',value:0,speed:.35,radius:29},
  clock:{name:'Thêm 10 giây',value:0,speed:1,radius:20},
  magnet:{name:'Nam châm',value:0,speed:1,radius:20},
  boost:{name:'Dép đặc biệt · tăng lực 2 lượt',value:0,speed:1,radius:20},
};
export const MINER_ORIGIN = {x:360,y:95};
export const MINER_HOME = 34;
export const MINER_SWING = 1.18;
export const MINER_SWING_SPEED = .96;
export const MINER_CAST_SPEED = 550;
export const MINER_PULL_SPEED = 312;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const hookPoint=(angle,length)=>({x:360+Math.sin(angle)*length,y:95+Math.cos(angle)*length});
export const rayLimit=angle=>Math.min(500/Math.cos(angle),Math.abs(Math.sin(angle))<.001?Infinity:335/Math.abs(Math.sin(angle)));
export function seededRandom(seed) { let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;}; }

export function makeMinerBoard(level, seed=Date.now()) {
  const n=clamp(Math.floor(level),1,10),random=seededRandom(seed);
  const positions=[];
  // Clear radial lanes leave a deliberate line of sight; stones occupy some lanes.
  for(let ring=0;ring<4;ring++)for(let lane=0;lane<9;lane++){
    const angle=(lane-4)*.25+(random()-.5)*.015;
    const limit=rayLimit(angle)-38;
    const radius=[.42,.67,.81,.98][ring]*limit+Math.min(10,n);
    const p=hookPoint(angle,radius);
    positions.push({...p,ring,lane});
  }
  const kinds=[];
  const count=n<5?6+n*2:Math.min(21,10+n);
  const goldCount=n>=9?3:2;
  const micEnd=n>=9?12:8;
  for(let i=0;i<count;i++){
    kinds.push(n>=5&&i<goldCount?'gold':n>=7&&i<micEnd?'mic':n>=2&&i%3!==0?'pair':'slipper');
  }
  // Ensure enough score exists even if the player misses several valuables.
  while(kinds.reduce((s,k)=>s+MINER_ITEMS[k].value,0)<MINER_LEVELS[n-1].target*1.3&&kinds.length<22)kinds.push(n>=7?'mic':'pair');
  const rocks=n-1;
  for(let i=0;i<rocks;i++)kinds.push(n>=6&&i%3===1?'boulder':'rock');
  if(n>=4)kinds.push(['clock','magnet','boost'][Math.floor(random()*3)]);
  if(n>=7)kinds.push(['boost','clock','magnet'][n%3]);
  // Shuffle placement, but place valuable rare objects deeper in later levels.
  for(let i=positions.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]];}
  // Reserve the outer bands for catches. Spread stones across open and obstructed lanes.
  const deep=positions.filter(p=>p.ring>0);
  if(n>=8)deep.sort((a,b)=>b.ring-a.ring);
  const near=positions.filter(p=>p.ring===0);
  // Keep several direct routes: near stones occupy gaps between the treasure lanes.
  for(const p of near){
    const angle=Math.atan2(p.x-360,p.y-95)+(p.lane%2?.10:-.10);
    Object.assign(p,hookPoint(angle,Math.hypot(p.x-360,p.y-95)));
  }
  const board=kinds.map((kind,id)=>{
    const stone=kind==='rock'||kind==='boulder';
    const slot=stone&&((id-count)%2===0||!deep.length)?near.pop():deep.shift()||near.pop();
    return {id,kind,...slot,radius:MINER_ITEMS[kind].radius*(n<=3?.98:n>=8?.86:.94)};
  });
  // Separate artwork as well as collision circles, especially the larger early-level slippers.
  for(let pass=0;pass<30;pass++){
    for(let i=0;i<board.length;i++)for(let j=i+1;j<board.length;j++){
      const a=board[i],b=board[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
      const gap=a.radius+b.radius+7-d;
      if(gap>0){const shift=gap/2+.01;a.x-=dx/d*shift;a.y-=dy/d*shift;b.x+=dx/d*shift;b.y+=dy/d*shift;}
    }
    for(const item of board){item.y=clamp(item.y,190,595-item.radius);const span=Math.min(335-item.radius,Math.tan(1.12)*(item.y-95));item.x=clamp(item.x,360-span,360+span);}
  }
  return board;
}

/** Earliest intersection of a swept hook segment with any object. */
export function firstMinerCollision(from,to,items,padding=5) {
  const dx=to.x-from.x,dy=to.y-from.y,a=dx*dx+dy*dy;
  let best=null;
  for(const item of items){
    const x=from.x-item.x,y=from.y-item.y,r=item.radius+padding,c=x*x+y*y-r*r;
    let t;
    if(c<=0)t=0;
    else if(a){const b=2*(x*dx+y*dy),d=b*b-4*a*c;if(d<0)continue;t=(-b-Math.sqrt(d))/(2*a);}
    else continue;
    if(t>=0&&t<=1&&(!best||t<best.t))best={item,t};
  }
  return best;
}
export function createMinerRun(level,seed=Date.now()) {
  const cfg=MINER_LEVELS[clamp(level,1,10)-1];
  return {version:1,level:cfg.level,seed,phase:'playing',motion:'swing',angle:-.85,direction:1,length:MINER_HOME,remaining:cfg.time,score:0,target:cfg.target,items:makeMinerBoard(level,seed),carried:null,casts:0,rocks:0,gold:0,boosts:0,magnets:0,boosted:false,magnetic:false,notice:'Canh góc rồi thả móc!',serial:0};
}
export function castMiner(state) {
  if(state.phase!=='playing'||state.motion!=='swing')return state;
  return {...state,motion:'out',casts:state.casts+1,boosted:state.boosts>0,boosts:Math.max(0,state.boosts-1),magnetic:state.magnets>0,magnets:Math.max(0,state.magnets-1),notice:'Đang thả móc…'};
}
export const minerStars=seconds=>seconds>=35?3:seconds>=20?2:1;
function collect(s){
  const item=s.carried;
  if(item){
    const type=MINER_ITEMS[item.kind];s.score+=type.value;
    if(item.kind==='clock')s.remaining+=10;
    if(item.kind==='boost')s.boosts+=2;
    if(item.kind==='magnet')s.magnets+=1;
    if(['rock','boulder'].includes(item.kind))s.rocks++;
    if(item.kind==='gold')s.gold++;
    s.notice=type.value?`+${type.value} dép · ${type.name}`:type.name;
    s.serial++;
  }else s.notice='Móc trượt! Canh lại góc nhé.';
  s.carried=null;s.length=MINER_HOME;s.motion='swing';s.boosted=false;s.magnetic=false;
  if(s.score>=s.target){s.phase='won';s.stars=minerStars(s.remaining);}
}
export function advanceMiner(state,seconds) {
  if(state.phase!=='playing'||!Number.isFinite(seconds)||seconds<=0)return state;
  const s={...state};let left=seconds;
  while(left>0&&s.phase==='playing'){
    const dt=Math.min(left,1/120,s.remaining);left-=dt;s.remaining=Math.max(0,s.remaining-dt);
    if(s.remaining<=0){s.phase='lost';s.notice='Hết giờ!';break;}
    if(s.motion==='swing'){
      s.angle+=s.direction*MINER_SWING_SPEED*dt;
      if(s.angle>MINER_SWING||s.angle< -MINER_SWING){s.angle=clamp(s.angle,-MINER_SWING,MINER_SWING);s.direction*=-1;}
    }else if(s.motion==='out'){
      const old=s.length;s.length=Math.min(rayLimit(s.angle),old+MINER_CAST_SPEED*dt);
      const from=hookPoint(s.angle,old),to=hookPoint(s.angle,s.length);
      let hit=firstMinerCollision(from,to,s.items);
      if(!hit&&s.magnetic){
        const nearby=s.items.filter(i=>MINER_ITEMS[i.kind].value>0&&Math.hypot(i.x-to.x,i.y-to.y)<65).sort((a,b)=>Math.hypot(a.x-to.x,a.y-to.y)-Math.hypot(b.x-to.x,b.y-to.y));
        const candidate=nearby.find(item=>firstMinerCollision(to,item,s.items)?.item.id===item.id);
        if(candidate)hit={item:candidate,t:1};
      }
      if(hit){s.length=old+(s.length-old)*hit.t;s.carried=hit.item;s.items=s.items.filter(i=>i.id!==hit.item.id);s.motion='in';s.notice=`Đang kéo ${MINER_ITEMS[hit.item.kind].name.toLowerCase()}…`;}
      else if(s.length>=rayLimit(s.angle))s.motion='in';
    }else{
      const speed=MINER_PULL_SPEED*(s.carried?MINER_ITEMS[s.carried.kind].speed:1.4)*(s.boosted?1.6:1);
      s.length=Math.max(MINER_HOME,s.length-speed*dt);
      if(s.length===MINER_HOME)collect(s);
    }
  }
  return s;
}
export function validMinerSession(value) {
  return value?.version===1&&Number.isInteger(value.level)&&value.level>=1&&value.level<=10&&['playing','paused'].includes(value.phase)&&['swing','out','in'].includes(value.motion)&&Number.isFinite(value.remaining)&&value.remaining>0&&value.remaining<=120&&Number.isFinite(value.angle)&&Math.abs(value.angle)<=MINER_SWING&&Number.isFinite(value.length)&&value.length>=MINER_HOME&&value.length<=650&&Number.isFinite(value.score)&&Array.isArray(value.items)&&value.items.length<=36&&value.items.every(i=>MINER_ITEMS[i.kind]&&Number.isFinite(i.x)&&Number.isFinite(i.y)&&Number.isFinite(i.radius))&&(!value.carried||MINER_ITEMS[value.carried.kind]);
}
