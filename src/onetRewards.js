import {levelConfig} from './onetEngine.js';

export const getOnetUnlockCount=(level,albumSize)=>albumSize>0?(level<=10?1:2):0;

// Independent draws with replacement, including within a two-photo reward.
export function drawOnetPhotos(album,collection,level,rng=Math.random){
 const seen=new Set(collection);
 return Array.from({length:getOnetUnlockCount(level,album.length)},()=>{
  const photo=album[Math.floor(rng()*album.length)];
  const isNew=!seen.has(photo.id);
  seen.add(photo.id);
  return {...photo,isNew};
 });
}
export function onetScore(level,seconds){
 const time=levelConfig(level).time;
 return 2400+Math.round(1000*Math.min(time,Math.max(0,seconds))/time);
}
export const convertLegacyScore=(level,score)=>onetScore(level,(score-2400)/10);
export const totalOnetScore=best=>Object.values(best).reduce((sum,value)=>sum+value,0);
export function onetProgress(raw={}){
 const best={};
 for(const [level,value] of Object.entries(raw.best||{})){
  if(!/^(?:[1-9]|1\d|20)$/.test(level)||!Number.isFinite(value)||value<2400)continue;
  best[level]=raw.scoreVersion===2?value:convertLegacyScore(+level,value);
 }
 return {scoreVersion:2,best,collection:[...new Set(Array.isArray(raw.collection)?raw.collection:[])],
  unlocked:Math.min(20,Math.max(Number(raw.unlocked)||1,...Object.keys(best).map(level=>Number(level)+1)))};
}

export function migrateOnetScores(storage=globalThis.localStorage){
 const read=(key,fallback)=>{try{return JSON.parse(storage.getItem(key))??fallback;}catch{return fallback;}};
 const progressKey='thom-onet-progress-v1';
 const saved=read(progressKey,{});
 const progress=onetProgress(saved);
 if(saved.scoreVersion===2)return progress;
 // Convert once, marking each row individually so interrupted writes are retryable.
 for(const key of ['thom-personal-history-v1','thom-personal-records-v1','thom-local-leaderboards-v1']){
  const rows=read(key,null);
  if(!rows)continue;
  let changed=false;
  for(const row of Object.values(rows)){
   if((row.gameId||row.game_id)!=='onet'||row.details?.scoreVersion===2||row.eligible===false)continue;
   const level=Number(/^level-(\d+)$/.exec(row.variant)?.[1]);
   if(!(level>=1&&level<=20))continue;
   const field=row.game_id?'metric_value':'metricValue';
   if(row[field]<2400)continue;
   const score=convertLegacyScore(level,row[field]);
   row[field]=score;
   row[row.game_id?'metric_label':'metricLabel']=score.toLocaleString('vi-VN')+' dép';
   row.details={...row.details,score,scoreVersion:2};
   if(row.summary)row.summary='Level '+level+' · '+score.toLocaleString('vi-VN')+' dép';
   if(!row.game_id)progress.best[level]=Math.max(progress.best[level]||0,score);
   changed=true;
  }
  if(changed)storage.setItem(key,JSON.stringify(rows));
 }
 progress.unlocked=onetProgress(progress).unlocked;
 storage.setItem(progressKey,JSON.stringify(progress));
 return progress;
}
