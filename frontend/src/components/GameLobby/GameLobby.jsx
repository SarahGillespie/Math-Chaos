import { useState } from "react";
import PropTypes from "prop-types";
import { useGameLobby } from "../../hooks/useGameLobby.js";
import "./GameLobby.css";

export default function GameLobby({ config, onGameReady, onBack }) {
  const [copied, setCopied] = useState(false);
  const { status, error } = useGameLobby(config, onGameReady);

  function handleCopy() {
    navigator.clipboard.writeText(config.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="lobby-container">
      <nav className="lobby-nav">
        <div className="lobby-nav-logo">
          <img src="/transparent-logo.png" alt="Math Chaos" />
          <span>Math Chaos</span>
        </div>
        <button className="lobby-nav-back" onClick={onBack}>
          ← All Games
        </button>
      </nav>

      <div className="lobby-body">
        <div className="lobby-card">
          <div className="lobby-status">
            <div
              className={`lobby-status-dot ${
                status === "ready" ? "lobby-status-dot--ready" : ""
              }`}
            />
            <span className="lobby-status-text">
              {status === "waiting" && "Waiting for opponent..."}
              {status === "ready" && "Opponent joined — starting game!"}
              {status === "error" && "Connection error"}
            </span>
          </div>

          <div>
            <h1 className="lobby-title">
              {config.isHost ? "Room created." : "Joining room..."}
            </h1>
            <p className="lobby-sub">
              {config.isHost
                ? "Share the room code with your opponent. The game starts automatically when they join."
                : `Looking up room ${config.roomCode}...`}
            </p>
          </div>

          {config.isHost && (
            <div>
              <p className="lobby-code-label">Room Code</p>
              <div className="lobby-code-box">
                <span className="lobby-code">{config.roomCode}</span>
                <button
                  className={`lobby-copy-btn ${
                    copied ? "lobby-copy-btn--copied" : ""
                  }`}
                  onClick={handleCopy}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <div className="lobby-player-info">
            <div
              className={`lobby-player-dot lobby-player-dot--${config.playerColor}`}
            />
            <span className="lobby-player-text">
              You are playing as{" "}
              <strong>{config.playerColor === "red" ? "Red" : "Blue"}</strong>
              {" — "}
              {config.playerColor === "red"
                ? "you go first"
                : "opponent goes first"}
            </span>
          </div>

          {error && <p className="lobby-error">{error}</p>}

          <div className="lobby-divider" />

          <button className="lobby-cancel-btn" onClick={onBack}>
            Cancel — Back to Games
          </button>
        </div>
      </div>
    </div>
  );
}

GameLobby.propTypes = {
  config: PropTypes.shape({
    gameId: PropTypes.string,
    mode: PropTypes.string.isRequired,
    playerColor: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    isHost: PropTypes.bool.isRequired,
    roomCode: PropTypes.string.isRequired,
  }).isRequired,
  onGameReady: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};
