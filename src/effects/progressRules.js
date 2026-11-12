export function countdownCue(previous,current){
 if(!Number.isFinite(previous)||!Number.isFinite(current)||current>=previous||current<=0)return null;
 if(previous>10&&current<=10)return 'warning';
 if(current<=3&&previous>current)return 'tick';
 return null;
}
export function tileOrigins(before,after){
 const used=new Set(),origins=after.map((v,i)=>v!=null&&before[i]===v?(used.add(i),i):null);
 return origins.map((source,i)=>{
  if(source!=null||after[i]==null)return source;
  const j=before.findIndex((v,k)=>v===after[i]&&!used.has(k));
  if(j<0)return null;used.add(j);return j;
 });
}
export function rankGain(before,after){return Number.isFinite(before)&&before>0&&Number.isFinite(after)&&after>0?Math.max(0,before-after):0;}
const read=(storage,key)=>{try{return JSON.parse(storage.getItem(key))||{};}catch{return {};}};
export function markNews(kind,game,ids,storage=globalThis.localStorage){
 if(!ids?.length)return;const key='thom-'+kind+'-news-v1',data=read(storage,key);
 ids.forEach(id=>{data[game+':'+id]=true;});try{storage.setItem(key,JSON.stringify(data));}catch{}
}
export function hasNews(kind,game,id,storage=globalThis.localStorage){return !!read(storage,'thom-'+kind+'-news-v1')[game+':'+id];}
export function clearNews(kind,game,id,storage=globalThis.localStorage){
 const key='thom-'+kind+'-news-v1',data=read(storage,key);delete data[game+':'+id];try{storage.setItem(key,JSON.stringify(data));}catch{}
}
