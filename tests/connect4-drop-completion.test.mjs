import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {afterConnectFourDrop} from '../src/effects/connectFourDropTiming.js';
import {emptyConnectBoard,dropConnectDisc,connectFourWinner} from '../src/connectFourEngine.js';

test('Connect Four win is already computable while the visual disc is still falling', async()=>{
 let board=emptyConnectBoard();
 for(let col=0;col<3;col++) board=dropConnectDisc(board,col,'R');
 board=dropConnectDisc(board,3,'R');
 assert.equal(connectFourWinner(board)?.winner,'R');
 let landed=false,finishAnimation;
 const animation=new Promise(resolve=>{finishAnimation=resolve;});
 afterConnectFourDrop(animation,()=>{landed=true;});
 await Promise.resolve();
 assert.equal(landed,false,'do not show the winning line before the drop finishes');
 finishAnimation();
 await animation;
 assert.equal(landed,true,'reveal the winning line when the final disc has landed');
});

test('Connect Four skips the wait if no drop animation exists (reduced motion)', async()=>{
 let completed=false;
 afterConnectFourDrop(undefined,()=>{completed=true;});
 assert.equal(completed,false);
 await Promise.resolve();
 assert.equal(completed,true);
});

test('Connect Four does not leave a turn locked if the visual animation rejects', async()=>{
 let complete=0;
 const rejected=Promise.reject(new Error('animation interrupted'));
 afterConnectFourDrop(rejected,()=>complete++);
 await Promise.resolve();
 assert.equal(complete,1);
});

test('Connect Four only resolves gameplay outcome from visual drop completion',()=>{
 const game=readFileSync(new URL('../src/games/ConnectFourGame.jsx',import.meta.url),'utf8');
 const effects=readFileSync(new URL('../src/effects/GameEffects.jsx',import.meta.url),'utf8');
 const makeMove=game.slice(game.indexOf('const makeMove=(col,player)=>'),game.indexOf("useEffect(()=>{if(phase!=='playing'||mode!=='ai'"));
 const landed=game.slice(game.indexOf('function onDiscLanded(dropId){'),game.indexOf('const makeMove=(col,player)=>'));
 assert.match(makeMove,/pendingDrop\.current=\{id:/);
 assert.doesNotMatch(makeMove,/finish\(/);
 assert.match(landed,/if\(!drop\|\|drop\.id!==dropId\)return/);
 assert.match(landed,/if\(drop\.win\)finish\(/);
 assert.match(effects,/afterConnectFourDrop\(dropAnimation,landed\)/);
 assert.match(game,/disabled=\{phase!=='playing'\|\|Boolean\(outcome\)\|\|Boolean\(pendingDrop\.current\)/);
});
