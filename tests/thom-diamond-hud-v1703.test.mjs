import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const game = read('src/games/ThomDiamondGame.jsx');
const css = read('src/styles/16-thom-diamond.css');

test('live HUD shows moves, current score, objective percentage, and all three star conditions',()=>{
 assert.match(game,/className="tkc-live-panel"/);
 assert.match(game,/Điểm hiện tại/);
 assert.match(game,/Lượt còn/);
 assert.match(game,/objectivePercent/);
 assert.match(game,/scoreForTwo=Number\(level\.score2\)/);
 assert.match(game,/scoreForThree=Number\(level\.score3\)/);
 assert.match(game,/Qua màn nhận ít nhất 1 sao/);
 assert.match(game,/className="tkc-score-track" role="progressbar"/);
 assert.match(game,/tkc-score-star/);
 assert.match(game,/tkc-score-track-fill/);
});

test('HUD remains readable and fixed-height on mobile',()=>{
 assert.match(css,/\.tkc-live-panel\{position:sticky;/);
 assert.match(css,/\.tkc-hud-stat\.score b\{color:/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/font-variant-numeric:tabular-nums/);
});

test('notice is a fixed overlay, with a cleanup timer and no layout slot',()=>{
 assert.match(game,/className="tkc-floating-notice-layer"/);
 assert.match(css,/\.tkc-floating-notice-layer\{position:fixed;/);
 assert.match(game,/const showNotice=/);
 assert.match(game,/clearTimeout\(noticeTimer\.current\)/);
 assert.doesNotMatch(game,/className="tkc-notice-slot"/);
});

test('collect objectives show the exact target face and clear instructions instead of ambiguous numbered labels',()=>{
 assert.match(game,/Gom \${o.target} hình Thơm giống mẫu/);
 assert.match(game,/tileImages\?\.\[tileId\]\|\|TILE_SRC/);
 assert.match(game,/CẦN GOM/);
 assert.match(game,/Chim cá tìm hình giống mẫu rồi ghép ít nhất 3 hình/);
 assert.doesNotMatch(game,/Gom mặt Thơm #/);
});
test('score previews are independent of objectives and awards finalize on victory',()=>{
 assert.match(game,/visibleScore>=scoreForTwo/);
 assert.match(game,/visibleScore>=scoreForThree/);
 assert.doesNotMatch(game,/setEffectsOn|tkc-effects|Không giới hạn thời gian|Chơi lại miễn phí không giới hạn/);
});
