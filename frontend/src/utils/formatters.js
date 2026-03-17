/**
 * Formats a move edge for display in move history.
 */
export function formatEdge(edge) {
  return `${edge[0]} — ${edge[1]}`;
}

/**
 * Formats duration in seconds to a readable string.
 */
export function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Returns display label for a color.
 */
export function formatColor(color) {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

export function getWinRate(player) {
  if (player.totalGames === 0) return 0;
  return Math.round((player.wins / player.totalGames) * 100);
}

export function getRankClass(rank) {
  const base = "leaderboard-rank";
  if (rank <= 3) return `${base} ${base}--${rank}`;
  return base;
}

export function getRankLabel(rank) {
  if (rank === 1) return "01 ★";
  return String(rank).padStart(2, "0");
}
