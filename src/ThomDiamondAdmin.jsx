import React,{useEffect,useMemo,useRef,useState} from 'react';
import Icon from './Icon';
import manifest from './data/thomDiamondManifest.json';
import {THOM_DIAMOND_WORLDS} from './thomDiamondEngine';
import {DIAMOND_DEFAULT_CROP,normalizeDiamondCrop,loadDiamondImage,paintDiamondTile,diamondTileData} from './diamondCrop';

const sourceUrl=item=>`/thom-kim-cuong/${item.original_file}`;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export default function ThomDiamondAdmin({value={},busy=false,onSave}){
 const [selected,setSelected]=useState(manifest[0]?.tile_id||'tkc_01');
 const [worldOpen,setWorldOpen]=useState(1);
 const [draft,setDraft]=useState(null),[working,setWorking]=useState(false),[error,setError]=useState('');
 const [gallery,setGallery]=useState({});
 const [source,setSource]=useState(null);
 const editor=useRef(null),drag=useRef(null);
 const item=useMemo(()=>manifest.find(x=>x.tile_id===selected)||manifest[0],[selected]);
 const saved=value?.[selected];
 const current=draft||normalizeDiamondCrop(saved||DIAMOND_DEFAULT_CROP);
 const dirty=draft!==null;
 // Reopen an image directly in its SAVED crop, not a default/uncropped editing state.
 useEffect(()=>{setDraft(null);setError('');},[selected]);
 useEffect(()=>{let alive=true;setSource(null);if(item)loadDiamondImage(sourceUrl(item)).then(im=>{if(alive)setSource(im);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[item]);
 useEffect(()=>{if(source&&editor.current)paintDiamondTile(editor.current,source,current);},[source,current]);
 // Gallery previews use the same renderer as the actual game tiles. Saved crops remain visible after reopening.
 useEffect(()=>{let alive=true;const cropped=manifest.filter(m=>value?.[m.tile_id]);
  Promise.all(cropped.map(async m=>{try{const im=await loadDiamondImage(sourceUrl(m));return [m.tile_id,diamondTileData(im,value[m.tile_id],128)];}catch{return [m.tile_id,null];}})).then(items=>{if(alive)setGallery(Object.fromEntries(items));});
  return()=>{alive=false;};
 },[value]);
 const edit=(key,val)=>setDraft(prev=>({...normalizeDiamondCrop(prev||saved||DIAMOND_DEFAULT_CROP),mode:'crop',[key]:val}));
 const select=id=>{setSelected(id);setDraft(null);editor.current?.scrollIntoView?.({behavior:'smooth',block:'nearest'});};
 const save=async()=>{if(!item||busy||working||!dirty)return;setWorking(true);setError('');try{
  const crop={...normalizeDiamondCrop(draft),assetId:selected,sourceFile:item.original_file,sourceWidth:item.original_width,sourceHeight:item.original_height,updatedAt:new Date().toISOString(),version:2};
  await onSave({...value,[selected]:crop});setDraft(null);
 }catch(e){setError(e.message||'Không thể lưu crop');}finally{setWorking(false);}};
 const reset=async()=>{if(busy||working)return;setWorking(true);setError('');try{const next={...value};delete next[selected];await onSave(next);setDraft(null);}catch(e){setError(e.message||'Không thể khôi phục ảnh gốc');}finally{setWorking(false);}};
 const down=e=>{if(!source||busy||working)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,crop:normalizeDiamondCrop(current)};};
 const move=e=>{if(!drag.current||!source)return;const rect=e.currentTarget.getBoundingClientRect(),old=drag.current.crop;
  const rotated=old.rotation%180!==0,iw=rotated?source.naturalHeight:source.naturalWidth,ih=rotated?source.naturalWidth:source.naturalHeight;
  const side=Math.min(iw,ih)/old.zoom,travelX=iw-side,travelY=ih-side;
  const x=travelX>0?clamp(old.x-(e.clientX-drag.current.x)/rect.width*side/travelX*100,0,100):50;
  const y=travelY>0?clamp(old.y-(e.clientY-drag.current.y)/rect.height*side/travelY*100,0,100):50;
  setDraft({...old,mode:'crop',x,y});
 };
 const up=()=>{drag.current=null;};
 if(!item)return <p>Chưa tìm thấy bộ ảnh Thơm Lấp Lánh.</p>;
 return <section className="admin-feature-section tkc-admin">
  <div className="tkc-admin-heading"><div><h2>24 diện mạo chú Thơm</h2><p>Chim cá chọn ảnh để xem đúng khung đang dùng trong game, rồi kéo, zoom và lưu như các trò khác. Ảnh gốc luôn được giữ nguyên.</p></div><span className="tkc-admin-count">24 ẢNH GỐC</span></div>
  <div className="tkc-admin-worlds">{THOM_DIAMOND_WORLDS.map(world=><section className="tkc-admin-world" key={world.world}>
   <button type="button" className="tkc-admin-world-toggle" aria-expanded={worldOpen===world.world} onClick={()=>setWorldOpen(old=>old===world.world?0:world.world)}><b>Chặng {world.world} · {world.name}</b><span>{world.tiles.length} ảnh · {world.assetTheme} {worldOpen===world.world?'⌃':'⌄'}</span></button>
   {worldOpen===world.world&&<div className="tkc-admin-tiles">{world.tiles.map(id=><button type="button" key={id} className={`tkc-admin-tile ${selected===id?'selected':''} ${value?.[id]?'has-crop':''}`} onClick={()=>select(id)}><img src={gallery[id]||`/thom-kim-cuong/tiles/${id}.webp`} alt={`Ảnh đang hiển thị ${id}`}/><b>{id}</b><small>{value?.[id]?'Đang dùng crop':'Toàn ảnh gốc'}</small></button>)}</div>}
  </section>)}</div>
  <div className="tkc-admin-editor">
   <div className="tkc-admin-editor-copy"><span className="eyebrow">ẢNH ĐANG SỬ DỤNG</span><h3>{item.tile_id}</h3><p>Nhấp lại vào ảnh bất kỳ để xem đúng vùng đã lưu. Bản xem trước bên phải cũng là vùng hiển thị trong từng ô 7×7.</p><div className="tkc-admin-original"><img src={sourceUrl(item)} alt={`Ảnh gốc ${item.tile_id}`}/><span>ẢNH GỐC · KHÔNG BỊ THAY ĐỔI</span></div></div>
   <div className="tkc-admin-editor-work"><div className="tkc-admin-preview-label">Khung vuông đang hiển thị trong game {dirty?'· đang chỉnh, chưa lưu':saved?'· crop đã lưu':'· toàn ảnh gốc'}</div>
    <div className="tkc-admin-preview-stage"><canvas ref={editor} width="512" height="512" className="tkc-admin-preview-canvas" aria-label="Kéo trực tiếp để chỉnh vùng ảnh đang hiển thị" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}/></div>
    <p className="tkc-admin-crop-hint">Kéo ảnh ngay trên khung · Phóng to để chọn khuôn mặt · Mở lại vẫn thấy crop đã lưu.</p>
    <div className="tkc-admin-controls"><label>Phóng to <b>{current.zoom.toFixed(1)}×</b><input type="range" min="1" max="4" step="0.1" disabled={busy||working} value={current.zoom} onChange={e=>edit('zoom',Number(e.target.value))}/></label><label>Căn ngang <b>{Math.round(current.x)}%</b><input type="range" min="0" max="100" disabled={busy||working} value={current.x} onChange={e=>edit('x',Number(e.target.value))}/></label><label>Căn dọc <b>{Math.round(current.y)}%</b><input type="range" min="0" max="100" disabled={busy||working} value={current.y} onChange={e=>edit('y',Number(e.target.value))}/></label><label>Xoay ảnh <b>{current.rotation}°</b><select disabled={busy||working} value={current.rotation} onChange={e=>edit('rotation',Number(e.target.value))}><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label></div>
    <div className="tkc-admin-actions"><button type="button" className="primary-button" disabled={!dirty||busy||working} onClick={save}><Icon name="check" size={16}/>{working?'Đang lưu…':'Lưu cách hiển thị'}</button><button type="button" className="secondary-button" disabled={!dirty||working} onClick={()=>setDraft(null)}>Hủy thay đổi</button><button type="button" className="secondary-button tkc-admin-reset" disabled={busy||working||(!saved&&!dirty)} onClick={reset}><Icon name="rotate" size={15}/> Đặt lại ảnh gốc</button></div>
    {error&&<p className="admin-error" role="alert">{error}</p>}
    <p className="tkc-admin-note"><Icon name="shield" size={14}/> Chỉ lưu cấu hình crop; không ghi đè ảnh gốc. Khung crop vuông 1:1 đúng với ô Match-3.</p>
   </div>
  </div>
 </section>;
}
