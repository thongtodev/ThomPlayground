/** Render a slot-specific view in memory. The library source is never duplicated. */
export function clearBackground(data,width,height,rgb,tolerance){
 const px=data.data,seen=new Uint8Array(width*height),stack=[];
 for(let x=0;x<width;x++)stack.push(x,(height-1)*width+x);
 for(let y=0;y<height;y++)stack.push(y*width,y*width+width-1);
 const distance=i=>Math.sqrt((px[i]-rgb[0])**2+(px[i+1]-rgb[1])**2+(px[i+2]-rgb[2])**2);
 while(stack.length){const id=stack.pop();if(seen[id])continue;seen[id]=1;const i=id*4;
  if(px[i+3]<8||distance(i)>tolerance)continue;
  px[i+3]=0;const x=id%width,y=Math.floor(id/width);
  if(x>0)stack.push(id-1);if(x<width-1)stack.push(id+1);
  if(y>0)stack.push(id-width);if(y<height-1)stack.push(id+width);
 }
 return data;
}
export function drawCrop(canvas,img,{x=50,y=50,zoom=1,border=0,color='#f4d277',removeBg=false,tolerance=45,keyColor=[255,255,255]}={}){
 if(!canvas||!img)return;
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),size=canvas.width;
 ctx.clearRect(0,0,size,size);
 const side=Math.min(img.naturalWidth,img.naturalHeight)/Math.max(1,zoom);
 const sx=(img.naturalWidth-side)*x/100,sy=(img.naturalHeight-side)*y/100;
 ctx.drawImage(img,sx,sy,side,side,0,0,size,size);
 if(removeBg){const d=ctx.getImageData(0,0,size,size);ctx.putImageData(clearBackground(d,size,size,keyColor,tolerance),0,0);}
 if(border>0){ctx.strokeStyle=color;ctx.lineWidth=border*size/512;ctx.strokeRect(ctx.lineWidth/2,ctx.lineWidth/2,size-ctx.lineWidth,size-ctx.lineWidth);}
}
export async function renderSlotImage(url,transform,size=512){
 if(!transform||transform.mode!=='crop')return url;
 const img=await new Promise((resolve,reject)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Không đọc được ảnh để hiển thị.'));i.src=url;});
 const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
 drawCrop(canvas,img,transform);
 return canvas.toDataURL('image/webp',.92);
}
