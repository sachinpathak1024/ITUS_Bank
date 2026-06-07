import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';
import { useConfirmAction } from '../components/ConfirmAction';
import { useProfile } from '../components/ProfileContext';
import { formatCurrency } from '../utils';

const TYPES = [
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'CHECKING', label: 'Checking' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'JOINT', label: 'Joint' },
];

const Accounts = () => {
  const [main, setMain] = useState(null);
  const [subs, setSubs] = useState([]);
  const [openForm, setOpenForm] = useState({ name: '', type: 'CHECKING', initialDeposit: '' });
  const [xferForm, setXferForm] = useState({ fromKind: 'MAIN', fromSubId: '', toKind: 'SUB', toSubId: '', amount: '' });
  const toast = useToast();
  const { confirm } = useConfirmAction();
  const { refresh: refreshProfile } = useProfile();

  const load = async () => {
    const { data } = await api.get('/bank/sub-accounts');
    setMain(data.main);
    setSubs(data.subs);
    if (data.subs.length > 0) {
      setXferForm((f) => ({ ...f, toSubId: f.toSubId || String(data.subs[0].id) }));
    }
  };

  useEffect(() => { load(); }, []);

  const submitOpen = (e) => {
    e.preventDefault();
    confirm({
      title: 'Open new account',
      subtitle: 'Confirm the details below',
      summary: [
        { label: 'Name', value: openForm.name || '—' },
        { label: 'Type', value: openForm.type },
        { label: 'Initial deposit', value: openForm.initialDeposit ? formatCurrency(openForm.initialDeposit) : '₹0.00' },
      ],
      confirmLabel: 'Open Account',
      onConfirm: async (pin) => {
        const { data } = await api.post('/bank/sub-accounts', {
          name: openForm.name,
          type: openForm.type,
          initialDeposit: openForm.initialDeposit ? parseFloat(openForm.initialDeposit) : 0,
          pin,
        });
        if (!data.success) throw new Error(data.message);
        toast.success('Account opened');
        setOpenForm({ name: '', type: 'CHECKING', initialDeposit: '' });
        load();
        refreshProfile();
      },
    });
  };

  const submitTransfer = (e) => {
    e.preventDefault();
    confirm({
      title: 'Internal transfer',
      summary: [
        { label: 'From', value: xferForm.fromKind === 'MAIN'
            ? 'Main Account'
            : (subs.find((s) => String(s.id) === xferForm.fromSubId)?.name || '—') },
        { label: 'To', value: xferForm.toKind === 'MAIN'
            ? 'Main Account'
            : (subs.find((s) => String(s.id) === xferForm.toSubId)?.name || '—') },
        { label: 'Amount', value: formatCurrency(xferForm.amount || 0) },
      ],
      confirmLabel: 'Transfer',
      onConfirm: async (pin) => {
        const { data } = await api.post('/bank/sub-accounts/transfer', {
          fromKind: xferForm.fromKind,
          fromSubId: xferForm.fromKind === 'SUB' ? parseInt(xferForm.fromSubId, 10) : null,
          toKind: xferForm.toKind,
          toSubId: xferForm.toKind === 'SUB' ? parseInt(xferForm.toSubId, 10) : null,
          amount: parseFloat(xferForm.amount),
          pin,
        });
        if (!data.success) throw new Error(data.message);
        toast.success('Transferred');
        setXferForm((f) => ({ ...f, amount: '' }));
        load();
        refreshProfile();
      },
    });
  };

  const closeSub = (sub) => {
    if (!window.confirm(`Close "${sub.name}"? Remaining ${formatCurrency(sub.balance)} returns to your main account.`)) return;
    api.delete(`/bank/sub-accounts/${sub.id}`).then(({ data }) => {
      if (data.success) {
        toast.success('Closed');
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
        <div className="page-title">My Accounts</div>
        <div className="page-subtitle">Manage your main and additional accounts</div>
      </div>

      <div className="acc-list">
        {main && (
          <div className="acc-card acc-main">
            <div className="acc-tag">MAIN · {main.type}</div>
            <div className="acc-name">Main Account</div>
            <div className="acc-num">A/C {main.accountNumber}</div>
            <div className="acc-bal">{formatCurrency(main.balance)}</div>
          </div>
        )}
        {subs.map((s) => (
          <div key={s.id} className="acc-card">
            <div className="acc-tag">{s.type}</div>
            <div className="acc-name">{s.name}</div>
            <div className="acc-num">A/C {s.accountNumber}</div>
            <div className="acc-bal">{formatCurrency(s.balance)}</div>
            <button className="btn btn-ghost btn-sm acc-close" onClick={() => closeSub(s)}>Close</button>
          </div>
        ))}
      </div>

      <div className="acc-grid">
        <div className="card">
          <div className="card-title">Open Additional Account</div>
          <div className="card-subtitle">You can have up to 5 additional accounts</div>
          <form onSubmit={submitOpen}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-control" value={openForm.name}
                       onChange={(e) => setOpenForm({ ...openForm, name: e.target.value })}
                       placeholder="e.g. Travel Fund" required />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={openForm.type}
                        onChange={(e) => setOpenForm({ ...openForm, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Initial deposit from main (optional)</label>
              <input type="number" min="0" step="0.01" className="form-control"
                     value={openForm.initialDeposit}
                     onChange={(e) => setOpenForm({ ...openForm, initialDeposit: e.target.value })}
                     placeholder="0.00" />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Open Account</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Move money between your accounts</div>
          <div className="card-subtitle">Instant, no fees</div>
          <form onSubmit={submitTransfer}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">From</label>
                <select className="form-select" value={xferForm.fromKind === 'MAIN' ? 'MAIN' : `S${xferForm.fromSubId}`}
                        onChange={(e) => {
                          if (e.target.value === 'MAIN') setXferForm({ ...xferForm, fromKind: 'MAIN', fromSubId: '' });
                          else setXferForm({ ...xferForm, fromKind: 'SUB', fromSubId: e.target.value.slice(1) });
                        }}>
                  <option value="MAIN">Main Account</option>
                  {subs.map((s) => <option key={s.id} value={`S${s.id}`}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">To</label>
                <select className="form-select" value={xferForm.toKind === 'MAIN' ? 'MAIN' : `S${xferForm.toSubId}`}
                        onChange={(e) => {
                          if (e.target.value === 'MAIN') setXferForm({ ...xferForm, toKind: 'MAIN', toSubId: '' });
                          else setXferForm({ ...xferForm, toKind: 'SUB', toSubId: e.target.value.slice(1) });
                        }}>
                  <option value="MAIN">Main Account</option>
                  {subs.map((s) => <option key={s.id} value={`S${s.id}`}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input type="number" min="1" step="0.01" className="form-control"
                     value={xferForm.amount}
                     onChange={(e) => setXferForm({ ...xferForm, amount: e.target.value })}
                     placeholder="0.00" required />
            </div>
            <button type="submit" className="btn btn-primary btn-block"
                    disabled={subs.length === 0}>Move Money</button>
            {subs.length === 0 && (
              <div className="form-help" style={{ marginTop: 8 }}>Open a sub-account first.</div>
            )}
          </form>
        </div>
      </div>

      <style>{`
        .acc-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }
        .acc-card {
          background: var(--itus-surface);
          border: 1px solid var(--itus-border);
          border-radius: 14px;
          padding: 18px;
          position: relative;
        }
        .acc-main {
          background: var(--itus-gradient);
          color: #fff;
          border: none;
        }
        .acc-tag {
          font-size: 10.5px;
          letter-spacing: 0.6px;
          font-weight: 700;
          opacity: 0.7;
          text-transform: uppercase;
        }
        .acc-name { font-size: 16px; font-weight: 700; margin-top: 4px; }
        .acc-num { font-size: 12px; opacity: 0.75; margin-top: 2px; }
        .acc-bal { font-size: 22px; font-weight: 700; margin-top: 12px; }
        .acc-close { margin-top: 12px; }
        .acc-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        @media (max-width: 900px) {
          .acc-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
};

export default Accounts;
