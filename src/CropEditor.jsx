import React,{useEffect,useRef,useState} from 'react';
import Icon from './Icon';
import {saveAssignment} from './assetStore';
import {drawCrop} from './imageTransforms';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Không đọc được ảnh này để crop. Hãy tải ảnh lên thư viện rồi thử lại.'));im.src=src;});}
export default function CropEditor({image,slot,busy,onCancel,onSaved,initialTransform,onSaveTransform,albumMode=false}){
 const canvas=useRef(null),imgRef=useRef(null),drag=useRef(null);
 const isCutout=albumMode||slot==='mole'||slot==='mole-bomb'||slot.startsWith('icon-');
 const [x,setX]=useState(initialTransform?.x??50),[y,setY]=useState(initialTransform?.y??50),[zoom,setZoom]=useState(initialTransform?.zoom??1),[border,setBorder]=useState(initialTransform?.border??(isCutout?0:8)),[color,setColor]=useState(initialTransform?.color??'#f4d277');
 const [removeBg,setRemoveBg]=useState(initialTransform?.removeBg??false),[tolerance,setTolerance]=useState(initialTransform?.tolerance??45),[keyColor,setKeyColor]=useState(initialTransform?.keyColor??[255,255,255]),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 useEffect(()=>{let alive=true;setLoaded(false);setError('');loadImage(image.url).then(im=>{if(alive){imgRef.current=im;setLoaded(true);}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[image.url]);
 useEffect(()=>{if(loaded)drawCrop(canvas.current,imgRef.current,{x,y,zoom,border,color,removeBg,tolerance,keyColor});},[loaded,x,y,zoom,border,color,removeBg,tolerance,keyColor]);
 const handleDown=e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={startX:e.clientX,startY:e.clientY,x,y};};
 const handleMove=e=>{if(!drag.current||!imgRef.current)return;const r=e.currentTarget.getBoundingClientRect(),im=imgRef.current,side=Math.min(im.naturalWidth,im.naturalHeight)/zoom;
 const travelX=im.naturalWidth-side,travelY=im.naturalHeight-side;
 if(travelX>0)setX(clamp(drag.current.x-(e.clientX-drag.current.startX)/r.width*side/travelX*100,0,100));
 if(travelY>0)setY(clamp(drag.current.y-(e.clientY-drag.current.startY)/r.height*side/travelY*100,0,100));};
 const pickColor=e=>{if(!loaded)return;const r=canvas.current.getBoundingClientRect(),cx=clamp(Math.floor((e.clientX-r.left)/r.width*canvas.current.width),0,canvas.current.width-1),cy=clamp(Math.floor((e.clientY-r.top)/r.height*canvas.current.height),0,canvas.current.height-1);const d=canvas.current.getContext('2d').getImageData(cx,cy,1,1).data;setKeyColor([d[0],d[1],d[2]]);};
 async function save(){if(!loaded||saving||busy)return;setSaving(true);setError('');try{
  const transform={mode:'crop',x,y,zoom,border,color,removeBg,tolerance,keyColor};
  if(onSaveTransform)await onSaveTransform(transform);else await saveAssignment(slot,image.id,transform);
  await onSaved();
 }catch(e){setError(e.message);}finally{setSaving(false);}}
 return <section className="crop-editor" aria-label="Chỉnh khung ảnh vuông">
  <div className="crop-heading"><div><h3><Icon name="scissors" size={18}/> Chọn vùng hiển thị · {image.name}</h3><p>Kéo ảnh trong khung để chọn phần muốn hiển thị. Không tạo thêm ảnh trong thư viện. Khung crop chỉ áp dụng cho vị trí này, ảnh gốc không bị thay đổi.</p></div><button className="admin-logout" onClick={onCancel}>Đóng</button></div>
  <div className="crop-layout"><div className="crop-canvas-wrap"><canvas ref={canvas} width={512} height={512} aria-label="Xem trước vùng crop" onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null} onClick={removeBg?pickColor:undefined}/><small>{removeBg?'Chạm vào màu nền để chọn màu cần xóa':'Kéo trực tiếp để canh khuôn mặt / vật thể'}</small></div>
   <div className="crop-controls">
    <label>Phóng to <b>{zoom.toFixed(1)}×</b><input type="range" min="1" max="3" step="0.1" value={zoom} onChange={e=>setZoom(+e.target.value)}/></label>
    <label>Canh ngang <b>{x}%</b><input type="range" min="0" max="100" value={x} onChange={e=>setX(+e.target.value)}/></label>
    <label>Canh dọc <b>{y}%</b><input type="range" min="0" max="100" value={y} onChange={e=>setY(+e.target.value)}/></label>
    <label>Độ dày viền <b>{border}px</b><input type="range" min="0" max="24" step="2" value={border} onChange={e=>setBorder(+e.target.value)}/></label>
    <label className="crop-color">Màu viền <input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>
    <label className="crop-checkbox"><input type="checkbox" checked={removeBg} onChange={e=>setRemoveBg(e.target.checked)}/> Xóa nền đơn sắc (tùy chọn)</label>
    {removeBg&&<><p className="crop-note">Chỉ xóa vùng màu liên thông với mép ảnh. Nền phức tạp nên dùng PNG đã tách nền để có kết quả đẹp nhất.</p><label>Độ nhạy xóa nền <b>{tolerance}</b><input type="range" min="5" max="160" value={tolerance} onChange={e=>setTolerance(+e.target.value)}/></label><div className="crop-picked-color">Màu đã chọn <span style={{background:`rgb(${keyColor.join(',')})`}}/></div></>}
    <button className="secondary-button" onClick={()=>{setX(50);setY(50);setZoom(1);setBorder(isCutout?0:8);setRemoveBg(false);}}><Icon name="rotate" size={16}/> Đặt lại khung</button>
   </div></div>
   {error&&<p className="admin-error" role="alert">{error}</p>}
   <div className="crop-actions"><button className="primary-button" disabled={!loaded||busy||saving} onClick={save}>{saving?'Đang xử lý…':albumMode?'Áp dụng crop vào bộ ảnh':'Lưu cách hiển thị cho vị trí này'}</button><button className="secondary-button" onClick={onCancel}>Hủy</button></div>
 </section>;
}
