import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { formatCurrency, formatDateShort, transactionMeta } from '../utils';
import './Dashboard.css';

const QUICK_ACTIONS = [
  { to: '/deposit', label: 'Deposit', icon: '↓' },
  { to: '/withdraw', label: 'Withdraw', icon: '↑' },
  { to: '/transfer', label: 'Transfer', icon: '⇄' },
  { to: '/chat', label: 'AI Help', icon: '✦' },
];

const Dashboard = () => {
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: acc }, { data: tx }] = await Promise.all([
          api.get('/bank/account'),
          api.get('/bank/transactions', { params: { page: 0, size: 5 } }),
        ]);
        if (!alive) return;
        setAccount(acc);
        setTransactions(tx.content || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="page-loading">Loading your dashboard…</div>;
  if (!account) return <div className="page-loading">Could not load account.</div>;

  const credits = transactions
    .filter((t) => ['DEPOSIT', 'TRANSFER_RECEIVED'].includes(t.transactionType))
    .reduce((s, t) => s + Number(t.amount), 0);
  const debits = transactions
    .filter((t) => ['WITHDRAWAL', 'TRANSFER_SENT'].includes(t.transactionType))
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Snapshot of your finances</div>
      </div>

      <div className="dashboard-grid">
        <div>
          <div className="balance-card">
            <div className="balance-label">Available Balance</div>
            <div className="balance-amount">{formatCurrency(account.balance)}</div>
            <div className="balance-meta">
              <div className="balance-meta-item">
                <div className="balance-meta-label">Account No.</div>
                <div className="balance-meta-value">{account.accountNumber}</div>
              </div>
              <div className="balance-meta-item">
                <div className="balance-meta-label">Type</div>
                <div className="balance-meta-value">{account.accountType}</div>
              </div>
              <div className="balance-meta-item">
                <div className="balance-meta-label">Holder</div>
                <div className="balance-meta-value">{account.fullName}</div>
              </div>
            </div>
          </div>

          <div className="quick-actions">
            {QUICK_ACTIONS.map((qa) => (
              <Link key={qa.to} to={qa.to} className="quick-action">
                <div className="quick-action-icon">{qa.icon}</div>
                <div className="quick-action-label">{qa.label}</div>
              </Link>
            ))}
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Recent Credits</div>
              <div className="stat-value text-success">{formatCurrency(credits)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Recent Debits</div>
              <div className="stat-value text-danger">{formatCurrency(debits)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Activity (5 recent)</div>
              <div className="stat-value">{transactions.length}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Your latest transactions</div>
            </div>
            <Link to="/transactions" className="btn btn-ghost btn-sm">View All</Link>
          </div>

          {transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">∅</div>
              <div>No transactions yet</div>
            </div>
          ) : (
            <div className="tx-list">
              {transactions.map((tx) => {
                const meta = transactionMeta(tx.transactionType);
                return (
                  <div key={tx.id} className="tx-row">
                    <div
                      className={`tx-icon ${
                        meta.sign === '+'
                          ? 'tx-icon-pos'
                          : meta.sign === '-'
                          ? 'tx-icon-neg'
                          : ''
                      }`}
                    >
                      {meta.icon}
                    </div>
                    <div className="tx-body">
                      <div className="tx-desc">{tx.description || meta.label}</div>
                      <div className="tx-date">{formatDateShort(tx.createdAt)}</div>
                    </div>
                    <div className={`tx-amount ${meta.color}`}>
                      {meta.sign}
                      {formatCurrency(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
