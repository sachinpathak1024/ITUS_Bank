import React, { useEffect, useState } from 'react';
import api from '../api';
import { formatDate } from '../utils';

const LoginHistory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bank/security/login-history')
      .then(({ data }) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="page-title">Login Activity</div>
        <div className="page-subtitle">Last 30 login attempts on your account</div>
      </div>

      <div className="card">
        {loading ? (
          <div className="page-loading">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔐</div>
            <div>No login records yet</div>
          </div>
        ) : (
          <table className="lh-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Result</th>
                <th>IP</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{formatDate(i.occurredAt)}</td>
                  <td>
                    <span className={`badge ${i.success ? 'badge-deposit' : 'badge-sent'}`}>
                      {i.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: 13 }}>{i.ip || '—'}</td>
                  <td className="text-muted" style={{ fontSize: 12 }}>{i.userAgent || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .lh-table { width: 100%; border-collapse: collapse; }
        .lh-table th {
          text-align: left;
          font-size: 11px;
          color: var(--itus-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--itus-border);
        }
        .lh-table td { padding: 12px; font-size: 13.5px; border-bottom: 1px solid var(--itus-border); }
        .lh-table tr:last-child td { border-bottom: none; }
      `}</style>
    </>
  );
};

export default LoginHistory;
