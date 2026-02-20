// src/components/Auth/Login.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import './Login.css';
import coffeeLogo from '../../images/MauKoffie-logo.png';

function Login() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword]               = useState('');
  const [error, setError]                     = useState('');
  const [loading, setLoading]                 = useState(false);
  const [visible, setVisible]                 = useState(false);
  const [showPassword, setShowPassword]       = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const role = await login(emailOrUsername, password);
      if      (role === 'admin')   navigate('/admin');
      else if (role === 'barista') navigate('/barista');
      else setError('Access denied. Invalid user role.');
    } catch {
      setError('Authentication failed. Please check your credentials.');
    }
    setLoading(false);
  }

  return (
    <div className={`lp-root ${visible ? 'lp-visible' : ''}`}>

      {/* Ambient orbs */}
      <div className="lp-orb lp-orb-1" />
      <div className="lp-orb lp-orb-2" />
      <div className="lp-orb lp-orb-3" />

      {/* ── Left: brand identity ── */}
      <aside className="lp-brand">
        <div className="lp-brand-inner">

          <div className="lp-logo-ring">
            <img src={coffeeLogo} alt="Matchalalu" />
          </div>

          <h1 className="lp-wordmark">Matchalalu</h1>
          <p className="lp-tagline">Excellence in Every Brew</p>

          <div className="lp-divider">
            <span /><span className="lp-dot" /><span />
          </div>

          <p className="lp-sub">Staff Portal</p>

        </div>
      </aside>

      {/* ── Right: login form ── */}
      <main className="lp-panel">
        <div className="lp-form-inner">

          <header className="lp-heading">
            <div className="lp-role-tag">◆ Staff Access</div>
            <h2>Welcome Back</h2>
            <p>Sign in to access your dashboard</p>
          </header>

          {error && (
            <div className="lp-error" role="alert">
              <span className="lp-error-icon">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="lp-form" noValidate>

            {/* Email / username */}
            <div className="lp-field">
              <label htmlFor="emailOrUsername">Email or Username</label>
              <div className="lp-input-wrap">
                <span className="lp-input-icon"><Mail size={15} strokeWidth={2} /></span>
                <input
                  type="text"
                  id="emailOrUsername"
                  value={emailOrUsername}
                  onChange={e => setEmailOrUsername(e.target.value)}
                  placeholder="Email or barista username"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="lp-field">
              <div className="lp-field-head">
                <label htmlFor="password">Password</label>
                <a href="#!" className="lp-forgot">Forgot password?</a>
              </div>
              <div className="lp-input-wrap">
                <span className="lp-input-icon"><Lock size={15} strokeWidth={2} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="lp-eye"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`lp-btn ${loading ? 'lp-btn-loading' : ''}`}
            >
              {loading
                ? <><span className="lp-spinner" />Signing In…</>
                : 'Sign In'}
            </button>

          </form>

          <p className="lp-footer">© {new Date().getFullYear()} Matchalalu · Staff Only</p>

        </div>
      </main>

    </div>
  );
}

export default Login;
