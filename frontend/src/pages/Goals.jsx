import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';
import { useConfirmAction } from '../components/ConfirmAction';
import { useProfile } from '../components/ProfileContext';
import { formatCurrency, formatDateShort } from '../utils';

const ICONS = ['🏠', '🚗', '✈️', '🎓', '💍', '📱', '💼', '🎯'];

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ name: '', icon: '🎯', target: '', deadline: '' });
  const [contribution, setContribution] = useState({});
  const toast = useToast();
  const { confirm } = useConfirmAction();
  const { refresh: refreshProfile } = useProfile();

  const load = async () => {
    const { data } = await api.get('/bank/goals');
    setGoals(data);
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/bank/goals', {
        name: form.name,
        icon: form.icon,
        target: parseFloat(form.target),
        deadline: form.deadline || null,
      });
      if (data.success) {
        toast.success('Goal created');
        setForm({ name: '', icon: '🎯', target: '', deadline: '' });
        load();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const contribute = (goal) => {
    const amount = parseFloat(contribution[goal.id] || 0);
    if (!amount || amount <= 0) {
      toast.error('Enter an amount');
      return;
    }
    confirm({
      title: 'Contribute to goal',
      summary: [
        { label: 'Goal', value: goal.name },
        { label: 'Amount', value: formatCurrency(amount) },
        { label: 'New total', value: formatCurrency(Number(goal.saved) + amount) + ' / ' + formatCurrency(goal.target) },
      ],
      confirmLabel: 'Contribute',
      onConfirm: async (pin) => {
        const { data } = await api.post(`/bank/goals/${goal.id}/contribute`, { amount, pin });
        if (!data.success) throw new Error(data.message);
        toast.success('Added');
        setContribution((c) => ({ ...c, [goal.id]: '' }));
        load();
        refreshProfile();
      },
    });
  };

  const remove = (goal) => {
    if (!window.confirm(`Withdraw goal "${goal.name}"? ${formatCurrency(goal.saved)} returns to your balance.`)) return;
    api.delete(`/bank/goals/${goal.id}`).then(({ data }) => {
      if (data.success) {
        toast.success('Goal removed');
        load();
        refreshProfile();
      } else {
        toast.error(data.message);
      }
    });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Savings Goals</div>
        <div className="page-subtitle">Save for the things that matter</div>
      </div>

      <div className="goal-grid">
        <div className="card">
          <div className="card-title">New Goal</div>
          <div className="card-subtitle">Pick something you're saving for</div>
          <form onSubmit={create}>
            <div className="form-group">
              <label className="form-label">Goal name</label>
              <input className="form-control" value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })}
                     placeholder="e.g. Tokyo trip" required />
            </div>
            <div className="form-group">
              <label className="form-label">Icon</label>
              <div className="goal-icons">
                {ICONS.map((i) => (
                  <button key={i} type="button"
                          className={`goal-icon ${form.icon === i ? 'active' : ''}`}
                          onClick={() => setForm({ ...form, icon: i })}>{i}</button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Target</label>
                <input type="number" min="1" step="100" className="form-control"
                       value={form.target}
                       onChange={(e) => setForm({ ...form, target: e.target.value })}
                       placeholder="50000" required />
              </div>
              <div className="form-group">
                <label className="form-label">Deadline (optional)</label>
                <input type="date" className="form-control" value={form.deadline}
                       onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Create Goal</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Your goals ({goals.length})</div>
          {goals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <div>No goals yet</div>
            </div>
          ) : (
            <div className="goal-list">
              {goals.map((g) => {
                const pct = Math.min(100, (Number(g.saved) / Number(g.target)) * 100);
                const done = pct >= 100;
                return (
                  <div key={g.id} className="goal-row">
                    <div className="goal-head">
                      <div className="goal-title-row">
                        <span className="goal-emoji">{g.icon || '🎯'}</span>
                        <div>
                          <div className="goal-name">{g.name}</div>
                          <div className="goal-meta">
                            {formatCurrency(g.saved)} / {formatCurrency(g.target)}
                            {g.deadline && ` · by ${formatDateShort(g.deadline)}`}
                          </div>
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => remove(g)}>✕</button>
                    </div>
                    <div className="goal-bar">
                      <div className={`goal-fill ${done ? 'goal-done' : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                    {!done && (
                      <div className="goal-add">
                        <input type="number" min="1" step="100" className="form-control"
                               placeholder="Add amount"
                               value={contribution[g.id] || ''}
                               onChange={(e) => setContribution({ ...contribution, [g.id]: e.target.value })} />
                        <button className="btn btn-primary btn-sm" onClick={() => contribute(g)}>Add</button>
                      </div>
                    )}
                    {done && <div className="alert alert-success" style={{ marginBottom: 0 }}>🎉 Goal reached!</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .goal-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 18px;
        }
        @media (max-width: 900px) { .goal-grid { grid-template-columns: 1fr; } }
        .goal-icons { display: flex; gap: 8px; flex-wrap: wrap; }
        .goal-icon {
          width: 42px;
          height: 42px;
          border: 1px solid var(--itus-border);
          background: var(--itus-surface);
          border-radius: 10px;
          font-size: 20px;
          cursor: pointer;
        }
        .goal-icon.active {
          background: var(--itus-gradient);
          border-color: transparent;
        }
        .goal-list { display: flex; flex-direction: column; gap: 14px; }
        .goal-row { padding: 14px; border: 1px solid var(--itus-border); border-radius: 12px; }
        .goal-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .goal-title-row { display: flex; gap: 12px; align-items: center; }
        .goal-emoji { font-size: 24px; }
        .goal-name { font-weight: 700; }
        .goal-meta { font-size: 12px; color: var(--itus-muted); margin-top: 2px; }
        .goal-bar {
          height: 10px;
          background: var(--itus-surface-2);
          border-radius: 999px;
          overflow: hidden;
          margin: 12px 0;
        }
        .goal-fill {
          height: 100%;
          background: var(--itus-primary-light);
          transition: width 0.3s ease;
        }
        .goal-fill.goal-done { background: var(--itus-success); }
        .goal-add { display: flex; gap: 8px; }
        .goal-add .form-control { flex: 1; }
      `}</style>
    </>
  );
};

export default Goals;
