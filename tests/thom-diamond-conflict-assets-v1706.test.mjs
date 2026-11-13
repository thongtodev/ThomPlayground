import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(new URL('..',import.meta.url).pathname);
const read=path=>readFileSync(resolve(root,path),'utf8');
const data=JSON.parse(read('src/data/thomDiamondLevels.json'));
const game=read('src/games/ThomDiamondGame.jsx');
const admin=read('src/ThomDiamondAdmin.jsx');
const css=read('src/styles/16-thom-diamond.css');
const level=id=>data.levels.find(item=>item.id===id);

test('legacy Thơmverse labels do not appear in the game or levels',()=>{
 assert.equal(data.worlds[3].name,'Dưới Ánh Đèn');
 for(const l of data.levels)assert.doesNotMatch(`${l.name} ${l.focus||''}`,/thơmverse/i);
 assert.doesNotMatch(game,/thơmverse/i);
 assert.ok(data.levels.every(entry=>!Object.hasOwn(entry,'name')));
 assert.match(game,/<h1>Màn \{level\.id\}<\/h1>/);
 assert.doesNotMatch(game,/level\.worldLevel|selectedLevel\.name/);
});

test('rainbow creation and activation are enabled for objectives 11 and 12',()=>{
 for(const id of [11,12]){
  assert.ok(level(id).specialsEnabled.includes('rainbow'));
  assert.ok(level(id).objectives.some(o=>o.special==='RAINBOW'));
 }
});

test('levels 41-43 do not promise prop deliveries without prop targets',()=>{
 for(const id of [41,42,43]){
  assert.equal(level(id).props,0);
  assert.ok(level(id).objectives.some(o=>o.type==='BREAK_SPEAKER'));
  assert.ok(level(id).objectives.every(o=>o.type!=='DELIVER'));
 }
});

test('all nine supplied gameplay assets are referenced and available',()=>{
 const names=['speaker','dust','ice','lock','microphone','rocket','bomb','rainbow','plane'];
 const registry=read('src/diamondAssets.js');
 for(const name of names){
  assert.ok(existsSync(resolve(root,`public/thom-kim-cuong/gameplay/${name}.png`)),`${name} PNG`);
  assert.match(registry,new RegExp(`${name}: \\x60\\$\\{ROOT\\}${name}\\.png`));
 }
 for(const cls of ['tkc-speaker-icon','tkc-dust-overlay','tkc-ice-overlay','tkc-lock-overlay','tkc-special-mark','tkc-prop-piece','tkc-exit-cell']){
  assert.ok(game.includes(cls),`${cls} JSX`);
  assert.ok(css.includes(`.${cls}`),`${cls} CSS`);
 }
 assert.doesNotMatch(game,/>🎤<|>🔊<|>❄|>🔒<|>✦\{/);
});

test('manifest WebP paths resolve to real tiles and original portraits remain available',()=>{
 for(const path of ['src/data/thomDiamondManifest.json','public/thom-kim-cuong/manifest.json']){
  for(const entry of JSON.parse(read(path))){
   assert.ok(existsSync(resolve(root,'public/thom-kim-cuong',entry.webp_fullframe_file)),entry.webp_fullframe_file);
   assert.ok(existsSync(resolve(root,'public/thom-kim-cuong',entry.original_file)),entry.original_file);
  }
 }
 assert.match(admin,/Chặng \{world\.world\} · \{world\.name\}/);
 assert.match(game,/const completedInWorld=world=>/);
 assert.match(game,/completedInWorld\(w\.world\)\}\/25 màn/);
});
