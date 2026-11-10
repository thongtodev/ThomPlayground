/** Album entries are kept in each game's existing JSONB setting. Older string IDs are migrated in memory. */
export function normalizeAlbum(value,limit=Infinity){
 if(!Array.isArray(value))return [];
 const seen=new Set(),out=[];
 for(const item of value){
  const id=typeof item==='string'?item:item?.id;
  if(typeof id!=='string'||!id||seen.has(id))continue;
  seen.add(id);
  const transform=item&&typeof item==='object'&&item.transform?.mode==='crop'?item.transform:null;
  out.push({id,transform});if(out.length>=limit)break;
 }
 return out;
}
export const findAlbumEntry=(album,id)=>album.find(x=>x.id===id);
export function resolveAlbum(album,gallery){
 const byId=new Map(gallery.map(im=>[im.id,im]));
 return album.map(entry=>{const image=byId.get(entry.id);return image?{...image,transform:entry.transform}:null;}).filter(Boolean);
}
