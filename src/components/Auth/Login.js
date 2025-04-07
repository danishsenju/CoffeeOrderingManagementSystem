// src/components/Auth/Login.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';
import coffeeLogo from '../../images/MauKoffie-logo.png';
// Import the coffee beans background image
import coffeeBeansBg from '../../images/login-background.jpg';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Animation effect when component mounts
  useEffect(() => {
    setAnimateIn(true);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      const role = await login(email, password);
      
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'barista') {
        navigate('/barista');
      } else {
        setError('Invalid user role');
      }
    } catch (err) {
      setError('Authentication failed. Please verify your credentials.');
      console.error(err);
    }
    
    setLoading(false);
  }

  const togglePasswordVisibility = (e) => {
    e.preventDefault(); // Prevent form submission
    setShowPassword(!showPassword);
  };

  return (
    <div className={`login-container ${animateIn ? 'fade-in' : ''}`}>
      <div className="login-left">
        <div className="login-left-content">
          <div className="brand-logo">
            <img src={coffeeLogo} alt="Mau Koffie" />
          </div>
          <h1>Mau Koffie</h1>
          <p className="tagline">Dashboard</p>
          <div className="elite-badge">
            <span>STAFF ONLY</span>
          </div>
          <div className="coffee-quotes">
            <blockquote>"Santai, Tenang, Mantop👍"</blockquote>
            <cite>— Mau Koffie</cite>
          </div>
        </div>
      </div>
      
      <div className="login-right">
        <div className="login-form-container">
          <div className="premium-indicator">
            <span className="diamond-icon">◆</span>
            <span>STAFF ACCESS</span>
          </div>
          
          <div className="login-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your dashboard</p>
          </div>
          
          {error && (
            <div className="error-message">
              <span className="error-icon">!</span>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon">✉️</span>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <div className="password-label-row">
                <label htmlFor="password">Password</label>
                <a href="#" className="forgot-password">Forgot Password?</a>
              </div>
              
              <div className="input-with-icon password-field">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <div 
                  className="password-toggle-icon" 
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </div>
              </div>
            </div>
            
            <button 
              disabled={loading} 
              type="submit" 
              className={`login-button ${loading ? 'loading' : ''}`}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Verifying
                </>
              ) : 'Access Dashboard'}
            </button>
          </form>
          
          <div className="login-footer">
            <div className="footer-divider"></div>
            <p>© {new Date().getFullYear()} Mau Koffie • Only StafF Can Access</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;