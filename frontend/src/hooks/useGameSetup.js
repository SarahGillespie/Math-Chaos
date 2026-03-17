import { useState, useCallback } from "react";
import { gamesAPI, playersAPI } from "../api/api.js";

export function useGameSetup(onStartGame) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createAIGame(player, difficulty) {
    const game = await gamesAPI.create({
      gameName: "sim",
      mode: "ai",
      players: [{ username: player.username, color: "red" }],
      difficulty,
    });
    return {
      gameId: game._id,
      mode: "ai",
      playerColor: "red",
      username: player.username,
      difficulty,
    };
  }

  async function createMultiplayerRoom(player) {
    const game = await gamesAPI.create({
      gameName: "sim",
      mode: "multiplayer",
      players: [{ username: player.username, color: "red" }],
    });
    const roomCode = game._id.toString().slice(-6).toUpperCase();
    await gamesAPI.updateStatus(game._id, { roomCode });
    return {
      gameId: game._id,
      mode: "multiplayer",
      playerColor: "red",
      username: player.username,
      isHost: true,
      roomCode,
    };
  }

  function joinMultiplayerRoom(player, roomCode) {
    return {
      gameId: null,
      mode: "multiplayer",
      playerColor: "blue",
      username: player.username,
      isHost: false,
      roomCode: roomCode.trim().toUpperCase(),
    };
  }

  const startGame = useCallback(
    async ({ username, mode, difficulty, isJoining, roomCode }) => {
      setError("");
      const cleanName = username.trim();

      if (!cleanName) {
        setError("Please enter a username.");
        return;
      }
      if (mode === "multiplayer" && isJoining && !roomCode.trim()) {
        setError("Please enter a room code.");
        return;
      }

      setLoading(true);
      try {
        const player = await playersAPI.create(cleanName);
        localStorage.setItem("sim_username", cleanName);

        let config;
        if (mode === "ai") {
          config = await createAIGame(player, difficulty);
        } else if (!isJoining) {
          config = await createMultiplayerRoom(player);
        } else {
          config = joinMultiplayerRoom(player, roomCode);
        }

        onStartGame(config);
      } catch (err) {
        setError(err.message || "Something went wrong. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [onStartGame]
  );

  return { startGame, loading, error };
}
