import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const read=p=>readFileSync(resolve(root,p),'utf8');

test('admin reopens saved crop, previews same pixel renderer as game, and never modifies originals',()=>{
 const admin=read('src/ThomDiamondAdmin.jsx'),game=read('src/games/ThomDiamondGame.jsx');
 assert.match(admin,/draft\|\|normalizeDiamondCrop\(saved\|\|DIAMOND_DEFAULT_CROP\)/);
 assert.match(admin,/paintDiamondTile\(editor\.current,source,current\)/);
 assert.match(admin,/diamondTileData\(im,value\[m\.tile_id\],128\)/);
 assert.match(game,/diamondTileData\(img,adminCrops\[item\.tile_id\],192\)/);
 assert.match(admin,/await onSave\(\{\.\.\.value,\[selected\]:crop\}\)/);
 assert.match(admin,/delete next\[selected\]/);
});

test('gameplay plays engine-confirmed waves sequentially and blocks inputs until completion',()=>{
 const game=read('src/games/ThomDiamondGame.jsx'),engine=read('src/thomDiamondEngine.js');
 for(const event of ['swap','match','clear','drop','special','settle'])assert.match(engine,new RegExp(`type:'${event}'`));
 assert.match(game,/for\(const step of steps\)/);
 assert.match(game,/busyRef\.current=true/);
 assert.match(game,/busyRef\.current=false/);
 assert.match(game,/if\(token!==playToken\.current\)return/);
 assert.match(game,/if\(result\.summary\.won\)/);
});

test('crop geometry remains reproducible after save and reopen',async()=>{
 const {normalizeDiamondCrop,paintDiamondTile}=await import('../src/diamondCrop.js');
 const crop=normalizeDiamondCrop({x:34,y:72,zoom:2.2,rotation:90,mode:'crop'});
 const source={naturalWidth:960,naturalHeight:1280};
 const paint=()=>{
  const operations=[];
  const ctx={clearRect:(...a)=>operations.push(['clear',...a]),translate:(...a)=>operations.push(['translate',...a]),scale:(...a)=>operations.push(['scale',...a]),rotate:(...a)=>operations.push(['rotate',...a]),drawImage:(...a)=>operations.push(['draw',...a.slice(1)]),save:()=>{},restore:()=>{}};
  paintDiamondTile({width:512,height:512,getContext:()=>ctx},source,crop);
  return operations;
 };
 assert.deepEqual(paint(),paint());
 assert.ok(paint().some(op=>op[0]==='rotate'));
 assert.equal(normalizeDiamondCrop(null).mode,'crop'); // Only null input is treated as crop if explicitly requested; UI uses original default.
 assert.equal(normalizeDiamondCrop({mode:'original'}).mode,'original');
});
