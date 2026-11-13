import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const game = read('src/games/ThomDiamondGame.jsx');
const css = read('src/styles/16-thom-diamond.css');

test('combo toast stays below the board in a reserved mobile feedback area', () => {
 const boardClose = game.indexOf('<SpecialVisual view={view}/></div>');
 const toast = game.indexOf('className="tkc-combo-flash"');
 const wrapClose = game.indexOf('</section>', boardClose);
 assert.ok(boardClose >= 0 && boardClose < wrapClose && wrapClose < toast);
 assert.match(css,/\.tkc-feedback \.tkc-combo-flash\{position:static;/);
 assert.match(css,/\.tkc-feedback\{height:54px;min-height:54px;/);
 assert.match(css,/\.tkc-board-wrap\{position:relative;/);
});

test('chim ca notices float above content without shifting the board', () => {
 assert.match(game,/className="tkc-floating-notice-layer"/);
 assert.doesNotMatch(game,/className="tkc-notice-slot"/);
 assert.match(css,/\.tkc-floating-notice-layer\{position:fixed;/);
});

test('only changed tiles animate during drops and remain opaque', () => {
 assert.match(game,/else if\(prev!==i\)drops\.set/);
 assert.match(game,/tkc-drop-moved/);
 assert.match(css,/\.tkc-cell:not\(\.tkc-drop-moved\) \.tkc-tile-image/);
 assert.match(css,/@keyframes tkc-drop-stable\{from\{transform:translateY\(var\(--tkc-fall,0\)\);opacity:1\}/);
});

test('invalid move timeout is cleared on navigation and on new playback', () => {
 assert.match(game,/invalidTimer=useRef\(null\)/);
 assert.match(game,/clearTimeout\(invalidTimer\.current\)/);
 assert.match(game,/const showInvalid=/);
 assert.doesNotMatch(game,/setTimeout\(\(\)=>setView\(null\),150\)/);
});

test('audio feedback does not emit particle effects for every match', () => {
 assert.match(game,/sound\(step\.type==='special'\?760:500\+\(step\.wave\|\|0\)\*90,step\.type==='special'\)/);
 assert.match(game,/type:effectsOn&&highlight\?'spark':'sound'/);
});
