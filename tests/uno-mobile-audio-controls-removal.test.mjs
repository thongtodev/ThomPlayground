import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const mobile = fs.readFileSync(new URL('../src/uno/MobileTable.jsx', import.meta.url), 'utf8');
const game = fs.readFileSync(new URL('../src/games/UnoGame.jsx', import.meta.url), 'utf8');
test('UNO mobile header and menu do not render audio toggles', () => {
  const header = mobile.slice(mobile.indexOf('export function MobileHeader'), mobile.indexOf('export function ActionToast'));
  for (const text of ['toggleSound', 'aria-label={sound', 'Tắt âm thanh', 'Bật âm thanh', '♪̸', '♫']) {
    assert.ok(!header.includes(text), `Unexpected audio control: ${text}`);
  }
  assert.match(header, /className="uno-mobile-code"/);
  assert.match(header, /aria-label="Mở menu phòng"/);
  assert.match(header, /Toàn màn hình/);
});
test('UNO mobile header no longer receives unused sound props, while game audio logic remains intact', () => {
  assert.match(game, /<MobileHeader room=\{room\} onHome=\{onHome\}/);
  assert.doesNotMatch(game, /<MobileHeader[^>]+(?:sound=|toggleSound=)/);
  assert.match(game, /soundRef\.current\(/);
});
