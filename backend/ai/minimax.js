/**
 * SIM Game - Minimax AI with Alpha-Beta Pruning
 *
 * In SIM, you LOSE by completing a triangle of your own color.
 * The AI tries to force the opponent to complete a triangle first.
 */

import { checkGameOver, getAvailableEdges } from "../utils/triangleDetector.js";

function scoreBoard(gameOverResult, aiColor, depth) {
  if (!gameOverResult) return 0;
  return gameOverResult.loser === aiColor ? -1000 + depth : 1000 - depth;
}

/**
 * Minimax with Alpha-Beta Pruning.
 */
function minimax(
  moves,
  turnColor,
  aiColor,
  isMaximizing,
  alpha,
  beta,
  depth,
  maxDepth
) {
  const available = getAvailableEdges(moves);
  const lastColor = turnColor === "red" ? "blue" : "red";
  const gameOver = checkGameOver(moves, lastColor);

  if (gameOver || available.length === 0 || depth >= maxDepth) {
    return scoreBoard(gameOver, aiColor, depth);
  }

  const opponentColor = turnColor === "red" ? "blue" : "red";

  if (isMaximizing) {
    let best = -Infinity;
    for (const edge of available) {
      const score = minimax(
        [...moves, { edge, color: turnColor }],
        opponentColor,
        aiColor,
        false,
        alpha,
        beta,
        depth + 1,
        maxDepth
      );
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const edge of available) {
      const score = minimax(
        [...moves, { edge, color: turnColor }],
        opponentColor,
        aiColor,
        true,
        alpha,
        beta,
        depth + 1,
        maxDepth
      );
      best = Math.min(best, score);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function getBestMove(moves, aiColor, difficulty = "hard") {
  const available = getAvailableEdges(moves);
  if (available.length === 0) return null;

  if (difficulty === "easy") {
    return {
      edge: available[Math.floor(Math.random() * available.length)],
      score: 0,
    };
  }

  const maxDepth = 6;
  const opponentColor = aiColor === "red" ? "blue" : "red";
  let bestScore = -Infinity;
  let bestEdge = available[0];

  for (const edge of available) {
    const newMoves = [...moves, { edge, color: aiColor }];

    if (checkGameOver(newMoves, aiColor)) continue;

    const score = minimax(
      newMoves,
      opponentColor,
      aiColor,
      false,
      -Infinity,
      Infinity,
      1,
      maxDepth
    );

    if (score > bestScore) {
      bestScore = score;
      bestEdge = edge;
    }
  }

  return { edge: bestEdge, score: bestScore };
}
