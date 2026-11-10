import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeatureSource as readFileSync } from './sourceHelpers.mjs';

const modal = readFileSync(new URL('../src/Leaderboard.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('result leaderboard is portaled to body so app-shell overflow cannot clip it', () => {
  assert.match(modal, /import \{createPortal\} from 'react-dom'/);
  assert.match(modal, /return createPortal\(<div className="overlay leaderboard-overlay"/);
  assert.match(modal, /document\.body\);/);
});

test('result leaderboard locks background scroll and makes the game shell inert', () => {
  assert.match(modal, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(modal, /appRoot\.inert = true/);
  assert.match(modal, /appRoot\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(modal, /appRoot\.inert = previousInert/);
});

test('result leaderboard can be dismissed with Escape and its close controls', () => {
  assert.match(modal, /event\.key === 'Escape'\) onClose\?\.\(\)/);
  assert.match(modal, /aria-label="Đóng bảng thành tích"/);
  assert.match(modal, /onClick=\{onClose\}>Xem bàn/);
});

test('result leaderboard keeps actions visible while its content scrolls', () => {
  assert.match(modal, /className="leaderboard-result-scroll"/);
  assert.match(modal, /className="leaderboard-result-actions"/);
  assert.match(css, /\.leaderboard-result-card\{[^}]*overflow:hidden/s);
  assert.match(css, /\.leaderboard-result-scroll\{[^}]*overflow-y:auto/s);
  assert.match(css, /\.leaderboard-result-actions\{[^}]*flex:0 0 auto/s);
});

test('mobile result leaderboard uses compact columns and safe-area-aware sizing', () => {
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*?\.leaderboard-result-card/);
  assert.match(css, /\.leaderboard-result-board \.leaderboard-table th:nth-child\(4\),\s*\.leaderboard-result-board \.leaderboard-table td:nth-child\(4\)\{display:none\}/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.leaderboard-result-actions \.primary-button\{grid-column:1\/-1\}/);
});
