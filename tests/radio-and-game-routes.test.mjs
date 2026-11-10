import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const redirects = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8');
const features = readFileSync(new URL('../src/gameFeatures.js', import.meta.url), 'utf8');

test('YouTube playlist iframe mounts immediately and requests muted autoplay', () => {
  const start = app.indexOf('function RadioPlayer');
  const end = app.indexOf('\nexport default', start);
  const radio = app.slice(start, end);
  assert.match(radio, /url\.searchParams\.set\('autoplay','1'\)/);
  assert.match(radio, /url\.searchParams\.set\('mute','1'\)/);
  assert.match(radio, /url\.searchParams\.set\('playsinline','1'\)/);
  assert.match(radio, /url\.searchParams\.set\('enablejsapi','1'\)/);
  assert.match(radio, /<iframe ref=\{iframeRef\}[^>]*src=\{playerUrl\}/);
  assert.doesNotMatch(radio, /\{open&&<div className="radio-video"/);
  assert.match(radio, /allow="autoplay; encrypted-media; picture-in-picture"/);
});

test('YouTube playlist parser accepts playlist links including short-domain URLs', () => {
  assert.match(features, /const list=u\.searchParams\.get\('list'\)/);
  assert.match(features, /if\(host==='youtu\.be'\)\{const list=u\.searchParams\.get\('list'\)/);
  assert.match(features, /embed\/videoseries\?list=/);
});

test('Radio enables sound on first user interaction and has a manual volume control', () => {
  const start = app.indexOf('function RadioPlayer');
  const end = app.indexOf('\nexport default', start);
  const radio = app.slice(start, end);
  assert.match(radio, /window\.addEventListener\('pointerdown',unlock/);
  assert.match(radio, /window\.addEventListener\('keydown',unlock/);
  assert.match(radio, /command\('unMute'\);command\('playVideo'\)/);
  assert.match(radio, /className="radio-volume" onClick=\{toggleAudio\}/);
  assert.match(radio, /Tự phát · Chạm để bật tiếng/);
});

test('each mini-game has a direct URL and survives a page reload', () => {
  assert.match(app, /const getGameIdFromPath=\(\)=>\{const match=window\.location\.pathname\.match/);
  assert.match(app, /decodeURIComponent\(match\[1\]\)/);
  assert.match(app, /useState\(getGameIdFromPath\)/);
  assert.match(app, /window\.history\.pushState\(\{\},'',`\/games\/\$\{encodeURIComponent\(id\)\}`\)/);
  assert.match(app, /setSelected\(getGameIdFromPath\(\)\)/);
  assert.match(app, /const chooseGame=id=>\{if\(configReady&&config\.gameAvailability\?\.\[id\]!==false\)/);
  assert.match(app, /window\.addEventListener\('popstate',onPop\)/);
});

test('Netlify serves the SPA entry point for direct game URLs', () => {
  assert.match(redirects, /^\/\*\s+\/index\.html\s+200/m);
});
