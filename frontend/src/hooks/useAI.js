import { useState, useCallback } from "react";
import { findLosingTriangle, oppositeColor } from "../utils/gameHelpers.js";

export function useAI(config, gameState) {
  const [aiThinking, setAiThinking] = useState(false);

  const {
    playerColor,
    setMoves,
    setCurrentTurn,
    setGameOver,
    updatePlayerStats,
  } = gameState;

  const opponentColor = oppositeColor(playerColor);

  const handleAIResponse = useCallback(
    async (res) => {
      if (!res.aiMove) return false;

      setAiThinking(true);
      setCurrentTurn(opponentColor);

      await new Promise((r) => setTimeout(r, 600));

      setMoves(res.moves);
      setAiThinking(false);

      if (res.status === "finished") {
        const loserColor =
          res.winner === config.username ? opponentColor : playerColor;
        setGameOver({
          winner: res.winner,
          loser: loserColor,
          triangle: findLosingTriangle(res.moves, loserColor),
        });
        await updatePlayerStats(res.winner);
        return true;
      }

      setCurrentTurn(playerColor);
      return false;
    },
    [
      config.username,
      playerColor,
      opponentColor,
      setMoves,
      setCurrentTurn,
      setGameOver,
      updatePlayerStats,
    ]
  );

  return { aiThinking, handleAIResponse };
}
