import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {getTableEffects} from '../src/uno/tableEffects.js';

const oldRoom={id:'room',status:'playing',version:10,top:'red_1_a',turn:'p1',me:'p1',direction:1,order:['p1','p2'],players:[{id:'p1',count:3,name:'A'},{id:'p2',count:4,name:'B'}]};
const cards={red_2_a:{value:'2',color:'red'}};

test('playing a new card triggers a confirmed table flash without inventing player actions',()=>{
 const fx=getTableEffects(oldRoom,{...oldRoom,version:11,top:'red_2_a'},cards);
 assert.equal(fx.play,true);
 assert.equal(fx.flights.length,1);
 const skipped=getTableEffects(oldRoom,{...oldRoom,version:13,top:'red_2_a'},cards);
 assert.equal(skipped.play,true);
 assert.equal(skipped.flights.length,0);
 assert.equal(getTableEffects(oldRoom,{...oldRoom,version:11},cards).play,false);
 assert.equal(getTableEffects(oldRoom,oldRoom,cards),null);
});

test('play flash, immediate press acknowledgement, and no animated shadow repaint',()=>{
 const css=readFileSync(new URL('../src/styles/15-uno-table-layout.css',import.meta.url),'utf8');
 const gameplay=readFileSync(new URL('../src/uno/GameplayViews.jsx',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/games/UnoGame.jsx',import.meta.url),'utf8');
 assert.match(css,/uno-board-play-flash/);
 assert.match(css,/@keyframes uno-board-card-play[\s\S]*?transform:scale/);
 assert.match(css,/\.uno-table\.is-play-submitting::before/);
 assert.match(gameplay,/tableFx\?\.play/);
 assert.match(gameplay,/playSubmitting \? "is-play-submitting"/);
 assert.match(app,/setPlaySubmitting\(true\)/);
 assert.match(app,/next\.version<=roomRef\.current\.version/);
 const drawKeyframes=css.match(/@keyframes uno-draw-required-blink\s*\{([\s\S]*?)\n\}/)?.[1]||'';
 assert.ok(drawKeyframes.includes('opacity'));
 assert.ok(!drawKeyframes.includes('box-shadow'));
});

test('all 108 cards have lighter raster assets, while original artwork remains available',()=>{
 const cards=JSON.parse(readFileSync(new URL('../src/uno/cards.json',import.meta.url)));
 let svgBytes=0,webpBytes=0;
 for(const card of cards){
  const original=new URL('../public'+card.image,import.meta.url);
  const compressed=new URL('../public'+card.image.replace(/\.svg$/i,'.webp'),import.meta.url);
  assert.ok(existsSync(original),`Missing original ${card.id}`);
  assert.ok(existsSync(compressed),`Missing compressed ${card.id}`);
  svgBytes+=statSync(original).size;
  webpBytes+=statSync(compressed).size;
 }
 assert.ok(webpBytes<svgBytes/2,`Expected smaller images; got ${webpBytes} / ${svgBytes}`);
 const cardFile=readFileSync(new URL('../src/uno/Card.jsx',import.meta.url),'utf8');
 assert.match(cardFile,/c\.image\.replace\(\/\\\.svg\$\/i,"\.webp"\)/);
 assert.match(cardFile,/priority\?"eager":"lazy"/);
 assert.match(cardFile,/React\.memo\(function UnoCard/);
 assert.ok(existsSync(new URL('../public/assets/uno/back.webp',import.meta.url)));
});
