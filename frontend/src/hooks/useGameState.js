import { useState, useRef } from "react";
import { gamesAPI, playersAPI } from "../api/api.js";
import { edgesEqual } from "../utils/edgeUtils.js";
import { oppositeColor, findLosingTriangle } from "../utils/gameHelpers.js";

export function useGameState(config) {
  const [moves, setMoves] = useState([]);
  const [currentTurn, setCurrentTurn] = useState("red");
  const [gameOver, setGameOver] = useState(null);
  const gameIdRef = useRef(config.gameId);

  const playerColor = config.playerColor;
  const opponentColor = oppositeColor(playerColor);

  function isEdgeTaken(edge) {
    return moves.some((m) => edgesEqual(m.edge, edge));
  }

  function getEdgeColor(edge) {
    const move = moves.find((m) => edgesEqual(m.edge, edge));
    return move ? move.color : null;
  }

  function isLosingEdge(edge) {
    if (!gameOver?.triangle) return false;
    const t = gameOver.triangle;
    return (
      edgesEqual(edge, [t[0], t[1]]) ||
      edgesEqual(edge, [t[0], t[2]]) ||
      edgesEqual(edge, [t[1], t[2]])
    );
  }

  async function updatePlayerStats(winnerUsername) {
    try {
      const playerWon = winnerUsername === config.username;
      await playersAPI.updateResult(config.username, playerWon);
    } catch (err) {
      console.error("Stats update error:", err);
    }
  }

  async function resetGame() {
    try {
      const game = await gamesAPI.create({
        gameName: "sim",
        mode: config.mode,
        players: [{ username: config.username, color: playerColor }],
        difficulty: config.difficulty,
      });
      gameIdRef.current = game._id;
      setMoves([]);
      setCurrentTurn("red");
      setGameOver(null);
    } catch (err) {
      console.error("Reset game error:", err);
    }
  }

  return {
    moves,
    setMoves,
    currentTurn,
    setCurrentTurn,
    gameOver,
    setGameOver,
    gameIdRef,
    playerColor,
    opponentColor,
    isEdgeTaken,
    getEdgeColor,
    isLosingEdge,
    findLosingTriangle,
    updatePlayerStats,
    resetGame,
  };
}
