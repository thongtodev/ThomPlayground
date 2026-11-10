import {CLOUD, request, validSession, downloadStorageFile} from './assetStore';

export async function buildBackup(snapshot, download, onProgress = () => {}) {
  if(snapshot?.format !== 'thom-playground-backup' || !snapshot.tables || !Array.isArray(snapshot.storage_objects)) {
    throw new Error('Dữ liệu sao lưu không hợp lệ.');
  }
  const files = [];
  for (const object of snapshot.storage_objects) {
    onProgress(`Đang tải ảnh ${files.length + 1}/${snapshot.storage_objects.length}…`);
    const blob = await download(object.name);
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Không đọc được ảnh ${object.name}.`));
      reader.readAsDataURL(blob);
    });
    files.push({bucket: 'game-images', name: object.name, content_type: blob.type,
      size: blob.size, encoding: 'base64', data: dataUrl.slice(dataUrl.indexOf(',') + 1)});
  }
  return {...snapshot, files, completed_at: new Date().toISOString(),
    scope: 'Application tables and all game-images files. Excludes Auth users, credentials, other buckets and browser progress.'};
}

export async function exportSupabaseBackup(onProgress) {
  if(!CLOUD) throw new Error('Chưa kết nối Supabase.');
  const session=validSession();
  if(!session) throw new Error('Vui lòng đăng nhập lại trước khi sao lưu.');
  onProgress('Đang đọc dữ liệu Supabase…');
  const snapshot=await request('/rest/v1/rpc/export_game_backup', {
    method:'POST',token:session.access_token,body:'{}',extraHeaders:{'Content-Type':'application/json'},
  });
  const backup=await buildBackup(snapshot,name=>downloadStorageFile(name,session.access_token),onProgress);
  const blob=new Blob([JSON.stringify(backup)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;
  link.download=`thom-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {images:backup.files.length,rows:Object.values(backup.tables).reduce((n,rows)=>n+rows.length,0)};
}
