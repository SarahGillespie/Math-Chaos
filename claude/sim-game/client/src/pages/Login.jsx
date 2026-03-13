import { useState } from 'react';
import PropTypes from 'prop-types';
import { api } from '../api';
import './Login.css';

const MODES = { login: 'Sign in', signup: 'Create account' };

export default function Login({ onLogin }) {
  const [mode,     setMode]     = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [err,      setErr]      = useState('');
  const [loading,  setLoading]  = useState(false);

  function switchMode(m) {
    setMode(m); setErr('');
    setUsername(''); setPassword(''); setConfirm('');
  }

  async function handleSubmit() {
    setErr('');
    if (!username.trim() || !password)
      return setErr('Username and password required.');
    if (mode === 'signup' && password !== confirm)
      return setErr('Passwords do not match.');

    setLoading(true);
    try {
      const { token, ...user } = mode === 'login'
        ? await api.login(username.trim(), password)
        : await api.signup(username.trim(), password);
      onLogin(token, user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleGuest() {
    const guestName = 'guest_' + Math.random().toString(36).slice(2, 7);
    onLogin(null, {
      id:       'guest',
      username: guestName,
      guest:    true,
      stats:    { wins: 0, losses: 0, gamesPlayed: 0 },
    });
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div className="login-wrap">
      <h1 className="login-title">SIM</h1>
      <p className="login-sub">the triangle game</p>

      <div className="login-card">
        {/* mode tabs */}
        <div className="login-tabs">
          {Object.entries(MODES).map(([m, label]) => (
            <button key={m}
              className={`login-tab ${mode === m ? 'login-tab-active' : ''}`}
              onClick={() => switchMode(m)}>
              {label}
            </button>
          ))}
        </div>

        {err && <div className="login-err">{err}</div>}

        <label className="login-label">Username</label>
        <input className="login-input" value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={handleKey} autoFocus />

        <label className="login-label">Password</label>
        <input className="login-input" type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKey} />

        {mode === 'signup' && (
          <>
            <label className="login-label">Confirm password</label>
            <input className="login-input" type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={handleKey} />
          </>
        )}

        <button className="login-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait…' : MODES[mode]}
        </button>

        <div className="login-divider"><span>or</span></div>

        <button className="login-guest-btn" onClick={handleGuest}>
          Continue as guest
        </button>
      </div>
    </div>
  );
}

Login.propTypes = { onLogin: PropTypes.func.isRequired };