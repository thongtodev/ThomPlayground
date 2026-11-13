import test from 'node:test';
import assert from 'node:assert/strict';
import {savePersonalRun,getPersonalHistory} from '../src/personalHistory.js';

function memoryStorage(){
  const data=new Map();
  return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,String(value))};
}

test('every run is retained, including runs not eligible for public ranking',()=>{
  const storage=memoryStorage();
  savePersonalRun({gameId:'mole',gameName:'Tặng dép',metricLabel:'120 điểm',eligible:true,variant:'classic'},storage,new Date('2026-11-05T10:00:00Z'));
  savePersonalRun({gameId:'mole',gameName:'Tặng dép',metricLabel:'95 điểm',eligible:false,variant:'classic'},storage,new Date('2026-11-05T10:02:00Z'));
  const history=getPersonalHistory('mole','',storage);
  assert.equal(history.length,2);
  assert.equal(history[0].metricLabel,'95 điểm');
  assert.equal(history[0].eligible,false);
  assert.equal(history[1].metricLabel,'120 điểm');
});

test('personal run history can be filtered by game and challenge variant',()=>{
  const storage=memoryStorage();
  savePersonalRun({gameId:'mole',variant:'classic',metricLabel:'10'},storage,new Date('2026-11-05T10:00:00Z'));
  savePersonalRun({gameId:'mole',variant:'speed',metricLabel:'20'},storage,new Date('2026-11-05T10:01:00Z'));
  savePersonalRun({gameId:'mines',variant:'easy',metricLabel:'30'},storage,new Date('2026-11-05T10:02:00Z'));
  assert.equal(getPersonalHistory('mole','classic',storage).length,1);
  assert.equal(getPersonalHistory('mines','',storage).length,1);
});

test('old diamond wins retain the level number and stars after level names retire',()=>{
 const run={gameId:'thom-diamond',variant:'level-93',variantLabel:'Màn 93',summary:'3 sao · Băng và bụi dày',metricValue:5000};
 const storage={getItem:()=>JSON.stringify([run])};
 assert.deepEqual(getPersonalHistory('thom-diamond','level-93',storage),[{...run,summary:'3 sao'}]);
});
