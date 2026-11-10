import test from 'node:test';
import assert from 'node:assert/strict';
import {getUnoEffect} from '../src/uno/effects.js';
const prev={id:'room',version:5,status:'playing',unoTarget:'a',players:[{id:'a',name:'Thơm',count:1}],me:'b'};
const next={...prev,version:6,unoTarget:null,effect:'uno'};
test('UNO resolves once for every viewer, with the correct player name',()=>{
 assert.equal(getUnoEffect(prev,next).name,'Thơm');
 assert.equal(getUnoEffect(prev,{...next,me:'a'}).name,'Bạn');
 assert.equal(getUnoEffect(next,next),null);
 assert.equal(getUnoEffect(next,{...next,version:7}),null);
});
test('catch identifies penalized player and not the catcher',()=>{
 const caught={...next,effect:'catch',players:[{id:'a',name:'Thơm',count:3}]};
 assert.equal(getUnoEffect(prev,caught).kind,'catch');
 assert.equal(getUnoEffect(prev,caught).name,'Thơm');
 assert.equal(getUnoEffect(prev,next).kind,'uno');
});
test('ignore reconnects, old responses, room changes and unrelated draws',()=>{
 for(const [a,b] of [[null,next],[prev,{...next,version:4}],[prev,{...next,id:'other'}],[prev,{...next,status:'finished'}],[prev,{...next,effect:'draw'}],[prev,{...next,effect:'catch'}]])assert.equal(getUnoEffect(a,b),null);
});
