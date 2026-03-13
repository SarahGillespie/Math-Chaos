import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { api } from '../api';
import './Lobby.css';

function ProfileModal({ user, onSave, onDelete, onClose }) {
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState('');
  const [err,      setErr]      = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSave() {
    setErr(''); setLoading(true);
    try {
      await api.updateMe({ username, ...(password ? { password } : {}) });
      onSave(username);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!window.confirm('Delete your account? This cannot be undone.')) return;
    setLoading(true);
    try { await api.deleteMe(); onDelete(); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="profile-overlay">
      <div className="profile-modal">
        <h2>Edit Profile</h2>
        {err && <div className="lobby-err">{err}</div>}
        <label>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} />
        <label>New password <span style={{ fontWeight:'normal', color:'#aaa' }}>(leave blank to keep)</span></label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <div className="profile-modal-actions">
          <button className="profile-save-btn" onClick={handleSave} disabled={loading}>Save</button>
          <button className="profile-cancel-btn" onClick={onClose} disabled={loading}>Cancel</button>
        </div>
        <button className="profile-delete-btn" onClick={handleDelete} disabled={loading}>Delete my account</button>
      </div>
    </div>
  );
}

ProfileModal.propTypes = {
  user:     PropTypes.shape({ username: PropTypes.string.isRequired }).isRequired,
  onSave:   PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onClose:  PropTypes.func.isRequired,
};

export default function Lobby({ user, onJoinGame, onLogout }) {
  const [games,        setGames]        = useState([]);
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState([]);
  const [err,          setErr]          = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [currentUser,  setCurrentUser]  = useState(user);

  const loadGames = useCallback(() => {
    if (currentUser.guest) return;
    api.myGames().then(setGames).catch(console.error);
  }, [currentUser.guest]);

  useEffect(() => {
    loadGames();
    const t = setInterval(loadGames, 3000);
    return () => clearInterval(t);
  }, [loadGames]);

  useEffect(() => {
    if (currentUser.guest) return;
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      api.searchUsers(query).then(setResults).catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [query, currentUser.guest]);

  async function startBotGame() {
    if (currentUser.guest) {
      // guest: create a local-only bot game without hitting the server
      const fakeId = 'local_' + Date.now();
      onJoinGame(fakeId, { guest: true });
      return;
    }
    try { const { gameId } = await api.createBotGame(); onJoinGame(gameId); }
    catch (e) { setErr(e.message); }
  }

  async function challenge(opponentId) {
    try { const { gameId } = await api.createGame(opponentId); onJoinGame(gameId); }
    catch (e) { setErr(e.message); }
  }

  async function accept(gameId) {
    try { await api.acceptGame(gameId); onJoinGame(gameId); }
    catch (e) { setErr(e.message); }
  }

  const pending  = games.filter(g => g.status === 'pending');
  const active   = games.filter(g => g.status === 'active');
  const finished = games.filter(g => g.status === 'finished');

  return (
    <div className="lobby-wrap">
      {editingProfile && !currentUser.guest && (
        <ProfileModal
          user={currentUser}
          onSave={u => { setCurrentUser(c => ({ ...c, username: u })); setEditingProfile(false); }}
          onDelete={onLogout}
          onClose={() => setEditingProfile(false)}
        />
      )}

      <div className="lobby-header">
        <span className="lobby-username">👤 {currentUser.username}</span>
        {currentUser.guest
          ? <span className="lobby-guest-notice">Guest — <button className="lobby-inline-btn" onClick={onLogout}>sign in for full access</button></span>
          : <span className="lobby-stats">W {currentUser.stats?.wins ?? 0} · L {currentUser.stats?.losses ?? 0} · G {currentUser.stats?.gamesPlayed ?? 0}</span>
        }
        {!currentUser.guest && <button className="lobby-edit-btn" onClick={() => setEditingProfile(true)}>Edit profile</button>}
        <button className="lobby-logout-btn" onClick={onLogout}>{currentUser.guest ? 'Sign in' : 'Log out'}</button>
      </div>

      {err && <div className="lobby-err">{err}</div>}

      <div className="lobby-section">
        <h2 className="lobby-h2">Play vs AI</h2>
        <div className="lobby-row">
          <span className="lobby-muted">{currentUser.guest ? 'Random bot — guest mode' : 'Random bot — counts toward stats'}</span>
          <button className="lobby-btn" onClick={startBotGame}>Play</button>
        </div>
      </div>

      <div className="lobby-section">
        <h2 className="lobby-h2">Challenge a player</h2>
        {currentUser.guest
          ? <p className="lobby-muted">Sign in to challenge other players.</p>
          : <>
              <input className="lobby-input" placeholder="Search username..." value={query} onChange={e => setQuery(e.target.value)} />
              {results.map(u => (
                <div key={u._id} className="lobby-row">
                  <span>{u.username}</span>
                  <span className="lobby-muted">W{u.stats.wins} L{u.stats.losses}</span>
                  <button className="lobby-btn" onClick={() => challenge(u._id.$oid ?? u._id)}>Challenge</button>
                </div>
              ))}
            </>
        }
      </div>

      {pending.filter(g => g.players[2] === currentUser.id).length > 0 && (
        <div className="lobby-section">
          <h2 className="lobby-h2">Incoming challenges</h2>
          {pending.filter(g => g.players[2] === currentUser.id).map(g => (
            <div key={g._id} className="lobby-row">
              <span>From {g.players[1].slice(-6)}</span>
              <button className="lobby-btn" onClick={() => accept(g._id)}>Accept</button>
              <button className="lobby-btn-secondary" onClick={() => onJoinGame(g._id)}>Watch</button>
            </div>
          ))}
        </div>
      )}

      {active.length > 0 && (
        <div className="lobby-section">
          <h2 className="lobby-h2">Active games</h2>
          {active.map(g => (
            <div key={g._id} className="lobby-row">
              <span>vs {g.players[g.players[1] === currentUser.id ? 2 : 1].slice(-6)}</span>
              <span className="lobby-muted">{g.currentTurn === (g.players[1] === currentUser.id ? 1 : 2) ? 'your turn' : 'their turn'}</span>
              <button className="lobby-btn" onClick={() => onJoinGame(g._id)}>Play</button>
            </div>
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <div className="lobby-section">
          <h2 className="lobby-h2">Recent results</h2>
          {finished.slice(0, 5).map(g => {
            const myNum = g.players[1] === currentUser.id ? 1 : 2;
            const won   = g.winner === myNum;
            return (
              <div key={g._id} className="lobby-row">
                <span style={{ color: won ? '#2a2' : '#c00', fontWeight: 'bold' }}>{won ? 'WIN' : 'LOSS'}</span>
                <button className="lobby-btn-secondary" onClick={() => onJoinGame(g._id)}>Review</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

Lobby.propTypes = {
  user: PropTypes.shape({
    id:       PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    stats:    PropTypes.shape({ wins: PropTypes.number, losses: PropTypes.number, gamesPlayed: PropTypes.number }),
  }).isRequired,
  onJoinGame: PropTypes.func.isRequired,
  onLogout:   PropTypes.func.isRequired,
};