/**
 * SIM Game - Edge utilities for the frontend.
 */

export function normalizeEdge(edge) {
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
