/** A completed level grants one permanent photo ID; replays cannot grant extras. */
export function reconcileMinerRewards(progress,album){
 const rewards={...(progress.rewards||{})};
 const used=new Set(Object.values(rewards));
 for(let level=1;level<=10;level++){
  if(!progress.best?.[level]||rewards[level])continue;
  const photo=album.slice(0,10).find(im=>!used.has(im.id));
  if(photo){rewards[level]=photo.id;used.add(photo.id);}
 }
 return {...progress,rewards};
}
