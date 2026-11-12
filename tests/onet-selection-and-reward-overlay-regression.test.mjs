import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findPath,ONET_COLS,ONET_ROWS} from '../src/onetEngine.js';

const onet = readFileSync(new URL('../src/games/OnetGame.jsx',import.meta.url),'utf8');
const cardCss = readFileSync(new URL('../src/styles/05-home-and-onet.css',import.meta.url),'utf8');
const rewardCss = readFileSync(new URL('../src/styles/10-image-and-result-dialogs.css',import.meta.url),'utf8');
const invalidBlock = onet.slice(onet.indexOf('if(!path){'),onet.indexOf('const now=performance.now()',onet.indexOf('if(!path){')));
const chooseBlock = onet.slice(onet.indexOf('const choose=(index)=>{'),onet.indexOf('const useHint=()=>{'));

test('After an invalid pair, Onet clears the active selection instead of reselecting the rejected tile',()=>{
 assert.match(invalidBlock,/setSelected\(null\)/);
 assert.doesNotMatch(invalidBlock,/setSelected\(index\)/);
 assert.doesNotMatch(invalidBlock,/setBoard\(/);
});

test('Any next valid tap cancels previous invalid shake and its stale timeout',()=>{
 const cleanup = chooseBlock.slice(0,chooseBlock.indexOf('if(selected===null)'));
 assert.match(cleanup,/clearTimeout\(invalidTimer\.current\)/);
 assert.match(cleanup,/setInvalidPair\(null\)/);
 assert.match(invalidBlock,/setInvalidPair\(\[selected,index\]\)/);
 assert.match(invalidBlock,/invalidTimer\.current=setTimeout/);
});

test('Win reward label renders under photo rather than obscuring it',()=>{
 assert.match(onet,/className="onet-reward-image-label"/);
 assert.doesNotMatch(onet,/Thêm một chú Thơm vào bộ sưu tập của chim cá nè!/);
 assert.match(cardCss,/\.onet-unlocked-image-button>span\{position:static/);
 assert.match(rewardCss,/\.onet-unlocked-image-button\s*>\s*\.onet-reward-image-label\s*\{[\s\S]*?position:\s*static/);
 assert.match(rewardCss,/\.onet-unlocked-image-button\s*>\s*img\s*\{[\s\S]*?object-fit:\s*contain/);
});

test('Matching remains subject to line-of-sight and <=2 turns',()=>{
 const board=Array(ONET_COLS*ONET_ROWS).fill(1);
 board[14]=0;board[33]=0;
 assert.equal(findPath(board,14,33),null);
 board[15]=0;
 assert.ok(findPath(board,14,15));
});
