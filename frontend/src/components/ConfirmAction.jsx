import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api';
import './ConfirmAction.css';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [request, setRequest] = useState(null);
  const [pinSet, setPinSet] = useState(false);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const refresh = async () => {
      if (!localStorage.getItem('token')) {
        setPinSet(false);
        return;
      }
      try {
        const { data } = await api.get('/bank/security/pin-status');
        setPinSet(!!data.isSet);
      } catch {
        setPinSet(false);
      }
    };
    refresh();
    const onAuth = () => refresh();
    window.addEventListener('itus-auth-change', onAuth);
    return () => window.removeEventListener('itus-auth-change', onAuth);
  }, []);

  const close = () => {
    setRequest(null);
    setPin('');
    setError('');
  };

  /**
   * confirm({ title, summary: [{label, value}], onConfirm: (pin) => Promise })
   */
  const confirm = useCallback((opts) => {
    setRequest(opts);
    setPin('');
    setError('');
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (pinSet && !/^\d{4}$/.test(pin)) {
      setError('Enter your 4-digit PIN');
      return;
    }
    setSubmitting(true);
    try {
      await request.onConfirm(pinSet ? pin : null);
      close();
    } catch (err) {
      setError(err?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm, pinSet, refreshPinStatus: async () => {
      try { const { data } = await api.get('/bank/security/pin-status'); setPinSet(!!data.isSet); } catch {}
    } }}>
      {children}
      {request && (
        <div className="ca-backdrop" onClick={close}>
          <div className="ca-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ca-title">{request.title || 'Confirm action'}</div>
            {request.subtitle && <div className="ca-subtitle">{request.subtitle}</div>}

            {request.summary && (
              <div className="ca-summary">
                {request.summary.map((row, i) => (
                  <div key={i} className="ca-row">
                    <div className="ca-label">{row.label}</div>
                    <div className="ca-value">{row.value}</div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {pinSet && (
                <div className="form-group">
                  <label className="form-label">Enter your 4-digit PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    className="form-control"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    autoFocus
                  />
                </div>
              )}
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="ca-actions">
                <button type="button" className="btn btn-ghost" onClick={close} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : (request.confirmLabel || 'Confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirmAction = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirmAction must be inside ConfirmProvider');
  return ctx;
};
