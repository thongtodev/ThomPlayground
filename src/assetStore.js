import {renderSlotImage} from './imageTransforms';
/** Asset configuration. Without Supabase credentials, uploads are stored in this browser only. */
export const DEFAULT_IMAGE = '/assets/thom-avatar.png';
export const ASSET_SLOTS = [
  {id:'card-miner',label:'Thẻ Đào Dép Đi!',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'icon-miner',label:'Biểu tượng Đào Dép Đi!',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'miner-character',label:'Nhân vật chú Thơm',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'miner-slipper',label:'Dép thường',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'miner-pair',label:'Dép đôi',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'miner-gold',label:'Dép vàng',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'miner-mic',label:'Micro',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'miner-rock',label:'Đá nhỏ',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'miner-boulder',label:'Đá lớn',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'miner-clock',label:'Đồng hồ',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'miner-magnet',label:'Nam châm',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'miner-boost',label:'Dép đặc biệt (tăng lực)',section:'Đào Dép Đi!',hint:'Ảnh PNG/WebP rõ chủ thể; nên dùng nền trong suốt'},
  {id:'hero', label:'Banner trang chủ', section:'Trang chủ', hint:'Ảnh hiển thị bên phải banner trang chủ, ưu tiên ảnh nền trong suốt'},
  {id:'card-mines', label:'Thẻ Dò mìn', section:'Thẻ game', hint:'Ảnh đại diện trong danh sách game'},
  {id:'card-mole', label:'Thẻ Tặng dép', section:'Thẻ game', hint:'Ảnh đại diện trong danh sách game'},
  {id:'card-tic', label:'Thẻ Thơm X Thơm O', section:'Thẻ game', hint:'Ảnh đại diện trong danh sách game'},
  {id:'card-reaction', label:'Thẻ Nhanh Tay Bắt Thơm', section:'Thẻ game', hint:'Ảnh đại diện trong danh sách game'},
  {id:'card-puzzle', label:'Thẻ Ghép Thơm Đi!', section:'Thẻ game', hint:'Ảnh đại diện trong danh sách game'},
  {id:'card-onet', label:'Thẻ Nối Thơm Đi!', section:'Thẻ game', hint:'Ảnh đại diện trò chơi nối hình'},
  {id:'card-connect4', label:'Thẻ Bốn Quân Nhà Thơm', section:'Thẻ game', hint:'Ảnh đại diện Connect Four'},
  {id:'card-simon', label:'Thẻ Nhớ Lời Thơm', section:'Thẻ game', hint:'Ảnh đại diện Simon Says'},
  {id:'card-jigsaw', label:'Thẻ Mảnh Ghép Nhà Thơm', section:'Thẻ game', hint:'Ảnh đại diện Jigsaw Puzzle'},
  {id:'connect4-red', label:'Quân Đỏ', section:'Bốn Quân Nhà Thơm', hint:'Ảnh chân dung tròn, viền đỏ; hiển thị trong quân cờ'},
  {id:'connect4-yellow', label:'Quân Vàng', section:'Bốn Quân Nhà Thơm', hint:'Ảnh biểu cảm khác quân Đỏ, viền vàng; hiển thị trong quân cờ'},
  {id:'simon-1', label:'Biểu cảm 1 · Nắng', section:'Nhớ Lời Thơm', hint:'Ảnh vuông hoặc chân dung, dùng cho nút ghi nhớ số 1'},
  {id:'simon-2', label:'Biểu cảm 2 · Hoa', section:'Nhớ Lời Thơm', hint:'Ảnh vuông hoặc chân dung, dùng cho nút ghi nhớ số 2'},
  {id:'simon-3', label:'Biểu cảm 3 · Tim', section:'Nhớ Lời Thơm', hint:'Ảnh vuông hoặc chân dung, dùng cho nút ghi nhớ số 3'},
  {id:'simon-4', label:'Biểu cảm 4 · Nhạc', section:'Nhớ Lời Thơm', hint:'Ảnh vuông hoặc chân dung, dùng cho nút ghi nhớ số 4'},
  {id:'mines', label:'Mìn / sticker bất ngờ', section:'Dò mìn', hint:'Hiển thị khi người chơi mở trúng mìn'},
  {id:'mole', label:'Chú Thơm (đã tách nền)', section:'Tặng dép', hint:'Dùng PNG/WebP trong suốt; khung lỗ có viền, nhân vật không có nền'},
  {id:'tic-x', label:'Quân X', section:'Thơm X Thơm O', hint:'Ảnh quân X dùng cho cả 3×3 và 10×10; không làm giãn ô'},
  {id:'tic-o', label:'Quân O', section:'Thơm X Thơm O', hint:'Ảnh quân O dùng cho cả 3×3 và 10×10; không làm giãn ô'},
  {id:'reaction-bomb', label:'Bẫy bom phản xạ', section:'Nhanh Tay Bắt Thơm', hint:'Ảnh bẫy cần tránh chạm trong thử thách phản xạ'},
  {id:'reaction', label:'Tín hiệu BẤM NGAY', section:'Nhanh Tay Bắt Thơm', hint:'Ảnh xuất hiện khi được phép chạm'},
  {id:'puzzle-1', label:'Ảnh ghép số 1 (dự phòng)', section:'Ghép Thơm Đi!', hint:'Nên dùng ảnh vuông tối thiểu 1000 × 1000'},
  {id:'puzzle-2', label:'Ảnh ghép số 2 (dự phòng)', section:'Ghép Thơm Đi!', hint:'Nên dùng ảnh vuông tối thiểu 1000 × 1000'},
  {id:'puzzle-3', label:'Ảnh ghép số 3 (dự phòng)', section:'Ghép Thơm Đi!', hint:'Nên dùng ảnh vuông tối thiểu 1000 × 1000'},
  ...[
   ['logo','Logo'],['home','Trang chủ'],['connect4','Bốn Quân Nhà Thơm'],['simon','Nhớ Lời Thơm'],['jigsaw','Mảnh Ghép Nhà Thơm'],['sound-on','Bật âm thanh'],['sound-off','Tắt âm thanh'],
   ['mines','Dò mìn'],['mole','Tặng dép'],['tic','Thơm X Thơm O'],['reaction','Nhanh Tay Bắt Thơm'],['puzzle','Ghép Thơm Đi!'],['onet','Nối Thơm Đi!'],
   ['bomb','Bom Tặng dép'],['slipper','Con trỏ dép'],['trophy','Thành tựu'],['gallery','Bộ sưu tập'],['radio','Thơm Radio'],['flag','Cắm cờ'],
   ['play','Bắt đầu'],['pause','Tạm dừng'],['reset','Chơi lại'],['lock','Khóa ảnh'],['micro','Micro']
  ].map(([id,label])=>({id:`icon-${id}`,label:`Icon · ${label}`,section:'Icon / Biểu tượng',hint:'PNG/WebP nền trong suốt, hiển thị thay cho icon mặc định'})),
];
export const CLOUD = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/(?:rest|auth|storage)\/v1\/?$/i,'').replace(/\/+$/, '');
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const DB_NAME='thom-assets-v2', STORE='images', MAP_KEY='thom-assets-assignments-v2', TRANSFORMS_KEY='thom-assets-transforms-v15', TOKEN_KEY='thom-admin-session-v2';
const preset = {id:'default-thom', name:'Ảnh chú Thơm (mặc định)', url:DEFAULT_IMAGE, category:'shared', builtIn:true};
const getMap = () => { try { const map=JSON.parse(localStorage.getItem(MAP_KEY)) || {}; if('icon-hammer' in map){delete map['icon-hammer'];localStorage.setItem(MAP_KEY,JSON.stringify(map));}return map; } catch { return {}; } };
const saveMap = map => localStorage.setItem(MAP_KEY, JSON.stringify(map));
const getLocalTransforms=()=>{try{return JSON.parse(localStorage.getItem(TRANSFORMS_KEY))||{};}catch{return {};}};
const saveLocalTransforms=t=>localStorage.setItem(TRANSFORMS_KEY,JSON.stringify(t));
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function dbAction(mode,operation,value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode), req=tx.objectStore(STORE)[operation](value);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();tx.onerror=()=>reject(tx.error);});}
async function getLocalGallery(){const rows=await dbAction('readonly','getAll');return [preset,...rows];}
const headers = token => ({apikey:ANON,Authorization:`Bearer ${token || ANON}`});
export async function request(path,{method='GET',token,body,extraHeaders={}}={}){const r=await fetch(`${SUPABASE_URL}${path}`,{method,headers:{...headers(token),...extraHeaders},body});if(!r.ok){let message=await r.text();try{const j=JSON.parse(message);message=j.message||j.error_description||j.error||message;}catch{}throw new Error(message||`HTTP ${r.status}`);}if(r.status===204)return null;const raw=await r.text();try{return JSON.parse(raw);}catch{return raw;}}
export function getSession(){try{return JSON.parse(sessionStorage.getItem(TOKEN_KEY));}catch{return null;}}
export function signOut(){sessionStorage.removeItem(TOKEN_KEY);}
export async function signIn(email,password){const result=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password}),extraHeaders:{'Content-Type':'application/json'}});const session={access_token:result.access_token,expires_at:Date.now()+result.expires_in*1000,email:result.user?.email};const allowed=await request('/rest/v1/rpc/is_game_admin',{method:'POST',token:session.access_token,body:'{}',extraHeaders:{'Content-Type':'application/json'}});if(allowed!==true)throw new Error('Tài khoản này không có quyền quản trị.');sessionStorage.setItem(TOKEN_KEY,JSON.stringify(session));return session;}
export async function verifyAdmin(){const s=validSession();if(!s)return false;try{return (await request('/rest/v1/rpc/is_game_admin',{method:'POST',token:s.access_token,body:'{}',extraHeaders:{'Content-Type':'application/json'}}))===true;}catch{return false;}}
export function validSession(){const s=getSession();return s && s.expires_at>Date.now()+10000 ? s : null;}
export async function loadAssets(){
 let items=[];
 if(CLOUD){
  const rows=await request('/rest/v1/game_assets?select=slot,image_id,transform,game_images(image_url)');
  items=rows.filter(x=>x.game_images?.image_url).map(x=>({slot:x.slot,url:x.game_images.image_url,transform:x.transform}));
 }else{
  const [gallery,map]=await Promise.all([getLocalGallery(),Promise.resolve(getMap())]);
  const transforms=getLocalTransforms(),lookup=new Map(gallery.map(x=>[x.id,x.url]));
  items=Object.entries(map).filter(([,id])=>lookup.has(id)).map(([slot,id])=>({slot,url:lookup.get(id),transform:transforms[slot]}));
 }
 const pairs=await Promise.all(items.map(async x=>{
  try{return [x.slot,await renderSlotImage(x.url,x.transform)];}
  catch(e){console.warn('Không thể áp dụng crop cho',x.slot,e);return [x.slot,x.url];}
 }));
 return Object.fromEntries(pairs);
}
export async function loadGallery(){if(CLOUD){const rows=await request('/rest/v1/game_images?select=id,name,image_url,created_at,category&order=created_at.desc');return [preset,...rows.map(x=>({id:x.id,name:x.name,url:x.image_url,category:x.category||'shared',builtIn:false}))];}return getLocalGallery();}
export async function loadAssignments(){if(CLOUD){const rows=await request('/rest/v1/game_assets?select=slot,image_id');return Object.fromEntries(rows.map(x=>[x.slot,x.image_id]));}return getMap();}
export async function loadAssignmentTransforms(){
 if(CLOUD){const rows=await request('/rest/v1/game_assets?select=slot,transform');return Object.fromEntries(rows.filter(x=>x.transform).map(x=>[x.slot,x.transform]));}
 return getLocalTransforms();
}
/** One gallery image can serve many slots; crop belongs to the slot, not the image. */
export async function saveAssignment(slot,id,transform=null){
 if(!ASSET_SLOTS.some(x=>x.id===slot))throw new Error('Vị trí ảnh không hợp lệ.');
 if(CLOUD){
  const s=validSession();if(!s)throw new Error('Vui lòng đăng nhập lại.');
  if(id==='default-thom'||!id){await request(`/rest/v1/game_assets?slot=eq.${encodeURIComponent(slot)}`,{method:'DELETE',token:s.access_token});return;}
  await request('/rest/v1/game_assets?on_conflict=slot',{method:'POST',token:s.access_token,body:JSON.stringify({slot,image_id:id,transform}),extraHeaders:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'}});return;
 }
 const map=getMap(),transforms=getLocalTransforms();
 if(!id||id==='default-thom')delete map[slot];else map[slot]=id;
 if(transform&&id&&id!=='default-thom')transforms[slot]=transform;else delete transforms[slot];
 saveMap(map);saveLocalTransforms(transforms);
}
export async function deleteImage(id){if(id==='default-thom')throw new Error('Không thể xóa ảnh mặc định.');const assigned=await loadAssignments();if(Object.values(assigned).includes(id))throw new Error('Ảnh đang được sử dụng. Hãy đổi ảnh ở các vị trí liên quan trước khi xóa.');const {loadGameConfig}=await import('./gameFeatures');const cfg=await loadGameConfig();const gallery=await loadGallery();if(Object.values(cfg.unoAssets||{}).includes(gallery.find(im=>im.id===id)?.url))throw new Error('Ảnh đang dùng cho bộ bài UNO. Hãy đổi ảnh lá bài trước khi xóa.');if(cfg.puzzleAlbum?.some(x=>x.id===id))throw new Error('Ảnh đang thuộc album Ghép hình. Hãy bỏ ảnh khỏi album trước khi xóa.');if(cfg.onetAlbum?.some(x=>x.id===id))throw new Error('Ảnh đang thuộc album Nối Thơm Đi!. Hãy bỏ ảnh khỏi album trước khi xóa.');if(cfg.minerAlbum?.some(x=>x.id===id))throw new Error('Ảnh đang thuộc bộ sưu tập Đào Dép. Hãy bỏ ảnh khỏi bộ trước khi xóa.');if(cfg.jigsawAlbum?.some(x=>x.id===id))throw new Error('Ảnh đang thuộc album Mảnh Ghép Nhà Thơm. Hãy bỏ ảnh khỏi album trước khi xóa.');if(CLOUD){const s=validSession();if(!s)throw new Error('Vui lòng đăng nhập lại.');const rows=await request(`/rest/v1/game_images?id=eq.${encodeURIComponent(id)}&select=storage_path`,{token:s.access_token});await request(`/rest/v1/game_images?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',token:s.access_token});if(rows?.[0]?.storage_path){await request(`/storage/v1/object/game-images/${rows[0].storage_path}`,{method:'DELETE',token:s.access_token});}return;}await dbAction('readwrite','delete',id);}
function makeId(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`img-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
export async function compressImage(file){if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Chỉ hỗ trợ ảnh PNG, JPG hoặc WebP.');if(file.size>10*1024*1024)throw new Error('Ảnh không được lớn hơn 10 MB.');const src=URL.createObjectURL(file);try{const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Không đọc được ảnh.'));i.src=src;});const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Không thể xử lý ảnh.')),'image/webp',.84));return blob;}finally{URL.revokeObjectURL(src);}}
const blobToDataUrl = blob => new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
export async function updateImageCategory(id,category){
 const allowedCategories=new Set(['shared','home','mines','mole','tic','reaction','puzzle','onet','connect4','simon','jigsaw','miner']);
 if(!allowedCategories.has(category))throw new Error('Thư mục ảnh không hợp lệ.');
 if(id==='default-thom')throw new Error('Ảnh mặc định không thể chuyển thư mục.');
 if(CLOUD){const s=validSession();if(!s)throw new Error('Vui lòng đăng nhập lại.');await request(`/rest/v1/game_images?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',token:s.access_token,body:JSON.stringify({category}),extraHeaders:{'Content-Type':'application/json',Prefer:'return=minimal'}});return;}
 const image=await dbAction('readonly','get',id);if(!image)throw new Error('Không tìm thấy ảnh trong thư viện.');await dbAction('readwrite','put',{...image,category});
}
export async function uploadImage(file,category='shared'){const allowedCategories=new Set(['shared','home','mines','mole','tic','reaction','puzzle','onet','connect4','simon','jigsaw','miner']);const imageCategory=allowedCategories.has(category)?category:'shared';const blob=await compressImage(file);const id=makeId();const name=file.name.replace(/\.[^.]+$/,'').slice(0,80)||'Ảnh chú Thơm';if(CLOUD){const s=validSession();if(!s)throw new Error('Vui lòng đăng nhập để tải ảnh.');const path=`${id}.webp`;await request(`/storage/v1/object/game-images/${path}`,{method:'POST',token:s.access_token,body:blob,extraHeaders:{'Content-Type':'image/webp','x-upsert':'false'}});const url=`${SUPABASE_URL}/storage/v1/object/public/game-images/${path}`;try{await request('/rest/v1/game_images',{method:'POST',token:s.access_token,body:JSON.stringify({id,name,image_url:url,storage_path:path,category:imageCategory}),extraHeaders:{'Content-Type':'application/json',Prefer:'return=minimal'}});}catch(e){await request(`/storage/v1/object/game-images/${path}`,{method:'DELETE',token:s.access_token}).catch(()=>{});throw e;}return {id,name,url,category:imageCategory};}const url=await blobToDataUrl(blob);await dbAction('readwrite','put',{id,name,url,category:imageCategory,createdAt:Date.now()});return {id,name,url,category:imageCategory};}

export async function downloadStorageFile(name, token) {
 const path=name.split('/').map(encodeURIComponent).join('/');
 const response=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/game-images/${path}`,{headers:headers(token)});
 if(!response.ok)throw new Error(`Không tải được ảnh ${name} (HTTP ${response.status}). Bản sao lưu chưa được tạo; vui lòng thử lại.`);
 return response.blob();
}
