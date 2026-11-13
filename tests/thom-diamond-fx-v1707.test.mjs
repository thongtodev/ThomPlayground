import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const game=read('src/games/ThomDiamondGame.jsx');
const css=read('src/styles/16-thom-diamond.css');
const engine=read('src/thomDiamondEngine.js');

test('four boosters get individual art, staged charge and impact, with input locked',()=>{
 for(const type of ['hammer','swap','shuffle','extra']){
  assert.match(game,new RegExp(`booster==='${type}'`));
  assert.match(css,new RegExp(({hammer:'tkc-hammer-sprite',swap:'tkc-booster-fx-swap',shuffle:'tkc-shuffle-wheel',extra:'tkc-extra-burst'})[type]));
 }
 assert.match(game,/stage:'charge'/);
 assert.match(game,/stage:'impact'/);
 assert.match(game,/previous:before/);
 assert.match(game,/setView\(null\);setState\(updated\)/);
 assert.match(game,/if\(token!==playToken\.current\)return/);
});

test('each blocker visually fragments based on prior vs resulting layers',()=>{
 for(const type of ['speaker','dust','ice','lock']){
  assert.match(game,new RegExp(`kinds\\.push\\('${type}'\\)`));
  assert.match(css,new RegExp(`\\.tkc-damage-${type}`));
 }
 assert.match(game,/function BlockerDamageVisual/);
 assert.match(game,/<BlockerDamageVisual types=\{damageTypes\}\/>/);
 assert.match(css,/\.tkc-damage-layer\{position:absolute;inset:0;/);
});

test('no-move reshuffle emits a visible game-board event if pieces actually move',()=>{
 assert.match(engine,/type:'reshuffle'/);
 assert.match(game,/tkc-phase-\$\{view\?\.type\|\|'idle'\}/);
 assert.match(game,/type==='reshuffle'/);
 assert.match(css,/\.tkc-phase-reshuffle \.tkc-shuffle-movable/);
});

test('gameboard effects respect reduced motion and do not animate layout',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*\.tkc-damage-layer,\.tkc-booster-fx\{display:none\}/);
 assert.match(css,/\.tkc-booster-fx\{position:absolute;inset:0;/);
 assert.match(css,/\.tkc-damage-ghost>img\{display:block;width:100%;height:100%;object-fit:contain/);
 assert.doesNotMatch(game,/window\.scrollTo\(/);
});
