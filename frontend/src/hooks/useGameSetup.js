import { useState, useCallback } from "react";
import { gamesAPI } from "../api/api.js";

export function useGameSetup(onStartGame, username) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createAIGame(difficulty, goFirst = true) {
    const playerColor = "blue"; // human is always blue
    const aiColor = "red"; // AI is always red
    const firstTurn = goFirst ? playerColor : aiColor;

    const game = await gamesAPI.create({
      gameName: "sim",
      mode: "ai",
      players: [{ username, color: playerColor }],
      difficulty,
      goFirst,
    });

    return {
      gameId: game._id,
      mode: "ai",
      playerColor,
      opponentColor: aiColor,
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
    async ({ mode, difficulty, goFirst = true, isJoining, roomCode = "" }) => {
      setError("");

      if (mode === "multiplayer" && isJoining && !roomCode.trim()) {
        setError("Please enter a room code.");
        return;
      }

      setLoading(true);
      try {
        let config;
        if (mode === "ai") {
          config = await createAIGame(difficulty, goFirst);
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
