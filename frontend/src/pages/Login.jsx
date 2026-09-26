import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { notifyAuthChange } from '../components/ProfileContext';
import './Auth.css';

const AuthAside = () => (
  <aside className="auth-aside">
    <div className="auth-brand">
      <div className="auth-brand-logo">IB</div>
      <div>
        <div className="auth-brand-name">ITUS Bank</div>
        <div className="auth-brand-tag">Trusted online banking</div>
      </div>
    </div>

    <div className="auth-hero">
      <h1>Banking made simple,<br />and beautifully secure - ITUS.</h1>
      <p>Manage your money, transfer funds, save beneficiaries, and chat with our AI assistant — all in one place.</p>
      <div className="auth-features">
        <div className="auth-feature">
          <div className="auth-feature-icon">⚡</div>
          <div className="auth-feature-title">Instant Transfers</div>
          <div className="auth-feature-desc">Move money in seconds</div>
        </div>
        <div className="auth-feature">
          <div className="auth-feature-icon">🔒</div>
          <div className="auth-feature-title">Bank-grade Security</div>
          <div className="auth-feature-desc">JWT + encrypted</div>
        </div>
        <div className="auth-feature">
          <div className="auth-feature-icon">✦</div>
          <div className="auth-feature-title">AI Assistant</div>
          <div className="auth-feature-desc">Banking help 24/7</div>
        </div>
      </div>
    </div>

    <div className="auth-footer-note">© ITUS Bank · Demo application</div>
  </aside>
);

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { username, password });
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        notifyAuthChange();
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthAside />
      <div className="auth-form-side">
        <h1 className="auth-form-title">Welcome back</h1>
        <p className="auth-form-subtitle">Sign in to your ITUS Bank account</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <p className="auth-link">
          New to ITUS Bank? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
