import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const { login, loading, error, token, clearError } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard immediately if already authenticated
  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
    // Clear any store auth errors when opening login page
    clearError();
  }, [token, navigate, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!email.trim() || !password.trim()) {
      setValidationError('Please fill in all credentials.');
      return;
    }

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      // Error handled by store, hook catches thrown rejection
    }
  };

  const activeError = validationError || error;

  return (
    <div className="login-page-container">
      {/* Background Orbs */}
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>

      {/* Form Card */}
      <div className="login-card">
        <div className="brand-section">
          <h1>POS</h1>
          <p>POS Terminal Dashboard Login</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Error Banner */}
          {activeError && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{activeError}</span>
            </div>
          )}

          {/* Email input */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-container">
              <input
                id="email"
                type="email"
                placeholder="enter your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
              <Mail className="input-icon" size={18} />
            </div>
          </div>

          {/* Password input */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-container">
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <Lock className="input-icon" size={18} />
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
