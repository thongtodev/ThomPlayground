import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAlbum,resolveAlbum} from '../src/albumUtils.js';

test('migrates old photo ID arrays into independently ordered album entries',()=>{
 assert.deepEqual(normalizeAlbum(['photo-a','photo-b','photo-a']),[{id:'photo-a',transform:null},{id:'photo-b',transform:null}]);
});
test('keeps per-photo crop without changing source gallery and limits Onet to 24 slots',()=>{
 const crop={mode:'crop',x:25,y:70,zoom:1.8,border:0};
 const entries=normalizeAlbum([{id:'photo-a',transform:crop},...Array.from({length:25},(_,i)=>`image-${i}`)],24);
 assert.equal(entries.length,24);
 const gallery=[{id:'photo-a',name:'Source',url:'https://example.test/photo.webp'}];
 const result=resolveAlbum(entries,gallery);
 assert.equal(result[0].transform,crop);
 assert.equal(result[0].url,gallery[0].url);
 assert.equal(gallery[0].transform,undefined);
});
test('keeps separate sets per game and ignores missing image IDs',()=>{
 const gallery=[{id:'one',url:'a'},{id:'two',url:'b'}];
 const onet=normalizeAlbum(['one']);const puzzle=normalizeAlbum(['two']);
 assert.deepEqual(resolveAlbum(onet,gallery).map(x=>x.id),['one']);
 assert.deepEqual(resolveAlbum(puzzle,gallery).map(x=>x.id),['two']);
 assert.deepEqual(resolveAlbum(normalizeAlbum(['gone']),gallery),[]);
});
