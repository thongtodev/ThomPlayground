import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/backup.js',import.meta.url),'utf8').replace(/^import .*;\n/,'');
const {buildBackup}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
globalThis.FileReader=class {
 async readAsDataURL(blob){try{this.result=`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onload();}catch(e){this.onerror(e);}}
};
const snapshot={format:'thom-playground-backup',tables:{game_leaderboards:[{id:1}]},storage_objects:[{name:'first.webp'},{name:'folder/second.webp'}]};
test('backup includes every binary image and preserves database rows',async()=>{
 const calls=[];
 const backup=await buildBackup(snapshot,async name=>{calls.push(name);return new Blob([new Uint8Array([0,255,128,42])],{type:'image/webp'});});
 assert.deepEqual(calls,['first.webp','folder/second.webp']);
 assert.deepEqual(backup.tables,snapshot.tables);
 assert.equal(backup.files.length,2);
 assert.deepEqual([...Buffer.from(backup.files[1].data,'base64')],[0,255,128,42]);
 assert.equal(backup.files[1].content_type,'image/webp');
 assert.equal(snapshot.files,undefined);
});
test('failed storage download rejects the whole backup',async()=>{
 await assert.rejects(buildBackup(snapshot,async name=>{if(name.includes('second'))throw new Error('Missing image');return new Blob(['ok']);}),/Missing image/);
});
test('empty backup is valid; malformed snapshots are rejected',async()=>{
 assert.equal((await buildBackup({...snapshot,storage_objects:[]},()=>{throw new Error('Unexpected download');})).files.length,0);
 await assert.rejects(buildBackup({},()=>{}),/không hợp lệ/);
});
