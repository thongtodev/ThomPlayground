import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';
const read=(file)=>readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8');

test('album crop editor opens in a viewport portal and saves per-photo transform',()=>{
 const album=read('GameAlbumEditor.jsx');
 const modal=read('CropModal.jsx');
 assert.match(album,/setEditing\(entry\.id\)/);
 assert.match(album,/<CropModal onClose=/);
 assert.match(album,/onSaveTransform=\{transform=>changeCrop\(editing,transform\)\}/);
 assert.match(album,/Lưu bộ ảnh/);
 assert.match(modal,/createPortal/);
 assert.match(modal,/role="dialog" aria-modal="true"/);
});

test('crop dialog is visible and scrollable on mobile, with touch drag enabled',()=>{
 const css=read('styles.css');
 assert.match(css,/\.crop-modal-backdrop\{position:fixed/);
 assert.match(css,/z-index:9999/);
 assert.match(css,/\.crop-modal-dialog\{[^}]*overflow-y:auto/);
 assert.match(css,/\.crop-canvas-wrap canvas\{[^}]*touch-action:none/);
});
