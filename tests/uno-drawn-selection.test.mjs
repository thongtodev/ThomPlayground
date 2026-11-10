import test from 'node:test';
import assert from 'node:assert/strict';
import {getPlayableDraw} from '../src/uno/drawnSelection.js';
const prev={id:'r',version:1,status:'playing',hand:['blue_1_a'],legal:[],turn:'a',me:'a',drew:false};
const next={...prev,version:2,hand:[...prev.hand,'red_2_a'],legal:['red_2_a'],drew:true};
test('select newly drawn legal card, including a wild',()=>{
 assert.equal(getPlayableDraw(prev,next),'red_2_a');
 assert.equal(getPlayableDraw(prev,{...next,hand:[...prev.hand,'wild_01'],legal:['wild_01']}),'wild_01');
});
test('do not select unplayable draws, penalties, stale snapshots or another turn',()=>{
 for(const n of [{...next,legal:[]},{...next,drew:false},{...next,turn:'b'},{...next,pending:{target:'a'}},{...next,version:1},{...next,id:'other'},{...next,status:'finished'},{...next,hand:[...next.hand,'red_3_a']}])assert.equal(getPlayableDraw(prev,n),null);
 assert.equal(getPlayableDraw(next,next),null);
 assert.equal(getPlayableDraw(null,next),null);
});
