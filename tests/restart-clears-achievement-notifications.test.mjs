import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const newer=readFileSync(new URL('../src/NewGames.jsx',import.meta.url),'utf8');
const onet=readFileSync(new URL('../src/OnetGame.jsx',import.meta.url),'utf8');
test('global replay clears result and achievement notifications before resetting the game',()=>{
 assert.match(app,/const runAgain=reset=>\{setGameResult\(null\);setUnlockToast\(\[\]\);if\(typeof reset==='function'\)reset\(\);\}/);
 assert.match(app,/const restartGame=\(\)=>\{const id=gameResult\?\.gameId;setGameResult\(null\);[\s\S]*?setUnlockToast\(\[\]\);/);
});
test('all legacy game bottom replay buttons use the shared handler',()=>{
 assert.match(app,/function GameFrame\(\{game,onHome,onReset,onRestart/);
 assert.match(app,/onClick=\{\(\)=>onRestart\?onRestart\(onReset\):onReset\?\.\(\)\}/);
 for(const id of ['MinesGame','MoleGame','TicGame','ReactionGame','PuzzleGame','OnetGame','ConnectFourGame','SimonSaysGame','JigsawGame']){
   const line=app.split('\n').find(x=>x.includes('<'+id+' '));
   assert.ok(line && line.includes('onRestart={runAgain}'),`${id} should receive shared replay handler`);
 }
});
test('new-game Frame replay buttons use the shared handler',()=>{
 assert.match(newer,/function Frame\(\{game,onHome,onReset,onRestart/);
 assert.match(newer,/onClick=\{\(\)=>onRestart\?onRestart\(onReset\):onReset\?\.\(\)\}/);
 assert.match(newer,/onHome=\{onHome\} onReset=\{reset\} onRestart=\{onRestart\}/);
});
test('Onet bottom replay clears notifications and restarts the current level',()=>{
 assert.match(onet,/onClick=\{\(\)=>onRestart\?onRestart\(\(\)=>start\(level\)\):start\(level\)\}/);
});
