import { useState, useCallback } from "react";
import { gamesAPI } from "../api/api.js";

export function useGameSetup(onStartGame, username) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createAIGame(difficulty, color = "#3B6EA5", goFirst = true) {
    const AI_COLOR = "red";
    const firstTurn = goFirst ? color : AI_COLOR;
    const game = await gamesAPI.create({
      gameName: "sim",
      mode: "ai",
      players: [{ username, color }],
      difficulty,
      goFirst,
    });
    return {
      gameId: game._id,
      mode: "ai",
      playerColor: color,
      opponentColor: AI_COLOR,
      firstTurn,
      goFirst,
      username,
      difficulty,
    };
  }

  async function createMultiplayerRoom() {
    const game = await gamesAPI.create({
      gameName: "sim",
      mode: "multiplayer",
      players: [{ username, color: "red" }],
    });
    const roomCode = game._id.toString().slice(-6).toUpperCase();
    await gamesAPI.updateStatus(game._id, { roomCode });
    return {
      gameId: game._id,
      mode: "multiplayer",
      playerColor: "red",
      username,
      isHost: true,
      roomCode,
    };
  }

  function joinMultiplayerRoom(roomCode) {
    return {
      gameId: null,
      mode: "multiplayer",
      playerColor: "blue",
      username,
      isHost: false,
      roomCode: roomCode.trim().toUpperCase(),
    };
  }

  const startGame = useCallback(
    async ({ mode, difficulty, color = "#3B6EA5", goFirst = true, isJoining, roomCode = "" }) => {
      setError("");

      if (mode === "multiplayer" && isJoining && !roomCode.trim()) {
        setError("Please enter a room code.");
        return;
      }

      setLoading(true);
      try {
        let config;
        if (mode === "ai") {
          config = await createAIGame(difficulty, color, goFirst);
        } else if (!isJoining) {
          config = await createMultiplayerRoom();
        } else {
          config = joinMultiplayerRoom(roomCode);
        }

        onStartGame(config);
      } catch (err) {
        setError(err.message || "Something went wrong. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [onStartGame, username]
  );

  return { startGame, loading, error };
}
