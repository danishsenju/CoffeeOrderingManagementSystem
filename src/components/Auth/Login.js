// src/components/Auth/Login.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import './Login.css';
import coffeeLogo from '../../images/MauKoffie-logo.png';

function Login() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const role = await login(emailOrUsername, password);
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'barista') {
        navigate('/barista');
      } else {
        setError('Access denied. Invalid user role.');
      }
    } catch (err) {
      setError('Authentication failed. Please check your credentials.');
    }
    setLoading(false);
  }

  return (
    <div className={`login-container ${animateIn ? 'fade-in' : ''}`}>
      {/* Background orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      {/* Glass card */}
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo-wrap">
          <div className="login-logo-ring">
            <img src={coffeeLogo} alt="MauKoffie" />
          </div>
          <div className="login-brand">Matchalalu</div>
          <div className="login-role-badge">◆ Staff Access</div>
        </div>

        {/* Heading */}
        <div className="login-header">
          <h2>Welcome Back</h2>
          <p>Sign in to access your dashboard</p>
        </div>

        {/* Error */}
        {error && (
          <div className="login-error">
            <div className="login-error-icon">!</div>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label htmlFor="emailOrUsername">Email or Username</label>
            <div className="field-wrap">
              <span className="field-icon"><Mail size={16} /></span>
              <input
                type="text"
                id="emailOrUsername"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Email or barista username"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-field">
            <div className="password-label-row">
              <label htmlFor="password">Password</label>
              <a href="#!" className="forgot-password">Forgot password?</a>
            </div>
            <div className="field-wrap password-field">
              <span className="field-icon"><Lock size={16} /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="pass-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`login-button ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Signing In…
              </>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <div className="footer-divider" />
          <p>© {new Date().getFullYear()} Matchalalu · Staff Only</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
