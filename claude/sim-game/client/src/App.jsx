import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import Game  from './pages/Game';
import { api } from './api';
import './App.css';

export default function App() {
  const [user,     setUser]     = useState(null);
  const [gameId,   setGameId]   = useState(null);
  const [gameOpts, setGameOpts] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      api.me()
        .then(setUser)
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function handleLogin(token, userData) {
    if (token) localStorage.setItem('token', token);
    setUser(userData);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    setUser(null);
    setGameId(null);
    setGameOpts(null);
  }

  function handleJoinGame(id, opts = {}) {
    setGameId(id);
    setGameOpts(opts);
  }

  if (loading) return <div className="app-loading">Loading...</div>;
  if (!user)   return <Login onLogin={handleLogin} />;
  if (gameId)  return <Game gameId={gameId} gameOpts={gameOpts} user={user} onLeave={() => { setGameId(null); setGameOpts(null); }} />;
  return <Lobby user={user} onJoinGame={handleJoinGame} onLogout={handleLogout} />;
}

Login.propTypes = { onLogin: PropTypes.func.isRequired };
Lobby.propTypes = {
  user: PropTypes.shape({
    id:       PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    stats:    PropTypes.shape({ wins: PropTypes.number, losses: PropTypes.number, gamesPlayed: PropTypes.number }),
  }).isRequired,
  onJoinGame: PropTypes.func.isRequired,
  onLogout:   PropTypes.func.isRequired,
};
Game.propTypes = {
  gameId:   PropTypes.string.isRequired,
  gameOpts: PropTypes.shape({ guest: PropTypes.bool }),
  user:     PropTypes.shape({ id: PropTypes.string.isRequired, username: PropTypes.string.isRequired }).isRequired,
  onLeave:  PropTypes.func.isRequired,
};