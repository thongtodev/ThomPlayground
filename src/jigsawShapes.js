const TAB_DEPTH = 0.17;

function edgeSign(axis, row, col) {
  const seed = axis === 'h' ? row * 31 + col * 17 + 7 : row * 19 + col * 29 + 11;
  return seed % 2 === 0 ? 1 : -1;
}

export function getJigsawPieceEdges(index, size) {
  const row = Math.floor(index / size);
  const col = index % size;
  return {
    top: row === 0 ? 0 : -edgeSign('h', row - 1, col),
    right: col === size - 1 ? 0 : edgeSign('v', row, col),
    bottom: row === size - 1 ? 0 : edgeSign('h', row, col),
    left: col === 0 ? 0 : -edgeSign('v', row, col - 1),
  };
}

function point(start, tangent, t, normal, depth = 0) {
  return [
    start[0] + tangent[0] * t + normal[0] * depth,
    start[1] + tangent[1] * t + normal[1] * depth,
  ];
}
function fmt([x, y]) { return `${x.toFixed(4)} ${y.toFixed(4)}`; }

function edgeCommands(start, end, outward, polarity) {
  const tangent = [end[0] - start[0], end[1] - start[1]];
  const depth = TAB_DEPTH * polarity;
  if (!polarity) return `L ${fmt(end)}`;
  const p = t => point(start, tangent, t, outward, depth);
  const n = t => point(start, tangent, t, outward, depth * 0.12);
  const shallow = t => point(start, tangent, t, outward, depth * 0.55);
  return [
    `L ${fmt(point(start, tangent, 0.30, outward))}`,
    `C ${fmt(n(0.36))} ${fmt(p(0.38))} ${fmt(p(0.43))}`,
    `C ${fmt(p(0.46))} ${fmt(p(0.54))} ${fmt(p(0.57))}`,
    `C ${fmt(p(0.62))} ${fmt(n(0.64))} ${fmt(point(start, tangent, 0.70, outward))}`,
    `L ${fmt(end)}`,
  ].join(' ');
}

export function buildJigsawPiecePath(index, size) {
  const e = getJigsawPieceEdges(index, size);
  const top = edgeCommands([0, 0], [1, 0], [0, -1], e.top);
  const right = edgeCommands([1, 0], [1, 1], [1, 0], e.right);
  const bottom = edgeCommands([1, 1], [0, 1], [0, 1], e.bottom);
  const left = edgeCommands([0, 1], [0, 0], [-1, 0], e.left);
  return `M 0 0 ${top} ${right} ${bottom} ${left} Z`;
}

export function isJigsawSolved(placements, rotations = {}) {
  return Array.isArray(placements) && placements.every((piece, slot) => piece === slot && (rotations[piece] || 0) % 360 === 0);
}

export function normalizeJigsawRotation(value) {
  return ((Number(value) || 0) % 360 + 360) % 360;
}
