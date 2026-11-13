import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from './sourceHelpers.mjs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('all three new games are registered in the homepage and routed to playable components',()=>{
 const app=read('../src/App.jsx');
 for(const [id,name,component] of [
  ['connect4','Bốn Quân Nhà Thơm','ConnectFourGame'],
  ['simon','Nhớ Lời Thơm','SimonSaysGame'],
  ['jigsaw','Mảnh Ghép Nhà Thơm','JigsawGame'],
 ]){assert.match(app,new RegExp(`id:'${id}'.*name:'${name}'`));assert.match(app,new RegExp(`selected==='${id}'.*<${component}`));}
});

test('new games have dedicated Admin image areas, game toggles and gallery categories',()=>{
 const admin=read('../src/Admin.jsx'),gallery=read('../src/galleryCategories.js'),assets=read('../src/assetStore.js');
 for(const id of ['connect4','simon','jigsaw']){assert.ok(admin.includes(`id:'${id}'`));assert.ok(gallery.includes(`id: '${id}'`));}
 for(const slot of ['connect4-red','connect4-yellow','simon-1','simon-2','simon-3','simon-4','card-connect4','card-simon','card-jigsaw'])assert.ok(assets.includes(`id:'${slot}'`));
 assert.ok(admin.includes('GameAlbumEditor game="jigsaw"'));
});

test('Supabase migration permits new game assets, album setting, image categories and leaderboard IDs',()=>{
 const sql=read('../supabase.sql');
 for(const token of ["'connect4'","'simon'","'jigsaw'","'jigsawAlbum'","'connect4-red'","'simon-4'"])assert.ok(sql.includes(token));
 assert.match(sql,/drop constraint if exists valid_leaderboard_game/);
});

test('new games have dedicated achievements and personal leaderboard sort directions',()=>{
 const features=read('../src/gameFeatures.js');
 for(const token of ['connect4_wins','simon_easy_wins','simon_hard_wins','jigsaw_wins','jigsaw_hard_wins'])assert.ok(features.includes(token));
 for(const [file,kind] of [['ConnectFourGame','score'],['SimonSaysGame','score'],['JigsawGame','steps']])assert.ok(read(`../src/games/${file}.jsx`).includes(`metricKind:'${kind}'`));
 assert.ok(features.includes("allGamesGoal(GAMES.length)"));
});
