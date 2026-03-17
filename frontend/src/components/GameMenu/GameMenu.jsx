import { useState } from "react";
import PropTypes from "prop-types";
import { getHexNodes } from "../../utils/gameHelpers.js";
import { useGameSetup } from "../../hooks/useGameSetup.js";
import "./GameMenu.css";

const PREVIEW_NODES = getHexNodes(100, 100, 70);

const PREVIEW_EDGES = [
  { a: 0, b: 1, color: "#C1440E" },
  { a: 1, b: 3, color: "#3B6EA5" },
  { a: 3, b: 5, color: "#C1440E" },
  { a: 0, b: 4, color: "#3B6EA5" },
  { a: 2, b: 4, color: "#C1440E" },
];

const RULES = [
  {
    num: "01",
    text: (
      <>
        <strong>6 dots</strong> arranged in a hexagon.
      </>
    ),
  },
  {
    num: "02",
    text: (
      <>
        Players take turns drawing a line between any two{" "}
        <strong>unconnected dots</strong>.
      </>
    ),
  },
  {
    num: "03",
    text: (
      <>
        <strong>Red</strong> and <strong>Blue</strong> each claim lines in their
        color.
      </>
    ),
  },
  {
    num: "04",
    text: (
      <>
        First player to complete a{" "}
        <strong>triangle of their own color loses</strong>.
      </>
    ),
  },
  { num: "05", text: <>Force your opponent into the losing move.</> },
];

function HexPreview() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="menu-hex-preview"
      aria-label="SIM board preview"
    >
      {PREVIEW_EDGES.map((e, i) => (
        <line
          key={i}
          x1={PREVIEW_NODES[e.a].x}
          y1={PREVIEW_NODES[e.a].y}
          x2={PREVIEW_NODES[e.b].x}
          y2={PREVIEW_NODES[e.b].y}
          stroke={e.color}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
      ))}
      {PREVIEW_NODES.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r="6"
          fill="#fff"
          stroke="#1C1A17"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

export default function GameMenu({ onStartGame, onBack }) {
  const [username, setUsername] = useState(
    localStorage.getItem("sim_username") || ""
  );
  const [mode, setMode] = useState("ai");
  const [difficulty, setDifficulty] = useState("hard");
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const { startGame, loading, error } = useGameSetup(onStartGame);

  function getStartLabel() {
    if (loading) return "Starting...";
    if (mode === "ai") return "Play vs AI →";
    if (isJoining) return "Join Game →";
    return "Create Room →";
  }

  function handleStart() {
    startGame({ username, mode, difficulty, isJoining, roomCode });
  }

  return (
    <div className="menu-container">
      <nav className="menu-nav">
        <div className="menu-nav-logo">
          <img src="/transparent-logo.png" alt="Math Chaos" />
          <span>Math Chaos</span>
        </div>
        <button className="menu-nav-back" onClick={onBack}>
          ← All Games
        </button>
      </nav>

      <div className="menu-body">
        {/* Left — info */}
        <div className="menu-info">
          <div>
            <p className="menu-info-eyebrow">Math Games with Bad Drawings</p>
            <h1 className="menu-info-title">SIM</h1>
            <p className="menu-info-desc">
              A classic graph-theory strategy game. Six dots, colored lines, and
              one simple rule that hides surprising depth.
            </p>
          </div>

          <HexPreview />

          <div className="menu-rules">
            <p className="menu-rules-title">How to play</p>
            {RULES.map((rule) => (
              <div key={rule.num} className="menu-rule-item">
                <span className="menu-rule-num">{rule.num}</span>
                <span className="menu-rule-text">{rule.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div className="menu-form">
          <div className="menu-field">
            <label className="menu-field-label">Username</label>
            <input
              className="menu-input"
              type="text"
              placeholder="Enter your username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="menu-divider" />

          <div className="menu-field">
            <label className="menu-field-label">Game Mode</label>
            <div className="menu-toggle">
              <button
                className={`menu-toggle-btn ${mode === "ai" ? "active" : ""}`}
                onClick={() => setMode("ai")}
              >
                <span className="t-label">vs AI</span>
                <span className="t-desc">Solo play</span>
              </button>
              <button
                className={`menu-toggle-btn ${mode === "multiplayer" ? "active" : ""}`}
                onClick={() => setMode("multiplayer")}
              >
                <span className="t-label">vs Player</span>
                <span className="t-desc">Online</span>
              </button>
            </div>
          </div>

          {mode === "ai" && (
            <div className="menu-field">
              <label className="menu-field-label">Difficulty</label>
              <div className="menu-diff">
                <button
                  className={`menu-diff-btn ${difficulty === "easy" ? "active-easy" : ""}`}
                  onClick={() => setDifficulty("easy")}
                >
                  Easy
                </button>
                <button
                  className={`menu-diff-btn ${difficulty === "hard" ? "active-hard" : ""}`}
                  onClick={() => setDifficulty("hard")}
                >
                  Hard
                </button>
              </div>
            </div>
          )}

          {mode === "multiplayer" && (
            <div className="menu-field">
              <label className="menu-field-label">Join or Host</label>
              <div className="menu-toggle" style={{ marginBottom: "0.75rem" }}>
                <button
                  className={`menu-toggle-btn ${!isJoining ? "active" : ""}`}
                  onClick={() => setIsJoining(false)}
                >
                  <span className="t-label">Host</span>
                  <span className="t-desc">Create room</span>
                </button>
                <button
                  className={`menu-toggle-btn ${isJoining ? "active" : ""}`}
                  onClick={() => setIsJoining(true)}
                >
                  <span className="t-label">Join</span>
                  <span className="t-desc">Enter code</span>
                </button>
              </div>
              {isJoining && (
                <input
                  className="menu-input"
                  type="text"
                  placeholder="ROOM CODE"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{
                    fontFamily: "Space Mono, monospace",
                    letterSpacing: "3px",
                    textAlign: "center",
                  }}
                />
              )}
            </div>
          )}

          {error && <p className="menu-error">{error}</p>}

          <div className="menu-divider" />

          <button
            className="menu-start-btn"
            onClick={handleStart}
            disabled={loading}
          >
            {getStartLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}

GameMenu.propTypes = {
  onStartGame: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};
