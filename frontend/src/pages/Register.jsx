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
      <h1>Open an account in<br />under a minute.</h1>
      <p>Get started with ₹10,000 in your wallet, instant transfers, AI banking help, and zero monthly fees.</p>
      <div className="auth-features">
        <div className="auth-feature">
          <div className="auth-feature-icon">🎁</div>
          <div className="auth-feature-title">₹10,000 starter</div>
          <div className="auth-feature-desc">Pre-loaded balance</div>
        </div>
        <div className="auth-feature">
          <div className="auth-feature-icon">⚡</div>
          <div className="auth-feature-title">Instant access</div>
          <div className="auth-feature-desc">No paperwork</div>
        </div>
        <div className="auth-feature">
          <div className="auth-feature-icon">⭐</div>
          <div className="auth-feature-title">Beneficiaries</div>
          <div className="auth-feature-desc">Save & reuse</div>
        </div>
      </div>
    </div>

    <div className="auth-footer-note">© ITUS Bank · Demo application</div>
  </aside>
);

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', formData);
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        notifyAuthChange();
        navigate('/dashboard');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthAside />
      <div className="auth-form-side">
        <h1 className="auth-form-title">Create your account</h1>
        <p className="auth-form-subtitle">Join ITUS Bank in seconds</p>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              name="password"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              required
            />
            <div className="form-help">At least 6 characters.</div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
