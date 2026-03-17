import { useCallback, useRef, useEffect } from "react";
import { gamesAPI } from "../api/api.js";
import { useWebSocket } from "./useWebSocket.js";
import { oppositeColor } from "../utils/gameHelpers.js";

export function useMultiplayer(config, gameState, isAiMode) {
  const sendMessageRef = useRef(null);

  const {
    playerColor,
    setMoves,
    setCurrentTurn,
    setGameOver,
    updatePlayerStats,
    gameIdRef,
  } = gameState;

  const opponentColor = oppositeColor(playerColor);

  const handleWsMessage = useCallback(
    (msg) => {
      if (msg.type === "opponent_move") {
        gamesAPI
          .getById(gameIdRef.current)
          .then((game) => {
            setMoves(game.moves);
            setCurrentTurn(msg.nextTurn);
          })
          .catch(console.error);
      }

      if (msg.type === "game_over") {
        setGameOver({
          winner: msg.winner,
          loser: msg.loser,
          triangle: msg.triangle,
          disconnected: false,
        });
        updatePlayerStats(msg.winner);
      }

      if (msg.type === "opponent_disconnected") {
        setGameOver({
          winner: config.username,
          loser: opponentColor,
          triangle: null,
          disconnected: true,
          disconnectedUsername: msg.username,
        });
        updatePlayerStats(config.username);
      }
    },
    [
      opponentColor,
      config.username,
      setMoves,
      setCurrentTurn,
      setGameOver,
      updatePlayerStats,
      gameIdRef,
    ]
  );

  const handleWsOpen = useCallback(() => {
    setTimeout(() => {
      if (sendMessageRef.current && gameIdRef.current) {
        sendMessageRef.current({
          type: "join",
          gameId: gameIdRef.current,
          username: config.username,
          color: playerColor,
        });
      }
    }, 150);
  }, [playerColor, config.username, gameIdRef]);

  const { sendMessage } = useWebSocket(
    handleWsMessage,
    !isAiMode,
    handleWsOpen
  );

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const notifyMove = useCallback(
    (edge) => {
      sendMessage({
        type: "move",
        gameId: gameIdRef.current,
        edge,
        color: playerColor,
        username: config.username,
      });
    },
    [sendMessage, playerColor, config.username, gameIdRef]
  );

  const notifyGameOver = useCallback(
    (result, lastEdge) => {
      if (lastEdge) {
        sendMessage({
          type: "move",
          gameId: gameIdRef.current,
          edge: lastEdge,
          color: playerColor,
          username: config.username,
        });
      }
      setTimeout(() => {
        sendMessage({
          type: "game_over",
          gameId: gameIdRef.current,
          winner: result.winner,
          loser: result.loser,
          triangle: result.triangle,
        });
      }, 100);
    },
    [sendMessage, playerColor, config.username, gameIdRef]
  );

  return { notifyMove, notifyGameOver };
}
