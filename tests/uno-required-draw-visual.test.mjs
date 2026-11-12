import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const game=readFileSync(new URL('../src/games/UnoGame.jsx',import.meta.url),'utf8');
const view=readFileSync(new URL('../src/uno/GameplayViews.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/15-uno-table-layout.css',import.meta.url),'utf8');

test('requires an available draw action and no legal cards before cueing the deck',()=>{
  assert.match(game,/const canDraw=!busy&&myTurn&&!room\?\.drew&&!room\?\.pending/);
  assert.match(game,/const needsDraw=canDraw&&room\.legal\.length===0/);
  assert.match(view,/uno-draw-stack \${needsDraw \? "needs-draw" : ""}/);
});

test('red pulsing draw cue targets the deck and honors reduced motion',()=>{
  assert.match(css,/\.uno-in-game \.uno-draw-stack\.needs-draw \.uno-pile-button::after/);
  assert.match(css,/border:3px solid #ff344e/);
  assert.match(css,/animation:uno-draw-required-blink/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});

test('desktop and mobile suppress routine messages without hiding higher-priority events',()=>{
  assert.match(view,/isRoutineUnoNotice\(text\) \? null/);
  assert.doesNotMatch(view,/Lá mới đánh được!/);
});
