import { edgesEqual } from "./edgeUtils.js";

export function oppositeColor(color) {
  return color === "red" ? "blue" : "red";
}

export function getHexNodes(cx = 200, cy = 200, r = 140) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
}

export function findLosingTriangle(moves, loserColor) {
  const colorEdges = moves
    .filter((m) => m.color === loserColor)
    .map((m) => m.edge);

  for (let a = 0; a < 4; a++) {
    for (let b = a + 1; b < 5; b++) {
      for (let c = b + 1; c < 6; c++) {
        const hasAB = colorEdges.some((e) => edgesEqual(e, [a, b]));
        const hasAC = colorEdges.some((e) => edgesEqual(e, [a, c]));
        const hasBC = colorEdges.some((e) => edgesEqual(e, [b, c]));
        if (hasAB && hasAC && hasBC) return [a, b, c];
      }
    }
  }
  return null;
}
