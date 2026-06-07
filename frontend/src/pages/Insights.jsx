import React, { useEffect, useState } from 'react';
import api from '../api';
import { formatCurrency } from '../utils';

const Insights = () => {
  const [data, setData] = useState(null);
  const [months, setMonths] = useState(6);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get('/bank/insights', { params: { months } }).then(({ data }) => setData(data));
  }, [months]);

  const downloadStatement = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/bank/statement', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `itus-bank-statement.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  if (!data) return <div className="page-loading">Loading insights…</div>;

  const { stats, monthly, categories } = data;
  const maxBar = Math.max(
    1,
    ...monthly.map((m) => Math.max(Number(m.credits), Number(m.debits)))
  );
  const totalCat = categories.reduce((s, c) => s + Number(c.total), 0) || 1;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-title">Insights</div>
          <div className="page-subtitle">Where your money is moving</div>
        </div>
        <div className="flex gap-sm">
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
          <button className="btn btn-primary" onClick={downloadStatement} disabled={downloading}>
            {downloading ? <span className="spinner" /> : '↓ CSV Statement'}
          </button>
        </div>
      </div>

      <div className="stats-row" style={{ marginTop: 0 }}>
        <div className="stat-card">
          <div className="stat-label">Total Credits</div>
          <div className="stat-value text-success">{formatCurrency(stats.totalCredits)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Debits</div>
          <div className="stat-value text-danger">{formatCurrency(stats.totalDebits)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net</div>
          <div className="stat-value">
            {formatCurrency(Number(stats.totalCredits) - Number(stats.totalDebits))}
          </div>
        </div>
      </div>

      <div className="insights-grid">
        <div className="card">
          <div className="card-title">Monthly Flow</div>
          <div className="card-subtitle">Credits (green) vs Debits (red) — {months} months</div>
          <div className="ins-chart">
            {monthly.map((m) => (
              <div key={m.month} className="ins-bar-group">
                <div className="ins-bars">
                  <div
                    className="ins-bar ins-bar-credit"
                    style={{ height: `${(Number(m.credits) / maxBar) * 100}%` }}
                    title={`Credits: ${formatCurrency(m.credits)}`}
                  />
                  <div
                    className="ins-bar ins-bar-debit"
                    style={{ height: `${(Number(m.debits) / maxBar) * 100}%` }}
                    title={`Debits: ${formatCurrency(m.debits)}`}
                  />
                </div>
                <div className="ins-bar-label">{m.month.slice(5)}/{m.month.slice(2, 4)}</div>
              </div>
            ))}
          </div>
          <div className="ins-legend">
            <span className="ins-dot ins-dot-credit"></span> Credits
            <span style={{ marginLeft: 18 }} />
            <span className="ins-dot ins-dot-debit"></span> Debits
          </div>
        </div>

        <div className="card">
          <div className="card-title">Top Categories</div>
          <div className="card-subtitle">Lifetime distribution</div>
          {categories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">◇</div>
              <div>Not enough data yet</div>
            </div>
          ) : (
            <div className="ins-categories">
              {categories.map((c, i) => {
                const pct = (Number(c.total) / totalCat) * 100;
                return (
                  <div key={c.category} className="ins-category">
                    <div className="ins-cat-row">
                      <span>{c.category}</span>
                      <span>{formatCurrency(c.total)}</span>
                    </div>
                    <div className="ins-cat-bar">
                      <div
                        className="ins-cat-fill"
                        style={{
                          width: `${pct}%`,
                          background: `hsl(${(i * 47 + 200) % 360}, 65%, 55%)`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .insights-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 20px;
          margin-top: 18px;
        }
        @media (max-width: 1000px) {
          .insights-grid {
            grid-template-columns: 1fr;
          }
        }
        .ins-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          height: 240px;
          gap: 8px;
          padding: 14px 0 8px;
          border-bottom: 1px solid var(--itus-border);
        }
        .ins-bar-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          height: 100%;
        }
        .ins-bars {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 4px;
        }
        .ins-bar {
          width: 16px;
          min-height: 2px;
          border-radius: 4px 4px 0 0;
          transition: height 0.3s ease;
        }
        .ins-bar-credit { background: var(--itus-success); }
        .ins-bar-debit { background: var(--itus-danger); }
        .ins-bar-label {
          font-size: 11px;
          color: var(--itus-muted);
        }
        .ins-legend {
          display: flex;
          align-items: center;
          padding-top: 10px;
          font-size: 12px;
          color: var(--itus-muted);
        }
        .ins-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 6px;
          vertical-align: middle;
        }
        .ins-dot-credit { background: var(--itus-success); }
        .ins-dot-debit { background: var(--itus-danger); }

        .ins-categories {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 10px;
        }
        .ins-cat-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 5px;
        }
        .ins-cat-bar {
          height: 8px;
          background: var(--itus-surface-2);
          border-radius: 999px;
          overflow: hidden;
        }
        .ins-cat-fill {
          height: 100%;
          border-radius: 999px;
        }
      `}</style>
    </>
  );
};

export default Insights;
