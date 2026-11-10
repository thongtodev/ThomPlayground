import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const admin = readFileSync(new URL('../src/Admin.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/assetStore.js', import.meta.url), 'utf8');

test('asset slot groups are collapsed by default and expand on click', () => {
  assert.match(admin, /<details className="admin-slot-group" key=\{label\}>/);
  assert.match(admin, /<summary><span>\{label\}<\/span><small>\{group\.length\} mục<\/small><\/summary>/);
  assert.match(css, /\.admin-slot-group>summary/);
  assert.match(css, /\.admin-slot-group\[open\]>summary::after/);
});

test('image library categories are collapsed by default and show image counts', () => {
  assert.match(admin, /<details className="admin-gallery-group" key=\{group\.id\}>/);
  assert.match(admin, /<span className="admin-gallery-group-count">\{group\.images\.length\} ảnh<\/span>/);
  assert.match(css, /\.admin-gallery-group>summary/);
});

test('bulk selection only includes custom images that are not used by assignments or albums', () => {
  assert.match(admin, /filter\(im=>!im\.builtIn&&usagesOf\(im\)\.length===0\)/);
  assert.match(admin, /disabled=\{busy\|\|im\.builtIn\|\|usagesOf\(im\)\.length>0\}/);
  assert.match(admin, /Ảnh đang được sử dụng, không thể xóa/);
  assert.match(store, /if\(Object\.values\(assigned\)\.includes\(id\)\)throw new Error/);
  assert.match(store, /cfg\.puzzleAlbum\?\.some/);
  assert.match(store, /cfg\.onetAlbum\?\.some/);
  assert.match(store, /cfg\.jigsawAlbum\?\.some/);
});

test('admin can select all eligible images and delete them in one confirmed action', () => {
  assert.match(admin, /const toggleSelectAllDeletable=/);
  assert.match(admin, /const removeSelected=\(\)=>/);
  assert.match(admin, /window\.confirm\(`Bạn chắc chắn muốn xóa \$\{targets\.length\} ảnh chưa được sử dụng/);
  assert.match(admin, /for\(const im of targets\)await deleteImage\(im\.id\)/);
  assert.match(admin, /Xóa ảnh đã chọn/);
});

test('bulk selection clears when switching game, scope or filter', () => {
  assert.match(admin, /setBulkSelectedIds\(\[\]\);setCropImage\(null\)/);
  assert.match(admin, /setGalleryScope\(key\);setBulkSelectedIds\(\[\]\)/);
  assert.match(admin, /setGalleryFilter\(key\);setBulkSelectedIds\(\[\]\);/);
});

test('bulk controls and selection checkboxes are usable on narrow screens', () => {
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*?\.admin-bulk-toolbar/);
  assert.match(css, /\.admin-image-bulk-check input/);
});
