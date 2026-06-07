import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';
import { formatCurrency, formatDate } from '../utils';

const FREQUENCIES = [
  { value: 'ONCE', label: 'One-time' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const todayPlusOne = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString().slice(0, 16);
};

const Scheduled = () => {
  const [list, setList] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [form, setForm] = useState({
    recipientUsername: '',
    amount: '',
    description: '',
    frequency: 'MONTHLY',
    nextRun: todayPlusOne(),
  });
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const load = async () => {
    const [{ data: l }, { data: b }] = await Promise.all([
      api.get('/bank/scheduled-transfers'),
      api.get('/bank/beneficiaries'),
    ]);
    setList(l);
    setBeneficiaries(b);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post('/bank/scheduled-transfers', {
        ...form,
        amount: parseFloat(form.amount),
      });
      if (data.success) {
        toast.success('Scheduled');
        setForm({
          recipientUsername: '',
          amount: '',
          description: '',
          frequency: 'MONTHLY',
          nextRun: todayPlusOne(),
        });
        load();
      } else {
        toast.error(data.message || 'Could not schedule');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not schedule');
    } finally {
      setCreating(false);
    }
  };

  const cancel = async (st) => {
    if (!window.confirm(`Cancel scheduled transfer to ${st.recipientUsername}?`)) return;
    try {
      const { data } = await api.delete(`/bank/scheduled-transfers/${st.id}`);
      if (data.success) {
        toast.success('Cancelled');
        load();
      }
    } catch {
      toast.error('Could not cancel');
    }
  };

  const runNow = async (st) => {
    if (!window.confirm(`Send ${formatCurrency(st.amount)} to ${st.recipientUsername} now?`)) return;
    try {
      const { data } = await api.post(`/bank/scheduled-transfers/${st.id}/run-now`);
      if (data.success) {
        toast.success('Transfer sent');
        load();
      } else {
        toast.error(data.message || 'Could not run');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not run');
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Scheduled Transfers</div>
        <div className="page-subtitle">
          Plan transfers in advance. Tap "Run Now" to execute manually.
          <span className="text-muted" style={{ marginLeft: 6 }}>
            (Auto-execution is not yet enabled — coming later.)
          </span>
        </div>
      </div>

      <div className="sch-grid">
        <div className="card">
          <div className="card-title">New Schedule</div>
          <div className="card-subtitle">Pick a recipient and frequency</div>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Recipient</label>
              {beneficiaries.length > 0 ? (
                <>
                  <select
                    className="form-select"
                    value={form.recipientUsername}
                    onChange={(e) => setForm({ ...form, recipientUsername: e.target.value })}
                  >
                    <option value="">Choose beneficiary or type username…</option>
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.recipientUsername}>
                        {b.nickname} (@{b.recipientUsername})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="form-control"
                    style={{ marginTop: 8 }}
                    placeholder="…or type a username"
                    value={form.recipientUsername}
                    onChange={(e) => setForm({ ...form, recipientUsername: e.target.value })}
                  />
                </>
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder="Recipient username"
                  value={form.recipientUsername}
                  onChange={(e) => setForm({ ...form, recipientUsername: e.target.value })}
                  required
                />
              )}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  className="form-control"
                  step="0.01"
                  min="1"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Frequency</label>
                <select
                  className="form-select"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Next Run</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.nextRun}
                onChange={(e) => setForm({ ...form, nextRun: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input
                type="text"
                className="form-control"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Rent payment"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={creating}>
              {creating ? <span className="spinner" /> : 'Schedule Transfer'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Upcoming ({list.length})</div>
          <div className="card-subtitle">Scheduled or recurring</div>
          {list.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⌛</div>
              <div>Nothing scheduled yet</div>
            </div>
          ) : (
            <div className="sch-list">
              {list.map((st) => (
                <div key={st.id} className={`sch-row ${!st.active ? 'sch-done' : ''}`}>
                  <div style={{ flex: 1 }}>
                    <div className="sch-name">
                      {formatCurrency(st.amount)} → @{st.recipientUsername}
                      <span className={`sch-badge sch-badge-${st.frequency.toLowerCase()}`}>
                        {st.frequency}
                      </span>
                    </div>
                    <div className="sch-meta">
                      {st.description && <>{st.description} · </>}
                      Next: {formatDate(st.nextRun)}
                      {st.lastRun && <> · Last: {formatDate(st.lastRun)}</>}
                    </div>
                  </div>
                  <div className="flex gap-sm">
                    {st.active && (
                      <button className="btn btn-success btn-sm" onClick={() => runNow(st)}>
                        Run Now
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => cancel(st)}>
                      {st.active ? 'Cancel' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .sch-grid {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 20px;
        }
        @media (max-width: 900px) {
          .sch-grid {
            grid-template-columns: 1fr;
          }
        }
        .sch-list {
          display: flex;
          flex-direction: column;
        }
        .sch-row {
          padding: 14px 0;
          border-bottom: 1px solid var(--itus-border);
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .sch-row:last-child { border-bottom: none; }
        .sch-done { opacity: 0.65; }
        .sch-name {
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sch-meta {
          font-size: 12px;
          color: var(--itus-muted);
          margin-top: 3px;
        }
        .sch-badge {
          display: inline-block;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.4px;
        }
        .sch-badge-once { background: #fef3c7; color: #92400e; }
        .sch-badge-weekly { background: #dbeafe; color: #1e40af; }
        .sch-badge-monthly { background: #ecfdf5; color: #065f46; }
      `}</style>
    </>
  );
};

export default Scheduled;
