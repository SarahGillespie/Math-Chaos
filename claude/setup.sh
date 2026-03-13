#!/usr/bin/env bash
set -e
mkdir -p sim-game/server/middleware sim-game/server/routes \
         sim-game/client/src/pages sim-game/client/public

cd sim-game

# ── .gitignore ────────────────────────────────────────────────────────────────
cat > .gitignore << 'EOF'
node_modules
.env
client/build
EOF

# ── .env ──────────────────────────────────────────────────────────────────────
cat > .env << 'EOF'
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/sim
JWT_SECRET=replace_with_a_long_random_string
PORT=3001
EOF

# ── package.json (root) ───────────────────────────────────────────────────────
cat > package.json << 'EOF'
{
  "name": "sim-game",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "nodemon server/index.js",
    "client": "cd client && npm start",
    "install:all": "npm install && cd client && npm install"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongodb": "^6.7.0"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "nodemon": "^3.1.3"
  }
}
EOF

# ── server/index.js ───────────────────────────────────────────────────────────
cat > server/index.js << 'EOF'
require('dotenv').config();
const express = require('express');
const { connectDB } = require('./db');

const app = express();
app.use(express.json());

app.use('/api/auth',  require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/games', require('./routes/games'));

const PORT = process.env.PORT || 3001;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server on :${PORT}`));
});
EOF

# ── server/db.js ──────────────────────────────────────────────────────────────
cat > server/db.js << 'EOF'
const { MongoClient } = require('mongodb');

let db;

async function connectDB() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db();
  console.log('Connected to MongoDB');
}

function getDB() {
  if (!db) throw new Error('DB not connected');
  return db;
}

module.exports = { connectDB, getDB };
EOF

# ── server/middleware/auth.js ─────────────────────────────────────────────────
cat > server/middleware/auth.js << 'EOF'
const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Missing token' });

  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
EOF

# ── server/routes/auth.js ─────────────────────────────────────────────────────
cat > server/routes/auth.js << 'EOF'
const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { getDB } = require('../db');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  const user = await getDB().collection('users').findOne({ username });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { id: user._id.toString(), username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, username: user.username, id: user._id });
});

router.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  const existing = await getDB().collection('users').findOne({ username });
  if (existing) return res.status(409).json({ error: 'Username already taken' });
  const passwordHash = await bcrypt.hash(password, 6);
  const user = {
    username,
    passwordHash,
    memberSince: new Date(),
    lastPlayed:  new Date(),
    stats: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 },
    friends: [],
  };
  const { insertedId } = await getDB().collection('users').insertOne(user);
  const token = jwt.sign(
    { id: insertedId.toString(), username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.status(201).json({ token, username, id: insertedId });
});

module.exports = router;
EOF

# ── server/routes/users.js ────────────────────────────────────────────────────
cat > server/routes/users.js << 'EOF'
const router       = require('express').Router();
const { ObjectId } = require('mongodb');
const bcrypt       = require('bcrypt');
const requireAuth  = require('../middleware/auth');
const { getDB }    = require('../db');

router.get('/me', requireAuth, async (req, res) => {
  const user = await getDB().collection('users').findOne(
    { _id: new ObjectId(req.user.id) },
    { projection: { passwordHash: 0 } }
  );
  res.json(user);
});

router.patch('/me', requireAuth, async (req, res) => {
  const { username, password } = req.body;
  const update = {};
  if (username) {
    const taken = await getDB().collection('users').findOne({ username });
    if (taken) return res.status(409).json({ error: 'Username already taken' });
    update.username = username;
  }
  if (password) {
    update.passwordHash = await bcrypt.hash(password, 6);
  }
  if (!Object.keys(update).length)
    return res.status(400).json({ error: 'Nothing to update' });

  await getDB().collection('users').updateOne(
    { _id: new ObjectId(req.user.id) },
    { $set: update }
  );
  res.json({ ok: true });
});

router.delete('/me', requireAuth, async (req, res) => {
  await getDB().collection('users').deleteOne({ _id: new ObjectId(req.user.id) });
  res.json({ ok: true });
});

router.get('/search', requireAuth, async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);
  const users = await getDB().collection('users')
    .find(
      { username: { $regex: `^${q}`, $options: 'i' } },
      { projection: { username: 1, stats: 1 } }
    )
    .limit(10).toArray();
  res.json(users);
});

module.exports = router;
EOF

# ── server/routes/games.js ────────────────────────────────────────────────────
cat > server/routes/games.js << 'EOF'
const router       = require('express').Router();
const { ObjectId } = require('mongodb');
const requireAuth  = require('../middleware/auth');
const { getDB }    = require('../db');

function edgeKey(a, b) { return [Math.min(a,b), Math.max(a,b)].join('-'); }

function detectTriangle(edges, player) {
  for (let a = 0; a < 6; a++)
    for (let b = a+1; b < 6; b++)
      for (let c = b+1; c < 6; c++) {
        if (
          edges[edgeKey(a,b)] === player &&
          edges[edgeKey(b,c)] === player &&
          edges[edgeKey(a,c)] === player
        ) return [a, b, c];
      }
  return null;
}

async function updateStats(db, winnerId, loserId) {
  const col = db.collection('users');
  await col.updateOne({ _id: new ObjectId(winnerId) },
    { $inc: { 'stats.wins': 1, 'stats.gamesPlayed': 1 } });
  await col.updateOne({ _id: new ObjectId(loserId) },
    { $inc: { 'stats.losses': 1, 'stats.gamesPlayed': 1 } });
}

router.post('/', requireAuth, async (req, res) => {
  const { opponentId } = req.body;
  if (!opponentId) return res.status(400).json({ error: 'opponentId required' });
  const game = {
    players: { 1: req.user.id, 2: opponentId },
    edges: {},
    currentTurn: 1,
    status: 'pending',
    winner: null,
    losingTriangle: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const { insertedId } = await getDB().collection('games').insertOne(game);
  res.json({ gameId: insertedId });
});

router.get('/mine', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const games = await getDB().collection('games')
    .find({ $or: [{ 'players.1': uid }, { 'players.2': uid }] })
    .sort({ updatedAt: -1 })
    .limit(20).toArray();
  res.json(games);
});

router.get('/:id', requireAuth, async (req, res) => {
  const game = await getDB().collection('games')
    .findOne({ _id: new ObjectId(req.params.id) });
  if (!game) return res.status(404).json({ error: 'Not found' });
  res.json(game);
});

router.post('/:id/accept', requireAuth, async (req, res) => {
  const db   = getDB();
  const game = await db.collection('games').findOne({ _id: new ObjectId(req.params.id) });
  if (!game) return res.status(404).json({ error: 'Not found' });
  if (game.players[2] !== req.user.id)
    return res.status(403).json({ error: 'Not your game' });
  if (game.status !== 'pending')
    return res.status(400).json({ error: 'Already started' });
  await db.collection('games').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: 'active', updatedAt: new Date() } }
  );
  res.json({ ok: true });
});

router.post('/:id/move', requireAuth, async (req, res) => {
  const db   = getDB();
  const game = await db.collection('games').findOne({ _id: new ObjectId(req.params.id) });
  if (!game) return res.status(404).json({ error: 'Not found' });
  if (game.status !== 'active')
    return res.status(400).json({ error: 'Game not active' });

  const playerNum = game.players[1] === req.user.id ? 1
                  : game.players[2] === req.user.id ? 2
                  : null;
  if (!playerNum)             return res.status(403).json({ error: 'Not a player' });
  if (playerNum !== game.currentTurn)
    return res.status(400).json({ error: 'Not your turn' });

  const { dotA, dotB } = req.body;
  if (dotA === undefined || dotB === undefined || dotA === dotB)
    return res.status(400).json({ error: 'Invalid dots' });

  const key = edgeKey(dotA, dotB);
  if (game.edges[key]) return res.status(400).json({ error: 'Edge already drawn' });

  const newEdges = { ...game.edges, [key]: playerNum };
  const tri      = detectTriangle(newEdges, playerNum);
  const finished = !!tri;
  const winner   = finished ? (playerNum === 1 ? 2 : 1) : null;

  await getDB().collection('games').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: {
      edges: newEdges,
      currentTurn: playerNum === 1 ? 2 : 1,
      updatedAt: new Date(),
      ...(finished && { status: 'finished', winner, losingTriangle: tri }),
    }}
  );

  if (finished) await updateStats(db, game.players[winner], game.players[playerNum]);
  res.json({ ok: true, finished, winner });
});

module.exports = router;
EOF

# ── client/package.json ───────────────────────────────────────────────────────
cat > client/package.json << 'EOF'
{
  "name": "sim-client",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "prop-types": "^15.8.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "proxy": "http://localhost:3001"
}
EOF

# ── client/vercel.json ────────────────────────────────────────────────────────
cat > client/vercel.json << 'EOF'
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-render-app.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
EOF

# ── client/public/index.html ──────────────────────────────────────────────────
cat > client/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>SIM</title></head>
  <body><div id="root"></div></body>
</html>
EOF

# ── client/src/index.jsx ──────────────────────────────────────────────────────
cat > client/src/index.jsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
EOF

# ── client/src/api.js ─────────────────────────────────────────────────────────
cat > client/src/api.js << 'EOF'
const BASE = '/api';

function token() { return localStorage.getItem('token'); }

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login:       (username, password) => req('/auth/login',  { method: 'POST', body: { username, password } }),
  signup:      (username, password) => req('/auth/signup', { method: 'POST', body: { username, password } }),
  me:          ()                   => req('/users/me'),
  updateMe:    (data)               => req('/users/me', { method: 'PATCH', body: data }),
  deleteMe:    ()                   => req('/users/me', { method: 'DELETE' }),
  searchUsers: (q)                  => req(`/users/search?q=${encodeURIComponent(q)}`),
  myGames:     ()                   => req('/games/mine'),
  createGame:  (opponentId)         => req('/games', { method: 'POST', body: { opponentId } }),
  getGame:     (id)                 => req(`/games/${id}`),
  acceptGame:  (id)                 => req(`/games/${id}/accept`, { method: 'POST' }),
  makeMove:    (id, dotA, dotB)     => req(`/games/${id}/move`, { method: 'POST', body: { dotA, dotB } }),
};
EOF

# ── client/src/App.css ────────────────────────────────────────────────────────
cat > client/src/App.css << 'EOF'
.app-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: Georgia, serif;
  font-size: 1.2rem;
  color: #888;
}
EOF

# ── client/src/App.jsx ────────────────────────────────────────────────────────
cat > client/src/App.jsx << 'EOF'
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import Game  from './pages/Game';
import { api } from './api';
import './App.css';

export default function App() {
  const [user,    setUser]    = useState(null);
  const [gameId,  setGameId]  = useState(null);
  const [loading, setLoading] = useState(true);

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
    localStorage.setItem('token', token);
    setUser(userData);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    setUser(null);
    setGameId(null);
  }

  if (loading) return <div className="app-loading">Loading…</div>;
  if (!user)   return <Login onLogin={handleLogin} />;
  if (gameId)  return <Game gameId={gameId} user={user} onLeave={() => setGameId(null)} />;
  return <Lobby user={user} onJoinGame={setGameId} onLogout={handleLogout} />;
}

Login.propTypes = { onLogin: PropTypes.func.isRequired };
Lobby.propTypes = {
  user: PropTypes.shape({
    id:       PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    stats:    PropTypes.shape({
      wins:        PropTypes.number,
      losses:      PropTypes.number,
      gamesPlayed: PropTypes.number,
    }),
  }).isRequired,
  onJoinGame: PropTypes.func.isRequired,
  onLogout:   PropTypes.func.isRequired,
};
Game.propTypes = {
  gameId:  PropTypes.string.isRequired,
  user:    PropTypes.shape({ id: PropTypes.string.isRequired, username: PropTypes.string.isRequired }).isRequired,
  onLeave: PropTypes.func.isRequired,
};
EOF

# ── client/src/pages/Login.css ────────────────────────────────────────────────
cat > client/src/pages/Login.css << 'EOF'
.login-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#fdf6e3; font-family:Georgia,serif; }
.login-title { font-size:3rem; letter-spacing:0.3em; margin:0; }
.login-sub { color:#888; margin-bottom:2rem; }
.login-card { background:#fff; border-radius:12px; padding:2rem; box-shadow:0 4px 20px rgba(0,0,0,0.1); width:320px; display:flex; flex-direction:column; gap:8px; }
.login-tabs { display:flex; border-radius:8px; overflow:hidden; border:1px solid #ddd; margin-bottom:4px; }
.login-tab { flex:1; padding:8px; background:#f5f5f5; border:none; cursor:pointer; font-size:0.9rem; color:#666; }
.login-tab:first-child { border-right:1px solid #ddd; }
.login-tab-active { background:#222; color:#fff; }
.login-label { font-size:0.8rem; font-weight:bold; color:#555; }
.login-input { padding:8px 12px; border-radius:6px; border:1px solid #ddd; font-size:1rem; }
.login-btn { margin-top:8px; padding:10px; border-radius:6px; background:#222; color:#fff; border:none; cursor:pointer; font-size:1rem; }
.login-btn:disabled { opacity:0.6; cursor:not-allowed; }
.login-err { background:#fee; color:#c00; padding:8px 12px; border-radius:6px; font-size:0.9rem; }
.login-divider { display:flex; align-items:center; gap:8px; color:#bbb; font-size:0.8rem; margin:4px 0; }
.login-divider::before, .login-divider::after { content:''; flex:1; height:1px; background:#eee; }
.login-guest-btn { padding:10px; border-radius:6px; background:#fff; color:#555; border:1px solid #ddd; cursor:pointer; font-size:0.95rem; }
.login-guest-btn:hover { background:#f5f5f5; }
EOF

# ── client/src/pages/Login.jsx ────────────────────────────────────────────────
cat > client/src/pages/Login.jsx << 'EOF'
import { useState } from 'react';
import PropTypes from 'prop-types';
import { api } from '../api';
import './Login.css';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err,      setErr]      = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const { token, ...user } = await api.login(username, password);
      onLogin(token, user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="login-wrap">
      <h1 className="login-title">SIM</h1>
      <p className="login-sub">the triangle game</p>
      <div className="login-card">
        {err && <div className="login-err">{err}</div>}
        <label className="login-label">Username</label>
        <input className="login-input" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        <label className="login-label">Password</label>
        <input className="login-input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="login-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}

Login.propTypes = { onLogin: PropTypes.func.isRequired };
EOF

# ── client/src/pages/Lobby.css ────────────────────────────────────────────────
cat > client/src/pages/Lobby.css << 'EOF'
.lobby-wrap { max-width:480px; margin:0 auto; padding:1rem; font-family:Georgia,serif; }
.lobby-header { display:flex; align-items:center; gap:1rem; margin-bottom:1rem; padding:0.5rem 0; border-bottom:2px solid #eee; }
.lobby-username { font-weight:bold; flex:1; }
.lobby-stats { color:#888; font-size:0.85rem; }
.lobby-logout-btn { padding:4px 12px; border-radius:4px; border:1px solid #ccc; cursor:pointer; background:#fff; }
.lobby-edit-btn { padding:4px 12px; border-radius:4px; border:1px solid #aaa; cursor:pointer; background:#f5f5f5; font-size:0.85rem; }
.lobby-section { margin-bottom:1.5rem; }
.lobby-h2 { font-size:1rem; font-weight:bold; border-bottom:1px solid #eee; padding-bottom:4px; margin-bottom:8px; }
.lobby-input { width:100%; padding:8px 12px; border-radius:6px; border:1px solid #ddd; font-size:1rem; box-sizing:border-box; margin-bottom:8px; }
.lobby-row { display:flex; align-items:center; gap:0.75rem; padding:6px 0; border-bottom:1px solid #f5f5f5; }
.lobby-muted { color:#999; font-size:0.85rem; flex:1; }
.lobby-btn { padding:5px 14px; border-radius:4px; background:#222; color:#fff; border:none; cursor:pointer; font-size:0.9rem; }
.lobby-btn-secondary { padding:5px 14px; border-radius:4px; background:#aaa; color:#fff; border:none; cursor:pointer; font-size:0.9rem; }
.lobby-err { background:#fee; color:#c00; padding:8px 12px; border-radius:6px; margin-bottom:1rem; }
.profile-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:100; }
.profile-modal { background:#fff; border-radius:12px; padding:2rem; width:340px; display:flex; flex-direction:column; gap:10px; box-shadow:0 8px 32px rgba(0,0,0,0.2); }
.profile-modal h2 { margin:0 0 4px; font-size:1.1rem; }
.profile-modal label { font-size:0.8rem; font-weight:bold; color:#555; }
.profile-modal input { padding:8px 12px; border-radius:6px; border:1px solid #ddd; font-size:1rem; }
.profile-modal-actions { display:flex; gap:8px; margin-top:4px; }
.profile-save-btn { flex:1; padding:9px; border-radius:6px; background:#222; color:#fff; border:none; cursor:pointer; font-size:0.95rem; }
.profile-cancel-btn { flex:1; padding:9px; border-radius:6px; background:#eee; color:#333; border:none; cursor:pointer; font-size:0.95rem; }
.profile-delete-btn { width:100%; padding:9px; border-radius:6px; background:#fee; color:#c00; border:1px solid #fcc; cursor:pointer; font-size:0.95rem; margin-top:4px; }
EOF

# ── client/src/pages/Lobby.jsx ────────────────────────────────────────────────
cat > client/src/pages/Lobby.jsx << 'EOF'
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
          <button className="profile-save-btn"   onClick={handleSave}   disabled={loading}>Save</button>
          <button className="profile-cancel-btn" onClick={onClose}      disabled={loading}>Cancel</button>
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
  const [games,       setGames]       = useState([]);
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [err,         setErr]         = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  const loadGames = useCallback(() => {
    api.myGames().then(setGames).catch(console.error);
  }, []);

  useEffect(() => {
    loadGames();
    const t = setInterval(loadGames, 3000);
    return () => clearInterval(t);
  }, [loadGames]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      api.searchUsers(query).then(setResults).catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

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
      {editingProfile && (
        <ProfileModal
          user={currentUser}
          onSave={u => { setCurrentUser(c => ({ ...c, username: u })); setEditingProfile(false); }}
          onDelete={onLogout}
          onClose={() => setEditingProfile(false)}
        />
      )}
      <div className="lobby-header">
        <span className="lobby-username">👤 {currentUser.username}</span>
        <span className="lobby-stats">W {currentUser.stats?.wins ?? 0} · L {currentUser.stats?.losses ?? 0} · G {currentUser.stats?.gamesPlayed ?? 0}</span>
        <button className="lobby-edit-btn" onClick={() => setEditingProfile(true)}>Edit profile</button>
        <button className="lobby-logout-btn" onClick={onLogout}>Log out</button>
      </div>
      {err && <div className="lobby-err">{err}</div>}
      <div className="lobby-section">
        <h2 className="lobby-h2">Challenge a player</h2>
        <input className="lobby-input" placeholder="Search username…" value={query} onChange={e => setQuery(e.target.value)} />
        {results.map(u => (
          <div key={u._id} className="lobby-row">
            <span>{u.username}</span>
            <span className="lobby-muted">W{u.stats.wins} L{u.stats.losses}</span>
            <button className="lobby-btn" onClick={() => challenge(u._id.$oid ?? u._id)}>Challenge</button>
          </div>
        ))}
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
              <span className="lobby-muted">{g.currentTurn === (g.players[1] === currentUser.id ? 1 : 2) ? '← your turn' : 'their turn'}</span>
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
                <span style={{ color: won ? '#2a2' : '#c00', fontWeight:'bold' }}>{won ? 'WIN' : 'LOSS'}</span>
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
EOF

# ── client/src/pages/Game.css ─────────────────────────────────────────────────
cat > client/src/pages/Game.css << 'EOF'
.game-wrap { display:flex; flex-direction:column; align-items:center; padding:1rem; font-family:Georgia,serif; background:#fdf6e3; min-height:100vh; }
.game-top-bar { display:flex; align-items:center; gap:1rem; width:100%; max-width:420px; margin-bottom:1rem; }
.game-back-btn { padding:4px 12px; border-radius:4px; border:1px solid #ccc; cursor:pointer; background:#fff; }
.game-status { flex:1; text-align:center; font-weight:bold; }
.game-player-label { font-size:0.85rem; }
.game-svg { background:#fff; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.12); }
.game-legend { display:flex; gap:24px; margin-top:16px; }
.game-legend-item { display:flex; align-items:center; gap:6px; transition:opacity 0.2s; }
.game-legend-bar { width:24px; height:3px; border-radius:2px; }
.game-accept-btn { margin-bottom:12px; padding:10px 32px; border-radius:999px; background:#2a2; color:#fff; border:none; cursor:pointer; font-size:1rem; }
.game-err { background:#fee; color:#c00; padding:8px 12px; border-radius:6px; margin-bottom:8px; }
.game-loading { text-align:center; margin-top:4rem; font-family:Georgia,serif; color:#888; }
EOF

# ── client/src/pages/Game.jsx ─────────────────────────────────────────────────
cat > client/src/pages/Game.jsx << 'EOF'
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { api } from '../api';
import './Game.css';

const NUM_DOTS = 6, SVG_SIZE = 400, CENTER = 200, ORBIT = 150;
const COLORS = { 1: '#3b82f6', 2: '#ef4444' };

function dotPos(i) {
  const a = (2 * Math.PI * i) / NUM_DOTS - Math.PI / 2;
  return { x: CENTER + ORBIT * Math.cos(a), y: CENTER + ORBIT * Math.sin(a) };
}
const DOTS = Array.from({ length: NUM_DOTS }, (_, i) => dotPos(i));
function eKey(a, b) { return [Math.min(a, b), Math.max(a, b)].join('-'); }

export default function Game({ gameId, user, onLeave }) {
  const [game,     setGame]     = useState(null);
  const [selected, setSelected] = useState(null);
  const [hovered,  setHovered]  = useState(null);
  const [err,      setErr]      = useState('');

  const fetchGame = useCallback(() => {
    api.getGame(gameId).then(setGame).catch(console.error);
  }, [gameId]);

  useEffect(() => {
    fetchGame();
    const t = setInterval(fetchGame, 1500);
    return () => clearInterval(t);
  }, [fetchGame]);

  if (!game) return <div className="game-loading">Loading game...</div>;

  const myNum     = game.players['1'] === user.id ? 1 : 2;
  const myTurn    = game.currentTurn === myNum && game.status === 'active';
  const isPending = game.status === 'pending';

  async function handleDotClick(i) {
    if (!myTurn || isPending) return;
    if (selected === null) { setSelected(i); return; }
    if (selected === i)    { setSelected(null); return; }
    const key = eKey(selected, i);
    if (game.edges[key]) { setSelected(i); return; }
    const a = selected;
    setSelected(null); setErr('');
    try { await api.makeMove(gameId, a, i); fetchGame(); }
    catch (e) { setErr(e.message); }
  }

  async function handleAccept() {
    try { await api.acceptGame(gameId); fetchGame(); }
    catch (e) { setErr(e.message); }
  }

  const hoverKey    = selected !== null && hovered !== null && hovered !== selected ? eKey(selected, hovered) : null;
  const showPreview = hoverKey && !game.edges[hoverKey] && myTurn;

  let statusMsg;
  if (isPending) statusMsg = myNum === 2 ? "You've been challenged - accept to start!" : 'Waiting for opponent to accept...';
  else if (game.status === 'finished') statusMsg = game.winner === myNum ? 'You win!' : 'You lose.';
  else statusMsg = myTurn ? 'Your turn' : "Opponent's turn...";

  return (
    <div className="game-wrap">
      <div className="game-top-bar">
        <button className="game-back-btn" onClick={onLeave}>Back</button>
        <span className="game-status">{statusMsg}</span>
        <span className="game-player-label">
          You are <span style={{ color: COLORS[myNum], fontWeight: 'bold' }}>{myNum === 1 ? 'Blue' : 'Red'}</span>
        </span>
      </div>
      {err && <div className="game-err">{err}</div>}
      {isPending && myNum === 2 && (
        <button className="game-accept-btn" onClick={handleAccept}>Accept challenge</button>
      )}
      <svg width={SVG_SIZE} height={SVG_SIZE} className="game-svg">
        {Object.entries(game.edges).map(([key, player]) => {
          const [a, b] = key.split('-').map(Number);
          const losing = game.losingTriangle?.includes(a) && game.losingTriangle?.includes(b);
          return <line key={key} x1={DOTS[a].x} y1={DOTS[a].y} x2={DOTS[b].x} y2={DOTS[b].y}
            stroke={COLORS[player]} strokeWidth={losing ? 5 : 2.5} opacity={0.9} />;
        })}
        {showPreview && (
          <line x1={DOTS[selected].x} y1={DOTS[selected].y} x2={DOTS[hovered].x} y2={DOTS[hovered].y}
            stroke={COLORS[myNum]} strokeWidth={2} strokeDasharray="6 4" opacity={0.45} />
        )}
        {game.losingTriangle && (
          <polygon points={game.losingTriangle.map(i => `${DOTS[i].x},${DOTS[i].y}`).join(' ')}
            fill={COLORS[game.winner === 1 ? 2 : 1]} fillOpacity={0.12} />
        )}
        {DOTS.map((pos, i) => (
          <g key={i} onClick={() => handleDotClick(i)}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: myTurn ? 'pointer' : 'default' }}>
            <circle cx={pos.x} cy={pos.y} r={18} fill="transparent" />
            <circle cx={pos.x} cy={pos.y} r={12}
              fill={selected === i ? COLORS[myNum] : '#fff'}
              stroke={selected === i ? COLORS[myNum] : '#444'} strokeWidth={2} />
            <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize="12"
              fill={selected === i ? '#fff' : '#333'}
              style={{ userSelect: 'none', pointerEvents: 'none' }}>{i + 1}</text>
          </g>
        ))}
      </svg>
      <div className="game-legend">
        {[1, 2].map(p => (
          <div key={p} className="game-legend-item"
            style={{ opacity: game.currentTurn === p && game.status === 'active' ? 1 : 0.4 }}>
            <div className="game-legend-bar" style={{ background: COLORS[p] }} />
            <span style={{ color: COLORS[p], fontWeight: 'bold' }}>{p === myNum ? 'You' : 'Opponent'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Game.propTypes = {
  gameId:  PropTypes.string.isRequired,
  user:    PropTypes.shape({ id: PropTypes.string.isRequired, username: PropTypes.string.isRequired }).isRequired,
  onLeave: PropTypes.func.isRequired,
};
EOF

echo ""
echo "✅ sim-game project created successfully!"
echo ""
echo "Next steps:"
echo "  1. cd sim-game"
echo "  2. Edit .env with your MONGO_URI and JWT_SECRET"
echo "  3. npm run install:all"
echo "  4. npm run dev"
