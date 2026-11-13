import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
const games = ['MinesGame', 'MoleGame', 'TicGame', 'ReactionGame', 'PuzzleGame', 'OnetGame', 'ConnectFourGame', 'SimonSaysGame', 'JigsawGame', 'MinerGame', 'UnoGame', 'ThomDiamondGame'];

test('each game has an independent module and the application imports all twelve', () => {
  const app = read('App.jsx');
  for (const name of games) {
    const source = read(`games/${name}.jsx`);
    assert.match(source, new RegExp(`function ${name}\\(`));
    assert.doesNotMatch(source, /from ['"]\.\.\/App/);
    assert.ok(app.includes(`./games/${name}.jsx`));
    assert.ok(!app.includes(`function ${name}(`));
  }
});

test('stylesheet entry imports only existing files in a deliberate order', () => {
  const source = read('styles.css');
  const imports = [...source.matchAll(/@import ['"]([^'"]+)['"]/g)];
  assert.equal(imports.length, 16);
  imports.forEach(([, file], index) => {
    assert.ok(existsSync(new URL('../src/' + file, import.meta.url)));
    assert.ok(file.includes(`/${String(index + 1).padStart(2, '0')}-`));
  });
});

test('Onet receives the post-result actions ref it writes on completion', () => {
  assert.match(read('games/OnetGame.jsx'), /function OnetGame\(\{[^}]*postResultActionsRef|function OnetGame\([\s\S]*?onRestart,postResultActionsRef\}\)/);
  assert.match(read('App.jsx'), /<OnetGame[^>]*postResultActionsRef=\{postResultActionsRef\}/);
});
