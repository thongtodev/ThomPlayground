import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const source = readFileSync(new URL('../src/NewGames.jsx', import.meta.url), 'utf8');
const start = source.indexOf('function SimonSaysGame');
const end = source.indexOf('\nasync function renderSquareImage', start);
const simon = source.slice(start, end);

test('Nhớ Lời Thơm highlights a correct player selection before advancing', () => {
  assert.match(simon, /if\(!correct\)\{setWrong\(index\);playSound\(180,.14\);feedbackTimer\.current=setTimeout/);
  assert.match(simon, /setActive\(index\);playSound\(\[390,490,590,720\]\[index\]/);
  assert.match(simon, /feedbackTimer\.current=setTimeout\(\(\)=>\{/);
  assert.match(simon, /setActive\(-1\);const next=inputIndex\+1;/);
  assert.match(simon, /\},260\);/);
});

test('Simon has no response deadline; only incorrect answers cost a life', () => {
  assert.doesNotMatch(simon, /responseTimer|settings\.response|response:\s*\d+/);
  assert.doesNotMatch(simon, /hết thời gian phản hồi|s phản hồi/);
  assert.match(simon, /không bị giới hạn thời gian trả lời/);
  assert.match(simon, /Trả lời sai sẽ mất một mạng, nên nhớ tập trung nhé!/);
  assert.match(simon, /const press=index=>\{[\s\S]*?if\(!correct\)\{setWrong\(index\);/);
});

test('Simon feedback timer is cleared on restart, life loss, finish and unmount', () => {
  assert.match(simon, /const clearFeedback=\(\)=>\{/);
  assert.doesNotMatch(simon, /responseTimer/);
  assert.match(simon, /useEffect\(\(\)=>\(\)=>clearFeedback\(\),\[\]\);/);
  assert.match(simon, /const begin=\(\)=>\{resumeRef\.current='playback';clearFeedback\(\);/);
  assert.match(simon, /const finish=\(success,remainingLives=lives,scoreOverride=success\?settings\.target:completedRounds\)=>\{if\(finished\.current\)return;clearFeedback\(\);/);
  assert.match(simon, /const loseLife=\(\)=>\{if\(finished\.current\)return;clearFeedback\(\);/);
});

test('wrong Simon selection flashes red before taking a life', () => {
  assert.match(simon, /setWrong\(index\);playSound\(180,.14\);feedbackTimer\.current=setTimeout\(\(\)=>\{feedbackTimer\.current=null;setWrong\(-1\);loseLife\(\);\},450\)/);
  assert.match(simon, /wrong===index\?'wrong':''/);
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.simon-pad-button\.wrong\s*\{[^}]*border-color:#ff304f!important/s);
  assert.match(css, /\.simon-pad-button\.wrong::after\s*\{[^}]*background:#ff183b66/s);
});
