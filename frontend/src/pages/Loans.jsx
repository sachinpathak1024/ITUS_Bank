import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';
import { useConfirmAction } from '../components/ConfirmAction';
import { useProfile } from '../components/ProfileContext';
import { formatCurrency } from '../utils';

const PURPOSES = [
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'HOME', label: 'Home' },
  { value: 'AUTO', label: 'Auto' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'BUSINESS', label: 'Business' },
];

const TENURES = [12, 24, 36, 60, 120, 180, 240];

const Loans = () => {
  const [rates, setRates] = useState({});
  const [loans, setLoans] = useState([]);
  const [form, setForm] = useState({ purpose: 'PERSONAL', principal: 100000, tenureMonths: 36 });
  const [emi, setEmi] = useState(null);
  const toast = useToast();
  const { confirm } = useConfirmAction();
  const { refresh: refreshProfile } = useProfile();

  const load = async () => {
    const [r, l] = await Promise.all([
      api.get('/bank/loans/rates'),
      api.get('/bank/loans'),
    ]);
    setRates(r.data);
    setLoans(l.data);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await api.post('/bank/loans/emi-calc', {
          purpose: form.purpose,
          principal: form.principal,
          tenureMonths: form.tenureMonths,
        });
        if (data.success) setEmi(data);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [form]);

  const apply = (e) => {
    e.preventDefault();
    confirm({
      title: 'Apply for loan',
      subtitle: 'Auto-approved for demo purposes',
      summary: [
        { label: 'Purpose', value: form.purpose },
        { label: 'Amount', value: formatCurrency(form.principal) },
        { label: 'Tenure', value: form.tenureMonths + ' months' },
        { label: 'Rate', value: (rates[form.purpose] || '?') + '% p.a.' },
        { label: 'EMI', value: emi ? formatCurrency(emi.emi) : '—' },
      ],
      confirmLabel: 'Apply & Disburse',
      onConfirm: async () => {
        const { data } = await api.post('/bank/loans/apply', {
          purpose: form.purpose,
          principal: parseFloat(form.principal),
          tenureMonths: parseInt(form.tenureMonths, 10),
        });
        if (!data.success) throw new Error(data.message);
        toast.success('Loan approved! Funds credited.');
        load();
        refreshProfile();
      },
    });
  };

  const payEmi = (loan) => {
    confirm({
      title: 'Pay EMI',
      summary: [
        { label: 'Loan', value: '#' + loan.id + ' · ' + loan.purpose },
        { label: 'EMI Amount', value: formatCurrency(loan.emiAmount) },
        { label: 'EMIs paid', value: loan.emisPaid + ' / ' + loan.tenureMonths },
      ],
      confirmLabel: 'Pay EMI',
      onConfirm: async () => {
        const { data } = await api.post(`/bank/loans/${loan.id}/pay-emi`);
        if (!data.success) throw new Error(data.message);
        toast.success('EMI paid');
        load();
        refreshProfile();
      },
    });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Loans</div>
        <div className="page-subtitle">Get a loan instantly · auto-approved for demo</div>
      </div>

      <div className="loan-grid">
        <div className="card">
          <div className="card-title">EMI Calculator</div>
          <div className="card-subtitle">See your monthly outflow before applying</div>
          <form onSubmit={apply}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Purpose</label>
                <select className="form-select" value={form.purpose}
                        onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                  {PURPOSES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label} ({rates[p.value] || '?'}%)
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tenure (months)</label>
                <select className="form-select" value={form.tenureMonths}
                        onChange={(e) => setForm({ ...form, tenureMonths: parseInt(e.target.value, 10) })}>
                  {TENURES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Amount: <strong>{formatCurrency(form.principal)}</strong></label>
              <input type="range" min="1000" max="5000000" step="1000"
                     value={form.principal}
                     onChange={(e) => setForm({ ...form, principal: parseInt(e.target.value, 10) })}
                     style={{ width: '100%' }} />
            </div>
            {emi && (
              <div className="emi-summary">
                <div>
                  <div className="emi-label">Monthly EMI</div>
                  <div className="emi-value">{formatCurrency(emi.emi)}</div>
                </div>
                <div>
                  <div className="emi-label">Total Payable</div>
                  <div className="emi-value">{formatCurrency(emi.totalPayable)}</div>
                </div>
                <div>
                  <div className="emi-label">Interest</div>
                  <div className="emi-value">{formatCurrency(Number(emi.totalPayable) - Number(form.principal))}</div>
                </div>
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block">Apply for Loan</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Your loans ({loans.length})</div>
          {loans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <div>No active loans</div>
            </div>
          ) : (
            <div className="loan-list">
              {loans.map((l) => {
                const pct = (l.emisPaid / l.tenureMonths) * 100;
                return (
                  <div key={l.id} className="loan-row">
                    <div className="loan-head">
                      <div>
                        <div className="loan-name">{l.purpose} · {formatCurrency(l.principal)}</div>
                        <div className="loan-meta">
                          {l.tenureMonths}mo @ {l.interestRate}% · EMI {formatCurrency(l.emiAmount)}
                        </div>
                      </div>
                      <span className={`badge ${l.status === 'CLOSED' ? 'badge-deposit' : 'badge-received'}`}>
                        {l.status}
                      </span>
                    </div>
                    <div className="loan-bar">
                      <div className="loan-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="loan-foot">
                      <span>{l.emisPaid}/{l.tenureMonths} EMIs paid · {formatCurrency(l.paidAmount)}/{formatCurrency(l.totalPayable)}</span>
                      {l.status === 'ACTIVE' && (
                        <button className="btn btn-primary btn-sm" onClick={() => payEmi(l)}>Pay EMI</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .loan-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        @media (max-width: 1000px) { .loan-grid { grid-template-columns: 1fr; } }
        .emi-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 14px 0;
          padding: 14px;
          background: var(--itus-surface-2);
          border-radius: 10px;
        }
        .emi-label { font-size: 11px; color: var(--itus-muted); text-transform: uppercase; }
        .emi-value { font-weight: 700; margin-top: 3px; }
        .loan-list { display: flex; flex-direction: column; gap: 16px; }
        .loan-row {
          padding: 14px;
          border: 1px solid var(--itus-border);
          border-radius: 12px;
        }
        .loan-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .loan-name { font-weight: 700; }
        .loan-meta { font-size: 12px; color: var(--itus-muted); margin-top: 3px; }
        .loan-bar {
          height: 8px;
          background: var(--itus-surface-2);
          border-radius: 999px;
          overflow: hidden;
          margin: 12px 0;
        }
        .loan-fill {
          height: 100%;
          background: var(--itus-success);
          transition: width 0.3s ease;
        }
        .loan-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--itus-muted);
        }
      `}</style>
    </>
  );
};

export default Loans;
