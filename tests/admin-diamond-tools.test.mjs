import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('cover migration accepts both new slots and preserves existing slots',async()=>{
 const db=new PGlite();
 try{
 await db.exec('create table game_assets(slot text)');
 await db.exec(read('admin-game-covers.sql'));
 await db.exec("insert into game_assets values ('card-uno'),('card-thom-diamond'),('card-mines')");
 assert.equal((await db.query('select count(*)::int as n from game_assets')).rows[0].n,3);
 await assert.rejects(db.exec("insert into game_assets values ('invalid-slot')"));
 }finally{await db.close();}
});
test('practice uses isolated progress and cannot emit achievements or persist boosters',()=>{
 const game=read('src/games/ThomDiamondGame.jsx');
 assert.match(game,/practice\?\{unlockedLevel:100,results:\{\}/);
 const win=game.slice(game.indexOf('const finishWin='),game.indexOf('// Invalid moves'));
 assert.ok(win.indexOf('if(practice)return;')<win.indexOf('setProgress('));
 assert.ok(win.indexOf('if(practice)return;')<win.indexOf('onEvent?.'));
 for(const match of game.matchAll(/saveThomDiamondProgress\(next\)/g))assert.equal(game.slice(match.index-13,match.index),'if(!practice)');
 const app=read('src/App.jsx');
 const entry=app.slice(app.indexOf('const openDiamondTest='),app.indexOf('const [selected'));
 assert.ok(entry.indexOf('await verifyAdmin()')<entry.indexOf('setDiamondTest(true)'));
 assert.match(app,/key=\{`\$\{selected\}-\$\{gameRunKey\}-\$\{diamondTest\}`\}/);
});
