import React, { useEffect, useState } from 'react';
import api from '../api';
import { formatCurrency, formatDate, transactionMeta } from '../utils';

const TYPES = [
  { value: '', label: 'All' },
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
  { value: 'TRANSFER_SENT', label: 'Transfer Sent' },
  { value: 'TRANSFER_RECEIVED', label: 'Transfer Received' },
];

const PAGE_SIZE = 15;

const Transactions = () => {
  const [filters, setFilters] = useState({ type: '', search: '', start: '', end: '' });
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(false);

  const load = async (pageOverride = page) => {
    setLoading(true);
    try {
      const params = { page: pageOverride, size: PAGE_SIZE };
      if (filters.type) params.type = filters.type;
      if (filters.search) params.search = filters.search;
      if (filters.start) params.start = `${filters.start}T00:00:00`;
      if (filters.end) params.end = `${filters.end}T23:59:59`;
      const { data: res } = await api.get('/bank/transactions', { params });
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = (e) => {
    e?.preventDefault();
    setPage(0);
    load(0);
  };

  const resetFilters = () => {
    setFilters({ type: '', search: '', start: '', end: '' });
    setPage(0);
    setTimeout(() => load(0), 0);
  };

  const changePage = (delta) => {
    const next = Math.max(0, Math.min(data.totalPages - 1, page + delta));
    if (next === page) return;
    setPage(next);
    load(next);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Transactions</div>
        <div className="page-subtitle">All your account activity</div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <form
          onSubmit={applyFilters}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto auto', gap: 12, alignItems: 'end' }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Description…"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">From</label>
            <input
              type="date"
              className="form-control"
              value={filters.start}
              onChange={(e) => setFilters({ ...filters, start: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">To</label>
            <input
              type="date"
              className="form-control"
              value={filters.end}
              onChange={(e) => setFilters({ ...filters, end: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary">Apply</button>
          <button type="button" className="btn btn-ghost" onClick={resetFilters}>Reset</button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <div className="page-loading">Loading transactions…</div>
        ) : data.content.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">∅</div>
            <div>No transactions match your filters.</div>
          </div>
        ) : (
          <>
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((tx) => {
                  const meta = transactionMeta(tx.transactionType);
                  const badgeClass =
                    tx.transactionType === 'DEPOSIT'
                      ? 'badge-deposit'
                      : tx.transactionType === 'WITHDRAWAL'
                      ? 'badge-withdrawal'
                      : tx.transactionType === 'TRANSFER_SENT'
                      ? 'badge-sent'
                      : 'badge-received';
                  return (
                    <tr key={tx.id}>
                      <td className="text-muted">{formatDate(tx.createdAt)}</td>
                      <td>{tx.description || meta.label}</td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{meta.label}</span>
                      </td>
                      <td className={`tx-amount ${meta.color}`} style={{ textAlign: 'right' }}>
                        {meta.sign}
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="tx-pagination">
              <div className="text-muted" style={{ fontSize: 13 }}>
                Showing {data.content.length} of {data.totalElements} transactions
              </div>
              <div className="flex gap-sm">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => changePage(-1)}
                  disabled={page === 0}
                >
                  ← Prev
                </button>
                <span style={{ alignSelf: 'center', fontSize: 13 }}>
                  Page {page + 1} / {Math.max(1, data.totalPages)}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => changePage(1)}
                  disabled={page >= data.totalPages - 1}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .tx-table {
          width: 100%;
          border-collapse: collapse;
        }
        .tx-table th {
          text-align: left;
          font-size: 12px;
          color: var(--itus-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--itus-border);
        }
        .tx-table td {
          padding: 13px 12px;
          font-size: 14px;
          border-bottom: 1px solid var(--itus-border);
        }
        .tx-table tr:last-child td {
          border-bottom: none;
        }
        .tx-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--itus-border);
        }
        @media (max-width: 900px) {
          form[onsubmit] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </>
  );
};

export default Transactions;
