import PropTypes from "prop-types";
import "./Home.css";

const GAMES = [
  {
    id: "sim",
    title: "SIM",
    description:
      "Draw lines between 6 dots. The first player to complete a triangle in their own color loses.",
    tags: ["2 players", "Strategy", "Graph theory"],
    status: "live",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#C1440E" strokeWidth="1.5">
        <circle cx="12" cy="3" r="1.5" fill="#C1440E" />
        <circle cx="21" cy="9" r="1.5" fill="#C1440E" />
        <circle cx="21" cy="18" r="1.5" fill="#C1440E" />
        <circle cx="12" cy="22" r="1.5" fill="#C1440E" />
        <circle cx="3" cy="18" r="1.5" fill="#C1440E" />
        <circle cx="3" cy="9" r="1.5" fill="#C1440E" />
        <line x1="12" y1="3" x2="21" y2="9" stroke="#C1440E" />
        <line x1="21" y1="9" x2="3" y2="18" stroke="#3B6EA5" />
        <line x1="12" y1="3" x2="3" y2="9" stroke="#3B6EA5" />
      </svg>
    ),
  },
  {
    id: "dots-boxes",
    title: "Dots & Boxes",
    description:
      "Take turns drawing lines between dots. Complete a box to score a point. Most boxes wins.",
    tags: ["2 players", "Classic", "Territory"],
    status: "soon",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#C8BDB0" strokeWidth="1.5">
        <circle cx="5" cy="5" r="1.5" fill="#C8BDB0" />
        <circle cx="12" cy="5" r="1.5" fill="#C8BDB0" />
        <circle cx="19" cy="5" r="1.5" fill="#C8BDB0" />
        <circle cx="5" cy="12" r="1.5" fill="#C8BDB0" />
        <circle cx="12" cy="12" r="1.5" fill="#C8BDB0" />
        <circle cx="19" cy="12" r="1.5" fill="#C8BDB0" />
        <circle cx="5" cy="19" r="1.5" fill="#C8BDB0" />
        <circle cx="12" cy="19" r="1.5" fill="#C8BDB0" />
        <circle cx="19" cy="19" r="1.5" fill="#C8BDB0" />
      </svg>
    ),
  },
  {
    id: "dandelions",
    title: "Dandelions",
    description:
      "A probabilistic strategy game. Place dandelions on a grid and let the wind decide your fate.",
    tags: ["1-2 players", "Probability", "Unique"],
    status: "soon",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#C8BDB0" strokeWidth="1.5">
        <circle cx="12" cy="12" r="2" fill="#C8BDB0" />
        <line x1="12" y1="2" x2="12" y2="7" />
        <line x1="12" y1="17" x2="12" y2="22" />
        <line x1="2" y1="12" x2="7" y2="12" />
        <line x1="17" y1="12" x2="22" y2="12" />
        <line x1="5" y1="5" x2="8.5" y2="8.5" />
        <line x1="15.5" y1="15.5" x2="19" y2="19" />
        <line x1="19" y1="5" x2="15.5" y2="8.5" />
        <line x1="8.5" y1="15.5" x2="5" y2="19" />
      </svg>
    ),
  },
];

export default function Home({ onSelectGame, onLeaderboard }) {
  return (
    <div className="home-container">
      {/* Navbar */}
      <nav className="home-nav">
        <div className="home-nav-logo">
          <img src="/transparent-logo.png" alt="Math Chaos" />
          <span>Math Chaos</span>
        </div>
        <div className="home-nav-actions">
          <button className="home-nav-btn" onClick={onLeaderboard}>
            Leaderboard
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="home-hero">
        <p className="home-hero-eyebrow">
          Inspired by Math Games with Bad Drawings - Ben Orlin
        </p>
        <h1>
          Play games.
          <br />
          Think <em>mathematically.</em>
        </h1>
        <p>
          A collection of deep, easy-to-learn mathematical games. No installs,
          no accounts — just pick a game and play.
        </p>
      </header>

      {/* Games grid */}
      <main className="home-games-section">
        <p className="home-section-label">Available Games</p>
        <div className="home-games-grid">
          {GAMES.map((game) => (
            <div
              key={game.id}
              className={`game-card ${game.status === "soon" ? "game-card--coming-soon" : ""}`}
            >
              <div className="game-card-header">
                <div className="game-card-icon">{game.icon}</div>
                <span
                  className={`game-card-badge ${
                    game.status === "live"
                      ? "game-card-badge--live"
                      : "game-card-badge--soon"
                  }`}
                >
                  {game.status === "live" ? "Live" : "Soon"}
                </span>
              </div>
              <div className="game-card-body">
                <p className="game-card-title">{game.title}</p>
                <p className="game-card-desc">{game.description}</p>
                <div className="game-card-meta">
                  {game.tags.map((tag) => (
                    <span key={tag} className="game-card-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="game-card-footer">
                {game.status === "live" ? (
                  <button
                    className="game-card-play-btn"
                    onClick={() => onSelectGame(game.id)}
                  >
                    Play {game.title} →
                  </button>
                ) : (
                  <button className="game-card-play-btn--disabled" disabled>
                    Coming soon
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <p></p>
        <p>
          © Copyright <b>Math-Chaos</b> 2026, all rights reserved.
        </p>
        <p></p>
      </footer>
    </div>
  );
}

Home.propTypes = {
  onSelectGame: PropTypes.func.isRequired,
  onLeaderboard: PropTypes.func.isRequired,
};
