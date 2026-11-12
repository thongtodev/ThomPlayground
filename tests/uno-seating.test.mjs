import test from 'node:test';
import assert from 'node:assert/strict';
import {tableSeats,enterLandscape,toggleLandscape,isFullscreenActive} from '../src/uno/seating.js';
const players=['a','b','c','d'].map(id=>({id,name:id,count:7}));
test('clockwise seats follow server order from the local bottom seat',()=>{
 const room={players,order:['c','a','d','b'],me:'a'};
 assert.deepEqual(tableSeats(room).map(p=>[p.id,p.seat]),[['d','left'],['b','top'],['c','right']]);
 assert.deepEqual(tableSeats({...room,direction:-1}),tableSeats(room));
});
test('two and three players use opposite and side seats, excluding departed players',()=>{
 assert.deepEqual(tableSeats({players:players.slice(0,2),me:'a'}).map(p=>p.seat),['top']);
 assert.deepEqual(tableSeats({players:players.map(p=>({...p,left:p.id==='d'})),me:'a'}).map(p=>p.seat),['left','right']);
 assert.deepEqual(tableSeats(null),[]);
});
test('orientation gracefully falls back when fullscreen or locking is unsupported',async()=>{
 globalThis.document={fullscreenElement:null};
 assert.equal(await enterLandscape({},{}),false);
 assert.equal(await enterLandscape({requestFullscreen:async()=>{throw Error();}},{orientation:{lock:async()=>{throw Error();}}}),false);
 let locked;assert.equal(await enterLandscape({},{orientation:{lock:async v=>{locked=v;}}}),true);assert.equal(locked,'landscape');
 delete globalThis.document;
});

test('fullscreen button enters on first tap and exits on second tap, unlocking orientation',async()=>{
 const events=[];
 const doc={fullscreenElement:null,exitFullscreen:async()=>{events.push('exit');doc.fullscreenElement=null;}};
 const element={requestFullscreen:async()=>{events.push('enter');doc.fullscreenElement=element;}};
 const screen={orientation:{lock:async orientation=>events.push(`lock:${orientation}`),unlock:()=>events.push('unlock')}};
 assert.equal(isFullscreenActive(doc),false);
 assert.equal(await toggleLandscape(element,screen,doc),true);
 assert.equal(isFullscreenActive(doc),true);
 assert.equal(await toggleLandscape(element,screen,doc),false);
 assert.equal(isFullscreenActive(doc),false);
 assert.deepEqual(events,['enter','lock:landscape','exit','unlock']);
});

test('fullscreen toggle supports vendor-prefixed API',async()=>{
 const events=[];
 const doc={webkitFullscreenElement:null,webkitExitFullscreen:()=>{events.push('exit');doc.webkitFullscreenElement=null;}};
 const element={webkitRequestFullscreen:()=>{events.push('enter');doc.webkitFullscreenElement=element;}};
 assert.equal(await toggleLandscape(element,{},doc),true);
 assert.equal(await toggleLandscape(element,{},doc),false);
 assert.deepEqual(events,['enter','exit']);
});

test('fullscreen toggle does not unlock or relock orientation if exit is rejected',async()=>{
 const events=[];
 const element={};
 const doc={fullscreenElement:element,exitFullscreen:async()=>{throw Error('blocked');}};
 const screen={orientation:{unlock:()=>events.push('unlock'),lock:()=>events.push('lock')}};
 assert.equal(await toggleLandscape(element,screen,doc),true);
 assert.deepEqual(events,[]);
});
