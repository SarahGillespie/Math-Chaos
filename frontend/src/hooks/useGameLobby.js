import { useState, useEffect, useRef } from "react";
import { gamesAPI } from "../api/api.js";

export function useGameLobby(config, onGameReady) {
  const [status, setStatus] = useState("waiting");
  const [resolvedGameId, setResolvedGameId] = useState(
    config.isHost ? config.gameId : null
  );
  const [error, setError] = useState("");
  const joinedRef = useRef(false);

  useEffect(() => {
    if (config.isHost) return;

    let attempts = 0;
    const maxAttempts = 10;

    async function resolveGame() {
      try {
        const games = await gamesAPI.getAll({
          mode: "multiplayer",
          roomCode: config.roomCode,
          limit: 10,
        });

        const match = games.find(
          (g) => g.status === "waiting" || g.status === "active"
        );

        if (!match) {
          attempts++;
          if (attempts >= maxAttempts) {
            setError("Room not found. Check the code and try again.");
          } else {
            setTimeout(resolveGame, 1000);
          }
          return;
        }
        setError("");

        if (!joinedRef.current) {
          const alreadyJoined = match.players?.some((p) => p.color === "blue");
          if (!alreadyJoined) {
            joinedRef.current = true;
            await gamesAPI.updateStatus(match._id, {
              status: "active",
              blueUsername: config.username,
            });
          } else {
            joinedRef.current = true;
          }
        }

        setResolvedGameId(match._id);
      } catch (err) {
        console.error("Resolve game error:", err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(resolveGame, 1000);
        } else {
          setError("Failed to find room. Try again.");
        }
      }
    }

    resolveGame();
  }, [config.isHost, config.roomCode, config.username]);

  useEffect(() => {
    if (!resolvedGameId) return;

    const interval = setInterval(async () => {
      try {
        const game = await gamesAPI.getById(resolvedGameId);

        if (game.status === "active") {
          clearInterval(interval);
          setStatus("ready");

          const opponentPlayer = game.players?.find(
            (p) => p.color !== config.playerColor
          );

          setTimeout(() => {
            onGameReady({
              ...config,
              gameId: resolvedGameId,
              opponentUsername: opponentPlayer?.username || "Opponent",
            });
          }, 800);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [resolvedGameId]);

  return { status, error };
}
