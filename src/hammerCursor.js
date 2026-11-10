/** Produce a native 64x64 pixel hammer cursor from an uploaded image.
 *  Older saved icons may contain an opaque white/black square; remove only
 *  border-connected neutral background pixels so the hammer stays intact.
 *  Transparent images remain transparent. Never modify the stored original.
 */
export async function makeHammerCursor(url) {
 const img=await new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(new Error('Cannot load hammer icon'));
  image.src=url;
 });
 const max=512, factor=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
 const w=Math.max(1,Math.round(img.naturalWidth*factor));
 const h=Math.max(1,Math.round(img.naturalHeight*factor));
 const source=document.createElement('canvas');source.width=w;source.height=h;
 const sourceCtx=source.getContext('2d',{willReadFrequently:true});
 if(!sourceCtx)throw new Error('Canvas unavailable');
 sourceCtx.imageSmoothingEnabled=false;
 sourceCtx.drawImage(img,0,0,w,h);
 const data=sourceCtx.getImageData(0,0,w,h);
 const px=data.data;
 // Opaque light/dark corners identify a flat background. A genuinely
 // transparent PNG (including the supplied hammer) is left untouched.
 const corners=[0,w-1,(h-1)*w,(h*w)-1];
 const colorType=i=>{
  const k=i*4,r=px[k],g=px[k+1],b=px[k+2],a=px[k+3];
  if(a<230)return null;
  if(Math.min(r,g,b)>=225 && Math.max(r,g,b)-Math.min(r,g,b)<32)return 'light';
  if(Math.max(r,g,b)<=35)return 'dark';
  return null;
 };
 const types=corners.map(colorType);
 const type=['light','dark'].find(t=>types.filter(x=>x===t).length>=3);
 if(type){
  const visited=new Uint8Array(w*h),stack=[];
  for(let x=0;x<w;x++){stack.push(x,(h-1)*w+x);}
  for(let y=0;y<h;y++){stack.push(y*w,y*w+w-1);}
  while(stack.length){
   const id=stack.pop();
   if(visited[id])continue;
   visited[id]=1;
   const k=id*4,r=px[k],g=px[k+1],b=px[k+2];
   const matches=type==='light'
    ? Math.min(r,g,b)>=209 && Math.max(r,g,b)-Math.min(r,g,b)<40
    : Math.max(r,g,b)<=50;
   if(!matches)continue;
   px[k+3]=0;
   const x=id%w,y=(id/w)|0;
   if(x>0)stack.push(id-1);
   if(x<w-1)stack.push(id+1);
   if(y>0)stack.push(id-w);
   if(y<h-1)stack.push(id+w);
  }
  sourceCtx.putImageData(data,0,0);
 }
 let left=w,top=h,right=-1,bottom=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(px[(y*w+x)*4+3]>12){
   left=Math.min(left,x);top=Math.min(top,y);
   right=Math.max(right,x);bottom=Math.max(bottom,y);
  }
 }
 if(right<left)throw new Error('Empty hammer image');
 const out=document.createElement('canvas');out.width=64;out.height=64;
 const ctx=out.getContext('2d');
 if(!ctx)throw new Error('Canvas unavailable');
 ctx.imageSmoothingEnabled=false;
 const cropW=right-left+1,cropH=bottom-top+1;
 const scale=Math.min(60/cropW,60/cropH);
 const destW=Math.max(1,Math.round(cropW*scale));
 const destH=Math.max(1,Math.round(cropH*scale));
 ctx.clearRect(0,0,64,64);
 ctx.drawImage(source,left,top,cropW,cropH,Math.floor((64-destW)/2),Math.floor((64-destH)/2),destW,destH);
 return out.toDataURL('image/png');
}
