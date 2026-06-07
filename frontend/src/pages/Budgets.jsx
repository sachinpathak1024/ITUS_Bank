import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [spending, setSpending] = useState({});
  const [billers, setBillers] = useState({});
  const [form, setForm] = useState({ category: '', monthlyLimit: '' });
  const toast = useToast();

  const load = async () => {
    const [b, bl] = await Promise.all([
      api.get('/bank/budgets'),
      api.get('/bank/bills/billers'),
    ]);
    setBudgets(b.data.budgets || []);
    setSpending(b.data.spending || {});
    setBillers(bl.data || {});
  };

  useEffect(() => { load(); }, []);

  const categories = ['TRANSFER', 'WITHDRAWAL', ...Object.keys(billers)];

  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/bank/budgets', {
        category: form.category,
        monthlyLimit: parseFloat(form.monthlyLimit),
      });
      if (data.success) {
        toast.success('Budget saved');
        setForm({ category: '', monthlyLimit: '' });
        load();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Remove budget for ${b.category}?`)) return;
    const { data } = await api.delete(`/bank/budgets/${b.id}`);
    if (data.success) {
      toast.success('Removed');
      load();
    } else {
      toast.error(data.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Budgets</div>
        <div className="page-subtitle">Set monthly limits — we'll alert you at 80% and 100%</div>
      </div>

      <div className="bud-grid">
        <div className="card">
          <div className="card-title">New / Update Budget</div>
          <form onSubmit={save}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="">Choose category…</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Monthly limit (₹)</label>
              <input type="number" min="1" step="100" className="form-control"
                     value={form.monthlyLimit}
                     onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Save Budget</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">This month ({budgets.length})</div>
          {budgets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div>No budgets yet</div>
            </div>
          ) : (
            <div className="bud-list">
              {budgets.map((b) => {
                const spent = Number(spending[b.category] || 0);
                const limit = Number(b.monthlyLimit);
                const pct = Math.min(100, (spent / limit) * 100);
                const over = spent > limit;
                return (
                  <div key={b.id} className="bud-row">
                    <div className="bud-head">
                      <div>
                        <div className="bud-name">{b.category}</div>
                        <div className="bud-meta">
                          {formatCurrency(spent)} of {formatCurrency(limit)}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => remove(b)}>✕</button>
                    </div>
                    <div className="bud-bar">
                      <div className={`bud-fill ${over ? 'bud-over' : pct >= 80 ? 'bud-warn' : ''}`}
                           style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .bud-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 18px;
        }
        @media (max-width: 900px) { .bud-grid { grid-template-columns: 1fr; } }
        .bud-list { display: flex; flex-direction: column; gap: 14px; }
        .bud-row { padding: 14px; border: 1px solid var(--itus-border); border-radius: 12px; }
        .bud-head { display: flex; justify-content: space-between; align-items: flex-start; }
        .bud-name { font-weight: 700; }
        .bud-meta { font-size: 12px; color: var(--itus-muted); margin-top: 3px; }
        .bud-bar { height: 8px; background: var(--itus-surface-2); border-radius: 999px; margin-top: 10px; overflow: hidden; }
        .bud-fill { height: 100%; background: var(--itus-success); transition: width 0.3s ease; }
        .bud-fill.bud-warn { background: var(--itus-warning); }
        .bud-fill.bud-over { background: var(--itus-danger); }
      `}</style>
    </>
  );
};

export default Budgets;
