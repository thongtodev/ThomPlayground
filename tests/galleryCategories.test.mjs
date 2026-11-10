import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryForTab,filterGalleryByScope,groupGalleryByCategory} from '../src/galleryCategories.js';

test('uploads map each admin game tab to its own gallery category',()=>{
  assert.equal(categoryForTab('Dò mìn'),'mines');
  assert.equal(categoryForTab('Tặng dép'),'mole');
  assert.equal(categoryForTab('Thơm X Thơm O'),'tic');
  assert.equal(categoryForTab('Nhanh Tay Bắt Thơm'),'reaction');
  assert.equal(categoryForTab('Ghép Thơm Đi!'),'puzzle');
  assert.equal(categoryForTab('Nối Thơm Đi!'),'onet');
  assert.equal(categoryForTab('Trang chủ'),'home');
});

test('gallery scopes keep game uploads separate and preserve legacy shared images',()=>{
  const gallery=[
    {id:'a',category:'mines'},
    {id:'b',category:'mole'},
    {id:'legacy'},
    {id:'shared',category:'shared'},
  ];
  assert.deepEqual(filterGalleryByScope(gallery,'current','mines').map(x=>x.id),['a']);
  assert.deepEqual(filterGalleryByScope(gallery,'shared','mines').map(x=>x.id),['legacy','shared']);
  assert.equal(filterGalleryByScope(gallery,'all','mines').length,4);
});

test('all images are grouped by game category in stable game order',()=>{
  const groups=groupGalleryByCategory([
    {id:'m1',category:'mole'},
    {id:'p1',category:'puzzle'},
    {id:'m2',category:'mole'},
    {id:'old'},
  ]);
  assert.deepEqual(groups.map(x=>x.id),['mole','puzzle','shared']);
  assert.deepEqual(groups[0].images.map(x=>x.id),['m1','m2']);
});
