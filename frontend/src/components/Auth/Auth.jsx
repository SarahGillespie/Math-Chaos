import { useState } from "react";
import PropTypes from "prop-types";
import { authAPI } from "../../api/api.js";
import "./Auth.css";

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = isLogin
        ? await authAPI.login(username.trim(), password)
        : await authAPI.signup(username.trim(), password);

      localStorage.setItem("sim_username", res.user.username);
      onLogin(res.user.username);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/transparent-logo.png" alt="Math Chaos" />
          <div className="auth-logo-text">
            <span className="auth-logo-name">MathChaos</span>
            <span className="auth-logo-sub">Math Games with Bad Drawings</span>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? "active" : ""}`}
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
          >
            Log In
          </button>
          <button
            className={`auth-tab ${!isLogin ? "active" : ""}`}
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
          >
            Sign Up
          </button>
        </div>

        <div
          className="auth-fields"
          role="form"
          aria-label={isLogin ? "Login form" : "Sign up form"}
        >
          <div className="auth-field">
            <label htmlFor="auth-username" className="auth-label">
              Username
            </label>
            <input
              id="auth-username"
              className="auth-input"
              type="text"
              placeholder="Enter username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={20}
              autoFocus
              autoComplete="username"
              aria-required="true"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password" className="auth-label">
              Password
            </label>
            <input
              id="auth-password"
              className="auth-input"
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={50}
              autoComplete={isLogin ? "current-password" : "new-password"}
              aria-required="true"
            />
          </div>
        </div>

        {error && (
          <p className="auth-error" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        <button
          className="auth-submit-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : isLogin
              ? "Log In →"
              : "Create Account →"}
        </button>

        <p className="auth-switch">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button
            className="auth-switch-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}

Auth.propTypes = {
  onLogin: PropTypes.func.isRequired,
};
