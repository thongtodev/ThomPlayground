import React,{useEffect,useMemo,useState} from 'react';
import Icon from './Icon';
import {DEFAULT_IMAGE} from './assetStore';
import {renderSlotImage} from './imageTransforms';
import {groupGalleryByCategory} from './galleryCategories';
import CropEditor from './CropEditor';
import CropModal from './CropModal';

export function AlbumThumbnail({image,transform,alt}){
 const [url,setUrl]=useState(image?.url||DEFAULT_IMAGE);
 const transformKey=JSON.stringify(transform||null);
 useEffect(()=>{
  let active=true;
  if(!image){setUrl(DEFAULT_IMAGE);return()=>{active=false;};}
  setUrl(image.url);
  if(transform?.mode==='crop')renderSlotImage(image.url,transform,256).then(result=>{if(active)setUrl(result);}).catch(()=>{});
  return()=>{active=false;};
 },[image?.url,transformKey]);
 return <img src={url} alt={alt||''} loading="lazy" draggable="false"/>;
}

/** Each game has its own ordered album and independent crop per photo. */
export default function GameAlbumEditor({game,value,gallery,onChange,onSave,busy}){
 const isOnet=game==='onet',isJigsaw=game==='jigsaw',isMiner=game==='miner',max=isMiner?10:Infinity;
 const [editing,setEditing]=useState(null),[cropNotice,setCropNotice]=useState('');
 const images=useMemo(()=>new Map(gallery.map(im=>[im.id,im])),[gallery]);
 const available=gallery.filter(im=>!im.builtIn);
 const availableGroups=groupGalleryByCategory(available);
 const addOrRemove=(id,checked)=>onChange(checked?[...value,{id,transform:null}].slice(0,max):value.filter(e=>e.id!==id));
 const changeCrop=(id,transform)=>{onChange(value.map(e=>e.id===id?{...e,transform}:e));setEditing(null);setCropNotice(transform?'Đã áp dụng crop trong bản xem trước. Nhấn “Lưu bộ ảnh” để lưu lên website.':'Đã trở về ảnh gốc. Nhấn “Lưu bộ ảnh” để lưu thay đổi.');};
 const editingEntry=value.find(e=>e.id===editing);
 const title=isMiner?'Bộ sưu tập Đào Dép Đi!':isOnet?'Bộ ảnh Nối Thơm Đi!':isJigsaw?'Album Mảnh Ghép Nhà Thơm':'Bộ ảnh Ghép Thơm Đi!';
 return <section className="admin-feature-section game-album-editor">
  <div className="admin-feature-heading"><div><h2>{title}</h2><p>{isMiner?'Chọn tối đa 10 hình theo thứ tự. Mỗi màn thắng lần đầu mở một hình mới. Chơi lại không nhận thêm; hình đã mở được lưu theo ID.':isOnet?'Thêm bao nhiêu ảnh tùy ý vào bộ sưu tập. Mỗi ván chọn ngẫu nhiên tối đa 24 ảnh theo độ khó; ảnh chưa mở khóa sẽ được giữ trong bộ sưu tập.':isJigsaw?'Mỗi ảnh là một Level. Hoàn thành Dễ (3×3) để mở Khó (5×5) của cùng Level.':'Mỗi ảnh được thêm vào bộ sẽ tạo thành một Level riêng. Mỗi Level có hai cấp độ: Dễ (3×3) và Khó (5×5); người chơi hoàn thành Dễ để mở khóa Khó. Ảnh sẽ được đưa vào Collection sau khi hoàn thành.'}</p></div><strong>{value.length}{isJigsaw?' ảnh':' ảnh'}</strong></div>
  <h3 className="game-album-subtitle">{isOnet?'Xem trước bộ ảnh':'Danh sách Level theo thứ tự'}</h3>
  <div className={`game-album-preview ${isOnet?'game-album-preview-onet':''}`} aria-label="Xem trước bộ ảnh và vùng crop">
   {Array.from({length:isOnet?Math.max(24,value.length):value.length},(_,index)=>{
    const entry=value[index],image=entry&&images.get(entry.id);
    return <div className={`game-album-preview-item ${image?'has-photo':'is-default'}`} key={entry?.id||`empty-${index}`}>
     <div className="game-album-tile">{image?<AlbumThumbnail image={image} transform={entry.transform} alt={`${isOnet?'Ảnh':'Level'} ${index+1}`}/>:<><img src={DEFAULT_IMAGE} alt=""/><span className="game-album-fallback-number">{index+1}</span></>}</div>
     <small>{isOnet?String(index+1).padStart(2,'0'):image?`Level ${String(index+1).padStart(2,'0')}`:'Chưa chọn ảnh'}</small>
     {image&&<button type="button" className="game-album-crop-button" disabled={busy} onClick={()=>{setCropNotice('');setEditing(entry.id);}}><Icon name="scissors" size={15}/> {entry.transform?'Sửa crop':'Crop ảnh'}</button>}
    </div>;
   })}
  </div>
  <p className="game-album-tip">{isMiner?'Mỗi ảnh tương ứng một phần thưởng. Nếu thêm ảnh sau, các màn đã thắng sẽ được nhận bù khi người chơi mở game. Bỏ một ảnh khỏi album sẽ ẩn ảnh đó, không cấp lại phần thưởng cho màn đã nhận.':isOnet?'Mỗi Level lấy ngẫu nhiên số ảnh theo độ khó (tối đa 24 ảnh khác nhau). Khi thắng, người chơi bốc 1 ảnh ở Level 1–10, 2 ảnh từ Level 11. Mỗi lượt có thể trùng ảnh đã có.':isJigsaw?'Thứ tự ảnh trong album là thứ tự Level của người chơi. Crop chỉ áp dụng cho ảnh trong game, không tạo bản sao.':'Thứ tự ảnh trong danh sách chính là thứ tự Level của người chơi. Khung xem trước thể hiện vùng ảnh dùng trong bàn ghép.'}</p>
  {cropNotice&&<p className="game-album-crop-notice" role="status"><Icon name="check" size={14}/> {cropNotice}</p>}
  <h3 className="game-album-subtitle">Chọn ảnh từ thư viện</h3>
  <div className="puzzle-album-groups">{availableGroups.map(group=>{
   const selectedCount=group.images.filter(im=>value.some(entry=>entry.id===im.id)).length;
   return <details className="puzzle-album-group" key={group.id}>
    <summary><span>{group.label}</span><span className="puzzle-album-group-count">{selectedCount}/{group.images.length} ảnh đã chọn</span></summary>
    <div className="puzzle-album-group-content"><div className="puzzle-album-grid">{group.images.map(im=>{
     const index=value.findIndex(e=>e.id===im.id),active=index>=0;
     return <label key={im.id} className={`puzzle-album-option ${active?'active':''}`}><input type="checkbox" checked={active} disabled={busy||(!active&&value.length>=max)} onChange={e=>addOrRemove(im.id,e.target.checked)}/><img src={im.url} alt={im.name}/><span>{active?`${isOnet?'#':'Level '}${String(index+1).padStart(2,'0')} · `:''}{im.name}</span></label>;
    })}</div></div>
   </details>;
  })}</div>
  {available.length===0&&<p>Chưa có ảnh trong thư viện. Hãy tải ảnh lên ở khu vực quản lý ảnh bên dưới, sau đó chọn vào bộ ảnh này.</p>}
  {editingEntry&&images.get(editing)&&<CropModal onClose={()=>setEditing(null)}><CropEditor key={`${game}-${editing}`} image={images.get(editing)} slot={game} albumMode initialTransform={editingEntry.transform} busy={busy} onCancel={()=>setEditing(null)} onSaveTransform={transform=>changeCrop(editing,transform)} onSaved={async()=>{}}/><div className="crop-modal-extra"><button className="secondary-button" type="button" disabled={busy} onClick={()=>changeCrop(editing,null)}><Icon name="image" size={15}/> Dùng ảnh gốc (không crop)</button><p className="game-album-tip">Áp dụng crop để xem trước, sau đó nhấn “Lưu bộ ảnh” ở trang Admin để cập nhật lên website.</p></div></CropModal>}
  <div className="admin-feature-actions"><button className="primary-button" disabled={busy} onClick={()=>onSave(value)}>{isMiner?'Lưu bộ sưu tập Đào Dép':isJigsaw?'Lưu album Mảnh Ghép Nhà Thơm':`Lưu bộ ảnh ${isOnet?'Nối Thơm Đi!':'Ghép Thơm Đi!'}`}</button></div>
 </section>;
}
