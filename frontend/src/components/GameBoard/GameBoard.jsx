import { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { gamesAPI } from "../../api/api.js";
import { useGameState } from "../../hooks/useGameState.js";
import { useAI } from "../../hooks/useAI.js";
import { useMultiplayer } from "../../hooks/useMultiplayer.js";
import { edgesEqual, getAllEdges } from "../../utils/edgeUtils.js";
import { getHexNodes, findLosingTriangle } from "../../utils/gameHelpers.js";
import { formatEdge } from "../../utils/formatters.js";
import "./GameBoard.css";

const NODE_R = 10;
const nodes = getHexNodes();
const allEdges = getAllEdges();

export default function GameBoard({ config, onBackToMenu }) {
  const isAiMode = config.mode === "ai";
  const [hoveredEdge, setHoveredEdge] = useState(null);

  const gameState = useGameState(config);
  const { aiThinking, handleAIResponse } = useAI(config, gameState);
  const { notifyMove, notifyGameOver } = useMultiplayer(
    config,
    gameState,
    isAiMode
  );

  const {
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
    updatePlayerStats,
    resetGame,
  } = gameState;

  const isMyTurn = currentTurn === playerColor && !aiThinking && !gameOver;

  const handleEdgeClick = useCallback(
    async (edge) => {
      if (!isMyTurn) return;
      if (isEdgeTaken(edge)) return;

      try {
        const res = await gamesAPI.addMove(gameIdRef.current, {
          edge,
          color: playerColor,
          username: config.username,
        });

        setMoves(res.moves);

        if (res.status === "finished" && !res.aiMove) {
          const result = {
            winner: res.winner,
            loser: playerColor,
            triangle: findLosingTriangle(res.moves, playerColor),
          };
          setGameOver(result);
          if (!isAiMode) notifyGameOver(result, edge);
          await updatePlayerStats(res.winner);
          return;
        }

        if (!isAiMode) {
          setCurrentTurn(opponentColor);
          notifyMove(edge);
          return;
        }

        await handleAIResponse(res);
      } catch (err) {
        console.error("Move error:", err);
      }
    },
    [
      isMyTurn,
      isEdgeTaken,
      playerColor,
      opponentColor,
      isAiMode,
      config.username,
      gameIdRef,
      setMoves,
      setCurrentTurn,
      setGameOver,
      updatePlayerStats,
      notifyMove,
      notifyGameOver,
      handleAIResponse,
    ]
  );

  function getTurnLabel() {
    if (aiThinking) return "AI is thinking...";
    if (isMyTurn) return "Your turn";
    if (isAiMode) return "AI's turn";
    return "Opponent's turn";
  }

  function getOpponentName() {
    if (isAiMode) return `AI (${config.difficulty})`;
    return config.opponentUsername || "Opponent";
  }

  return (
    <div className="board-container">
      <nav className="board-nav">
        <div className="board-nav-logo">
          <img src="/transparent-logo.png" alt="Math Chaos" />
          <span>Math Chaos</span>
        </div>
        <button className="board-nav-back" onClick={onBackToMenu}>
          ← All Games
        </button>
      </nav>

      <div className="board-body">
        <div className="board-game-area">
          {!gameOver && (
            <div className="board-turn">
              <div
                className={`board-turn-dot board-turn-dot--${currentTurn}`}
              />
              <span className="board-turn-label">{getTurnLabel()}</span>
              {isMyTurn && (
                <span style={{ color: "#B0A090", fontSize: "0.75rem" }}>
                  — click any open line
                </span>
              )}
              {!isMyTurn && !aiThinking && (
                <span style={{ color: "#B0A090", fontSize: "0.75rem" }}>
                  — waiting for {isAiMode ? "AI" : "opponent"}
                </span>
              )}
            </div>
          )}

          {!gameOver && (
            <div className="board-hint">
              <span className="board-hint-icon">!</span>
              <span>
                Avoid completing a triangle in your color (
                <span style={{ color: "#C1440E", fontWeight: 600 }}>
                  {playerColor}
                </span>
                ). Force your opponent to close theirs.
              </span>
            </div>
          )}

          <div className="board-svg-wrap">
            <svg
              viewBox="0 0 400 400"
              className="board-svg"
              aria-label="SIM game board"
              style={{ cursor: isMyTurn ? "default" : "not-allowed" }}
            >
              {allEdges.map((edge, i) => {
                const taken = isEdgeTaken(edge);
                const n1 = nodes[edge[0]];
                const n2 = nodes[edge[1]];
                const isHovered = hoveredEdge && edgesEqual(hoveredEdge, edge);

                return (
                  <g key={`edge-${i}`}>
                    {!taken && isHovered && isMyTurn && (
                      <line
                        x1={n1.x}
                        y1={n1.y}
                        x2={n2.x}
                        y2={n2.y}
                        stroke={playerColor === "red" ? "#C1440E" : "#3B6EA5"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        opacity="0.3"
                        pointerEvents="none"
                      />
                    )}
                    {taken && (
                      <line
                        x1={n1.x}
                        y1={n1.y}
                        x2={n2.x}
                        y2={n2.y}
                        stroke={
                          isLosingEdge(edge)
                            ? gameOver?.loser === "red"
                              ? "#C1440E"
                              : "#3B6EA5"
                            : getEdgeColor(edge) === "red"
                              ? "#C1440E"
                              : "#3B6EA5"
                        }
                        strokeWidth={isLosingEdge(edge) ? 5 : 2.5}
                        strokeLinecap="round"
                        opacity={isLosingEdge(edge) ? 1 : 0.85}
                        pointerEvents="none"
                      />
                    )}
                    {!taken && (
                      <line
                        x1={n1.x}
                        y1={n1.y}
                        x2={n2.x}
                        y2={n2.y}
                        className="board-edge-hitbox"
                        onClick={() => handleEdgeClick(edge)}
                        onMouseEnter={() => isMyTurn && setHoveredEdge(edge)}
                        onMouseLeave={() => setHoveredEdge(null)}
                        style={{
                          cursor: isMyTurn ? "pointer" : "not-allowed",
                          pointerEvents: "all",
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {nodes.map((n, i) => (
                <g key={`node-${i}`}>
                  <circle cx={n.x} cy={n.y} r={NODE_R} className="board-node" />
                  <text
                    x={n.x}
                    y={n.y}
                    className="board-node-label"
                    style={{ fontSize: "9px" }}
                  >
                    {i}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {gameOver && (
            <div className="board-gameover-panel">
              <div className="board-gameover-panel-top">
                <div className="board-gameover-result">
                  <span className="board-gameover-eyebrow">Game Over</span>
                  <span
                    className={`board-gameover-title ${
                      gameOver.winner === config.username
                        ? "board-gameover-title--win"
                        : "board-gameover-title--lose"
                    }`}
                  >
                    {gameOver.disconnected
                      ? "Opponent left."
                      : gameOver.winner === config.username
                        ? "You Win!"
                        : "You Lose."}
                  </span>
                </div>
                <div className="board-gameover-actions">
                  <button
                    className="board-gameover-btn-primary"
                    onClick={isAiMode ? resetGame : onBackToMenu}
                  >
                    {isAiMode ? "Play Again" : "New Game"}
                  </button>
                  <button
                    className="board-gameover-btn-secondary"
                    onClick={onBackToMenu}
                  >
                    All Games
                  </button>
                </div>
              </div>

              <div className="board-gameover-panel-sub">
                {gameOver.disconnected
                  ? `${gameOver.disconnectedUsername || "Your opponent"} left the game. You win by default.`
                  : gameOver.winner === config.username
                    ? `${getOpponentName()} completed a triangle in their color.`
                    : "You completed a triangle in your color."}
                {gameOver.triangle && (
                  <span className="board-gameover-triangle">
                    Nodes {gameOver.triangle.join(" — ")}
                  </span>
                )}
              </div>

              <div className="board-math-concept">
                <span className="board-math-concept-label">Math Concept</span>
                <span className="board-math-concept-title">
                  Ramsey Theory — R(3,3) = 6
                </span>
                <p className="board-math-concept-body">
                  SIM demonstrates <strong>Ramsey Theory</strong>: in any
                  2-coloring of the edges of a complete graph on{" "}
                  <strong>6 nodes (K₆)</strong>, a monochromatic triangle must
                  exist. This means SIM{" "}
                  <strong>always produces a winner</strong> — a draw is
                  mathematically impossible. R(3,3) = 6 is called a{" "}
                  <strong>Ramsey number</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="board-sidebar">
          <div className="board-score-card">
            <div className="board-score-header">Players</div>
            <div className="board-score-players">
              <div className="board-score-player">
                <div className="board-score-color board-score-color--red" />
                <div className="board-score-name">
                  {playerColor === "red" ? config.username : getOpponentName()}
                </div>
                <div className="board-score-role">
                  {playerColor === "red" ? "You" : "Opponent"} — Red
                </div>
                {currentTurn === "red" && !gameOver && (
                  <div
                    className="board-score-active"
                    style={{
                      color: playerColor === "red" ? "#C1440E" : "#8C7B6B",
                    }}
                  >
                    {playerColor === "red" ? "● your turn" : "● their turn"}
                  </div>
                )}
              </div>
              <div className="board-score-player">
                <div className="board-score-color board-score-color--blue" />
                <div className="board-score-name">
                  {playerColor === "blue" ? config.username : getOpponentName()}
                </div>
                <div className="board-score-role">
                  {playerColor === "blue" ? "You" : "Opponent"} — Blue
                </div>
                {currentTurn === "blue" && !gameOver && (
                  <div
                    className="board-score-active"
                    style={{
                      color: playerColor === "blue" ? "#3B6EA5" : "#8C7B6B",
                    }}
                  >
                    {playerColor === "blue" ? "● your turn" : "● their turn"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="board-history-card">
            <div className="board-history-header">
              Move History ({moves.length})
            </div>
            <div className="board-history-list">
              {moves.length === 0 ? (
                <div className="board-history-empty">No moves yet</div>
              ) : (
                [...moves].reverse().map((m, i) => (
                  <div key={i} className="board-history-item">
                    <div
                      className={`board-history-dot board-history-dot--${m.color}`}
                    />
                    <span className="board-history-move">
                      {formatEdge(m.edge)}
                    </span>
                    <span className="board-history-who">
                      {m.username === "AI" ? "AI" : m.username}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

GameBoard.propTypes = {
  config: PropTypes.shape({
    gameId: PropTypes.string.isRequired,
    mode: PropTypes.string.isRequired,
    playerColor: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    difficulty: PropTypes.string,
    opponentUsername: PropTypes.string,
  }).isRequired,
  onBackToMenu: PropTypes.func.isRequired,
};
