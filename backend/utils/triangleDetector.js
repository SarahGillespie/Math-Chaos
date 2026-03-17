/**
 * SIM Game — Triangle Detector
 *
 * 6 nodes numbered 0-5, edges represented as sorted [low, high] pairs.
 * 15 possible edges.
 * A player loses when they complete a triangle.
 */

function normalizeEdge(edge) {
  return edge[0] < edge[1] ? edge : [edge[1], edge[0]];
}

export function edgesEqual(a, b) {
  const na = normalizeEdge(a);
  const nb = normalizeEdge(b);
  return na[0] === nb[0] && na[1] === nb[1];
}

export function getAllEdges() {
  const edges = [];
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      edges.push([i, j]);
    }
  }
  return edges;
}

function getEdgesByColor(moves, color) {
  return moves
    .filter((m) => m.color === color)
    .map((m) => normalizeEdge(m.edge));
}

function findTriangle(edges) {
  for (let a = 0; a < 4; a++) {
    for (let b = a + 1; b < 5; b++) {
      for (let c = b + 1; c < 6; c++) {
        const hasAB = edges.some((e) => edgesEqual(e, [a, b]));
        const hasAC = edges.some((e) => edgesEqual(e, [a, c]));
        const hasBC = edges.some((e) => edgesEqual(e, [b, c]));
        if (hasAB && hasAC && hasBC) return [a, b, c];
      }
    }
  }
  return null;
}

export function getAvailableEdges(moves) {
  return getAllEdges().filter(
    (edge) => !moves.some((m) => edgesEqual(m.edge, edge))
  );
}

/**
 * Checks if lastColor completed a triangle (lost).
 * Returns { loser, winner, triangle } or null if game continues.
 */
export function checkGameOver(moves, lastColor) {
  const triangle = findTriangle(getEdgesByColor(moves, lastColor));
  if (triangle) {
    return {
      loser: lastColor,
      winner: lastColor === "red" ? "blue" : "red",
      triangle,
    };
  }
  if (getAvailableEdges(moves).length === 0) {
    return { loser: null, winner: null, triangle: null };
  }
  return null;
}
