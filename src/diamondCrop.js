/** Shared pixel-identical renderer for the Admin preview and the 7×7 game tiles.
 * Source images are immutable; only crop metadata is saved in game settings.
 */
export const DIAMOND_DEFAULT_CROP=Object.freeze({x:50,y:50,zoom:1,rotation:0,mode:'original'});
export function loadDiamondImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Không tải được ảnh gốc'));img.src=url;});}
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function normalizeDiamondCrop(crop){return {x:clamp(Number(crop?.x??50),0,100),y:clamp(Number(crop?.y??50),0,100),zoom:clamp(Number(crop?.zoom??1),1,4),rotation:([0,90,180,270].includes(Number(crop?.rotation))?Number(crop.rotation):0),mode:crop?.mode==='original'?'original':'crop'};}
export function paintDiamondTile(canvas,img,crop){
 if(!canvas||!img)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const w=canvas.width,h=canvas.height,raw=crop?normalizeDiamondCrop(crop):DIAMOND_DEFAULT_CROP;
 ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 if(raw.mode==='original'){
  const s=Math.min(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*s,dh=img.naturalHeight*s;
  ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);return;
 }
 const rotated=raw.rotation%180!==0;
 const iw=rotated?img.naturalHeight:img.naturalWidth,ih=rotated?img.naturalWidth:img.naturalHeight;
 const side=Math.min(iw,ih)/raw.zoom;
 const sx=(iw-side)*raw.x/100,sy=(ih-side)*raw.y/100;
 ctx.save();ctx.translate(w/2,h/2);ctx.scale(w/side,h/side);
 // Translate the rotated source image so the chosen crop rectangle fills the square.
 ctx.translate(-(sx+side/2),-(sy+side/2));
 ctx.translate(iw/2,ih/2);ctx.rotate(raw.rotation*Math.PI/180);
 ctx.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);
 ctx.restore();
}
export function diamondTileData(img,crop,size=256){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;paintDiamondTile(canvas,img,crop);return canvas.toDataURL('image/webp',.9);}
