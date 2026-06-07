import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';
import { useConfirmAction } from '../components/ConfirmAction';
import { useProfile } from '../components/ProfileContext';
import { formatCurrency, formatDateShort } from '../utils';

const FixedDeposits = () => {
  const [rates, setRates] = useState({});
  const [fds, setFds] = useState([]);
  const [form, setForm] = useState({ principal: '', tenureMonths: 12 });
  const toast = useToast();
  const { confirm } = useConfirmAction();
  const { refresh: refreshProfile } = useProfile();

  const load = async () => {
    const [r, l] = await Promise.all([
      api.get('/bank/fds/rates'),
      api.get('/bank/fds'),
    ]);
    setRates(r.data);
    setFds(l.data);
  };

  useEffect(() => { load(); }, []);

  const tenures = Object.keys(rates).map(Number).sort((a, b) => a - b);
  const selectedRate = rates[form.tenureMonths];
  const projectedMaturity = (() => {
    const p = parseFloat(form.principal);
    if (!p || !selectedRate) return null;
    const r = Number(selectedRate) / 12 / 100;
    return p * Math.pow(1 + r, form.tenureMonths);
  })();

  const submit = (e) => {
    e.preventDefault();
    confirm({
      title: 'Open Fixed Deposit',
      summary: [
        { label: 'Principal', value: formatCurrency(form.principal) },
        { label: 'Tenure', value: form.tenureMonths + ' months' },
        { label: 'Rate', value: selectedRate + '% p.a.' },
        { label: 'Projected maturity', value: projectedMaturity ? formatCurrency(projectedMaturity) : '—' },
      ],
      confirmLabel: 'Open FD',
      onConfirm: async (pin) => {
        const { data } = await api.post('/bank/fds/open', {
          principal: parseFloat(form.principal),
          tenureMonths: parseInt(form.tenureMonths, 10),
          pin,
        });
        if (!data.success) throw new Error(data.message);
        toast.success('FD opened');
        setForm({ principal: '', tenureMonths: 12 });
        load();
        refreshProfile();
      },
    });
  };

  const mature = (fd) => {
    confirm({
      title: 'Mature FD',
      subtitle: 'Pays out full maturity amount as if matured naturally.',
      summary: [
        { label: 'FD #', value: fd.id },
        { label: 'Maturity', value: formatCurrency(fd.maturityAmount) },
      ],
      confirmLabel: 'Mature now',
      onConfirm: async () => {
        const { data } = await api.post(`/bank/fds/${fd.id}/mature`);
        if (!data.success) throw new Error(data.message);
        toast.success('Matured');
        load();
        refreshProfile();
      },
    });
  };

  const breakFd = (fd) => {
    confirm({
      title: 'Break FD early',
      subtitle: 'A 1% penalty applies to the principal.',
      summary: [
        { label: 'FD #', value: fd.id },
        { label: 'Principal', value: formatCurrency(fd.principal) },
        { label: 'Penalty (1%)', value: formatCurrency(Number(fd.principal) * 0.01) },
        { label: 'You receive', value: formatCurrency(Number(fd.principal) * 0.99) },
      ],
      confirmLabel: 'Break FD',
      onConfirm: async () => {
        const { data } = await api.post(`/bank/fds/${fd.id}/break`);
        if (!data.success) throw new Error(data.message);
        toast.success('FD broken');
        load();
        refreshProfile();
      },
    });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Fixed Deposits</div>
        <div className="page-subtitle">Lock in a guaranteed return</div>
      </div>

      <div className="fd-grid">
        <div className="card">
          <div className="card-title">Open new FD</div>
          <div className="card-subtitle">Pick a tenure to see the rate</div>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Principal (₹)</label>
              <input type="number" min="1000" step="100" className="form-control"
                     value={form.principal}
                     onChange={(e) => setForm({ ...form, principal: e.target.value })}
                     placeholder="0.00" required />
            </div>
            <div className="form-group">
              <label className="form-label">Tenure</label>
              <div className="fd-tenures">
                {tenures.map((t) => (
                  <button key={t} type="button"
                          className={`fd-tenure ${form.tenureMonths === t ? 'active' : ''}`}
                          onClick={() => setForm({ ...form, tenureMonths: t })}>
                    <div className="fd-t-m">{t}mo</div>
                    <div className="fd-t-r">{rates[t]}%</div>
                  </button>
                ))}
              </div>
            </div>
            {projectedMaturity && (
              <div className="alert alert-success">
                Projected maturity: <strong>{formatCurrency(projectedMaturity)}</strong>
                {' '} (+{formatCurrency(projectedMaturity - parseFloat(form.principal))} interest)
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block">Open FD</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Your FDs ({fds.length})</div>
          {fds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <div>No FDs yet</div>
            </div>
          ) : (
            <div className="fd-list">
              {fds.map((f) => (
                <div key={f.id} className="fd-row">
                  <div>
                    <div className="fd-amt">{formatCurrency(f.principal)} <span className="fd-tag">{f.status}</span></div>
                    <div className="fd-meta">
                      {f.tenureMonths}mo @ {f.interestRate}% · Matures {formatDateShort(f.maturityAt)}
                    </div>
                  </div>
                  <div className="fd-actions">
                    {f.status === 'ACTIVE' && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => mature(f)}>Mature</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => breakFd(f)}>Break</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .fd-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 18px;
        }
        @media (max-width: 900px) { .fd-grid { grid-template-columns: 1fr; } }
        .fd-tenures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .fd-tenure {
          padding: 12px;
          border: 1px solid var(--itus-border);
          border-radius: 10px;
          text-align: center;
          background: var(--itus-surface);
          color: var(--itus-text);
          cursor: pointer;
        }
        .fd-tenure.active {
          background: var(--itus-gradient);
          color: #fff;
          border-color: transparent;
        }
        .fd-t-m { font-weight: 700; }
        .fd-t-r { font-size: 12px; opacity: 0.85; margin-top: 2px; }
        .fd-list { display: flex; flex-direction: column; gap: 14px; }
        .fd-row {
          padding: 14px;
          border: 1px solid var(--itus-border);
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .fd-amt { font-weight: 700; }
        .fd-tag {
          font-size: 10px;
          background: var(--itus-surface-2);
          padding: 2px 8px;
          border-radius: 999px;
          margin-left: 6px;
          letter-spacing: 0.4px;
        }
        .fd-meta { font-size: 12px; color: var(--itus-muted); margin-top: 3px; }
        .fd-actions { display: flex; gap: 6px; }
      `}</style>
    </>
  );
};

export default FixedDeposits;
