import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFile } from './sourceHelpers.mjs';
const read=file=>readFile(new URL(file,import.meta.url),'utf8');

test('all visible navigation arrow glyphs are removed from the app UI',async()=>{
  const files=['../src/App.jsx','../src/Admin.jsx','../src/OnetGame.jsx','../src/Leaderboard.jsx','../src/CropEditor.jsx','../src/GameAlbumEditor.jsx'];
  const arrowPattern=/[←→↗↻↺↑↓⇢➜➔➡⬅⟶⟵▶◀]/u;
  for(const file of files) assert.doesNotMatch(await read(file),arrowPattern,file);
});

test('game and achievement icons use semantic SVG icon names',async()=>{
  const app=await read('../src/App.jsx');
  const admin=await read('../src/Admin.jsx');
  const features=await read('../src/gameFeatures.js');
  const icon=await read('../src/Icon.jsx');
  assert.match(app,/import Icon from '\.\/Icon'/);
  assert.match(app,/function SiteIcon\([\s\S]*?<Icon name=\{aliases\[slot\]\|\|fallback\}/);
  assert.match(admin,/<Icon name=\{t\.icon\} size=\{19\}\/>/);
  assert.match(admin,/<Icon name=\{game\.icon\} size=\{25\}\/>/);
  assert.match(features,/icon:'medal'|icon:'flag'/);
  assert.match(icon,/case 'slipper'/);
  assert.match(icon,/case 'trophy'/);
  assert.match(icon,/case 'puzzle'/);
});

test('achievement icon editor uses a semantic icon selector',async()=>{
  const admin=await read('../src/Admin.jsx');
  assert.match(admin,/<label>Biểu tượng<select value=\{normalizeIconName\(r\.icon\|\|'medal'\)\}/);
  assert.match(admin,/\['medal','Huy chương'\]/);
});
