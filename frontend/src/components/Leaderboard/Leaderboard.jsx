import PropTypes from "prop-types";
import { useLeaderboard } from "../../hooks/useLeaderboard.js";
import {
  getWinRate,
  getRankClass,
  getRankLabel,
} from "../../utils/formatters.js";
import "./Leaderboard.css";

const SORT_OPTIONS = [
  { key: "wins", label: "Most Wins" },
  { key: "winStreak", label: "Best Streak" },
  { key: "totalGames", label: "Most Games" },
];

function getInitials(username) {
  return username.slice(0, 2).toUpperCase();
}

export default function Leaderboard({ onBack }) {
  const {
    players,
    loading,
    loadingMore,
    sort,
    setSort,
    totalCount,
    hasMore,
    loadMore,
    selectedUsername,
    selectPlayer,
    deleteSelected,
    deleting,
    currentPlayer,
  } = useLeaderboard();

  const currentUsername = localStorage.getItem("sim_username") || "";
  const winRate = currentPlayer ? getWinRate(currentPlayer) : 0;

  return (
    <div className="leaderboard-container">
      <nav className="leaderboard-nav">
        <div className="leaderboard-nav-logo">
          <img src="/transparent-logo.png" alt="Math Chaos" />
          <span>Math Chaos</span>
        </div>
        <button className="leaderboard-nav-back" onClick={onBack}>
          ← All Games
        </button>
      </nav>

      <div className="leaderboard-body">
        {/* Header row with delete button */}
        <div className="leaderboard-header">
          <div>
            <p className="leaderboard-eyebrow">Math Chaos</p>
            <h1 className="leaderboard-title">Leaderboard</h1>
            {!loading && (
              <p className="leaderboard-count">
                Showing {players.length} of {totalCount} players
              </p>
            )}
          </div>
          <button
            className={`leaderboard-delete-btn ${
              selectedUsername ? "leaderboard-delete-btn--active" : ""
            }`}
            onClick={deleteSelected}
            disabled={!selectedUsername || deleting}
          >
            {deleting
              ? "Deleting..."
              : selectedUsername
                ? `Delete "${selectedUsername}"`
                : "Select a player to delete"}
          </button>
        </div>

        {/* Your Stats card */}
        {currentUsername && (
          <div className="ys-card">
            <div className="ys-header">
              <div className="ys-avatar">
                {getInitials(currentUsername)}
              </div>
              <div>
                <p className="ys-label">your stats</p>
                <p className="ys-username">{currentUsername}</p>
              </div>
            </div>

            {currentPlayer ? (
              <div className="ys-grid">
                <div className="ys-stat">
                  <span className="ys-val ys-val--wins">{currentPlayer.wins}</span>
                  <span className="ys-key">wins</span>
                </div>
                <div className="ys-stat">
                  <span className="ys-val ys-val--losses">{currentPlayer.losses}</span>
                  <span className="ys-key">losses</span>
                </div>
                <div className="ys-stat">
                  <span className="ys-val ys-val--streak">{currentPlayer.winStreak}</span>
                  <span className="ys-key">streak</span>
                </div>
                <div className="ys-stat">
                  <span className="ys-val">{currentPlayer.totalGames}</span>
                  <span className="ys-key">games</span>
                </div>
                <div className="ys-winrate">
                  <span className="ys-key">win rate</span>
                  <div className="ys-bar-wrap">
                    <div className="ys-bar-fill" style={{ width: `${winRate}%` }} />
                  </div>
                  <span className="ys-winrate-val">{winRate}%</span>
                </div>
              </div>
            ) : (
              <p className="ys-empty">Play a game to appear on the leaderboard!</p>
            )}
          </div>
        )}

        {/* Sort tabs */}
        <div className="leaderboard-tabs">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`leaderboard-tab ${sort === opt.key ? "active" : ""}`}
              onClick={() => setSort(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="leaderboard-table-wrap">
          {loading ? (
            <div className="leaderboard-loading">Loading...</div>
          ) : players.length === 0 ? (
            <div className="leaderboard-empty">
              No players yet. Be the first to play!
            </div>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>Streak</th>
                  <th>Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => {
                  const rank = index + 1;
                  const playerWinRate = getWinRate(player);
                  const isYou =
                    player.username.toLowerCase() ===
                    currentUsername.toLowerCase();
                  const isSelected = selectedUsername === player.username;

                  return (
                    <tr
                      key={player._id}
                      className={`leaderboard-row ${
                        isSelected ? "leaderboard-row--selected" : ""
                      }`}
                      onClick={() => selectPlayer(player.username)}
                    >
                      <td>
                        <span className={getRankClass(rank)}>
                          {getRankLabel(rank)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`leaderboard-username ${
                            isYou ? "leaderboard-username--you" : ""
                          }`}
                        >
                          {player.username}
                        </span>
                        {isYou && (
                          <span className="leaderboard-you-badge">you</span>
                        )}
                      </td>
                      <td>
                        <span className="leaderboard-stat leaderboard-stat--wins">
                          {player.wins}
                        </span>
                      </td>
                      <td>
                        <span className="leaderboard-stat leaderboard-stat--losses">
                          {player.losses}
                        </span>
                      </td>
                      <td>
                        <span className="leaderboard-stat leaderboard-stat--streak">
                          {player.winStreak}
                        </span>
                      </td>
                      <td>
                        <div className="leaderboard-winrate-wrap">
                          <div className="leaderboard-winrate-bar">
                            <div
                              className="leaderboard-winrate-fill"
                              style={{ width: `${playerWinRate}%` }}
                            />
                          </div>
                          <span className="leaderboard-winrate-label">
                            {playerWinRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {hasMore && (
            <div className="leaderboard-load-more">
              <button
                className="leaderboard-load-more-btn"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore
                  ? "Loading..."
                  : `Load More (${totalCount - players.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Leaderboard.propTypes = {
  onBack: PropTypes.func.isRequired,
};
