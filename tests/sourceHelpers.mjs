import { readFileSync } from 'node:fs';
// Source regression tests follow the feature's modules after extraction.
const groups = {
  'App.jsx': ['games/catalog.js', 'components/GameUI.jsx', 'utils/gameFormatting.js', 'games/MinesGame.jsx', 'games/MoleGame.jsx', 'games/TicGame.jsx', 'games/ReactionGame.jsx', 'games/PuzzleGame.jsx', 'App.jsx'],
  'NewGames.jsx': ['games/newGameMeta.js', 'components/NewGameUI.jsx', 'games/ConnectFourGame.jsx', 'games/SimonSaysGame.jsx', 'games/JigsawGame.jsx'],
  'OnetGame.jsx': ['games/OnetGame.jsx'],
};
export function readFeatureSource(url, encoding = 'utf8') {
  const filename = url.pathname.split('/').pop();
  if (url.pathname.includes('/src/') && groups[filename]) {
    return groups[filename].map(file => readFileSync(new URL('../src/' + file, import.meta.url), encoding)).join('\n');
  }
  if (filename === 'styles.css') {
    const entry = readFileSync(url, encoding);
    return [...entry.matchAll(/@import ['"]([^'"]+)['"]/g)].map(([, file]) => readFileSync(new URL(file, url), encoding)).join('\n')
      .replace(/\s*([{};:])\s*/g, '$1').replace(/\s+!important/g, '!important').replace(/@media\s+\(/g, '@media(').replace(/;}/g, '}');
  }
  return readFileSync(url, encoding);
}

export { readFeatureSource as readFileSync };
