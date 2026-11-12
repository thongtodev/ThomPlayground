import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findPath,ONET_COLS,ONET_ROWS} from '../src/onetEngine.js';

const onet=readFileSync(new URL('../src/games/OnetGame.jsx',import.meta.url),'utf8');
const progress=readFileSync(new URL('../src/effects/ProgressEffects.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/05-home-and-onet.css',import.meta.url),'utf8');

test('Onet does not fade, shake or FLIP-animate the underlying img element',()=>{
 assert.doesNotMatch(onet,/moveVisual\(art/);
 assert.doesNotMatch(onet,/type:'shake',element:[^;]*querySelector\('img'\)/);
 assert.match(onet,/setInvalidPair\(\[selected,index\]\)/);
 assert.match(css,/\.onet-cell\.onet-invalid\s*\{/);
 assert.match(progress,/const a=old\.current\.rects\[j\],b=rects\[i\],tile=els\[i\]/);
 assert.doesNotMatch(progress,/const a=old\.current\.rects\[j\],b=rects\[i\],art=els\[i\]\.querySelector/);
});
test('Onet keeps the board unchanged on invalid matches and uses fallback for broken images',()=>{
 const invalid=onet.slice(onet.indexOf('if(!path){'),onet.indexOf('const now=performance.now()',onet.indexOf('if(!path){')));
 assert.doesNotMatch(invalid,/setBoard\(/);
 assert.match(onet,/onError=\{event=>\{/);
 assert.match(onet,/img\.src=DEFAULT_IMAGE/);
});
test('Onet rule: same image without a path cannot match, adjacent images can',()=>{
 const board=Array(ONET_ROWS*ONET_COLS).fill(1);
 board[14]=0;board[33]=0;
 assert.equal(findPath(board,14,33),null); // both blocked inside board
 assert.equal(findPath(board,14,15),null); // different images
 board[15]=0;
 assert.ok(findPath(board,14,15)); // same image, adjacent
});
