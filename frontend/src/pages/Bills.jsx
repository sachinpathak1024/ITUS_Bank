import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';
import { useConfirmAction } from '../components/ConfirmAction';
import { useProfile } from '../components/ProfileContext';
import { formatCurrency, formatDate } from '../utils';

const CATEGORY_ICONS = {
  Electricity: '⚡',
  Internet: '🌐',
  Mobile: '📱',
  Water: '💧',
  Gas: '🔥',
  DTH: '📺',
  CreditCard: '💳',
};

const Bills = () => {
  const [catalog, setCatalog] = useState({});
  const [category, setCategory] = useState('');
  const [billerName, setBillerName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [bills, setBills] = useState([]);
  const [balance, setBalance] = useState(null);
  const [paying, setPaying] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirmAction();
  const { refresh: refreshProfile } = useProfile();

  const load = async () => {
    const [{ data: c }, { data: b }, { data: acc }] = await Promise.all([
      api.get('/bank/bills/billers'),
      api.get('/bank/bills'),
      api.get('/bank/account'),
    ]);
    setCatalog(c);
    setBills(b);
    setBalance(Number(acc.balance));
  };

  useEffect(() => {
    load();
  }, []);

  const handlePay = (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!category || !billerName || !value || value <= 0) {
      toast.error('Choose a category, biller, and amount');
      return;
    }
    confirm({
      title: 'Pay bill',
      summary: [
        { label: 'Biller', value: billerName },
        { label: 'Category', value: category },
        ...(billNumber ? [{ label: 'Bill #', value: billNumber }] : []),
        { label: 'Amount', value: formatCurrency(value) },
      ],
      confirmLabel: 'Pay Now',
      onConfirm: async (pin) => {
        setPaying(true);
        try {
          const { data } = await api.post('/bank/bills/pay', {
            category, billerName, billNumber, amount: value, pin,
          });
          if (!data.success) throw new Error(data.message || 'Payment failed');
          toast.success(`Paid ${formatCurrency(value)} to ${billerName}`);
          setAmount('');
          setBillNumber('');
          load();
          refreshProfile();
        } finally {
          setPaying(false);
        }
      },
    });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Pay Bills</div>
        <div className="page-subtitle">
          {balance !== null && (
            <>Available balance: <strong>{formatCurrency(balance)}</strong></>
          )}
        </div>
      </div>

      <div className="bills-grid">
        <div className="card">
          <div className="card-title">Categories</div>
          <div className="card-subtitle">Pick what you're paying</div>
          <div className="bill-categories">
            {Object.keys(catalog).map((c) => (
              <button
                key={c}
                className={`bill-category ${category === c ? 'bill-category-active' : ''}`}
                onClick={() => {
                  setCategory(c);
                  setBillerName('');
                }}
                type="button"
              >
                <div className="bill-cat-icon">{CATEGORY_ICONS[c] || '•'}</div>
                <div className="bill-cat-label">{c}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Pay {category || 'a bill'}</div>
          <div className="card-subtitle">
            {category ? 'Pick a biller and enter amount' : 'Select a category first'}
          </div>
          <form onSubmit={handlePay}>
            <div className="form-group">
              <label className="form-label">Biller</label>
              <select
                className="form-select"
                value={billerName}
                onChange={(e) => setBillerName(e.target.value)}
                disabled={!category}
                required
              >
                <option value="">{category ? 'Choose a biller…' : '—'}</option>
                {(catalog[category] || []).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Bill Number (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="e.g. CB12345"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (INR)</label>
                <input
                  type="number"
                  className="form-control"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={paying || !category}>
              {paying ? <span className="spinner" /> : 'Pay Now'}
            </button>
          </form>
        </div>
      </div>

      <div className="card mt-lg">
        <div className="card-title">Recent Bill Payments</div>
        <div className="card-subtitle">Last 20 bills paid</div>
        {bills.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <div>No bills paid yet</div>
          </div>
        ) : (
          <div className="bills-history">
            {bills.map((b) => (
              <div key={b.id} className="bills-row">
                <div className="bills-icon">{CATEGORY_ICONS[b.category] || '•'}</div>
                <div style={{ flex: 1 }}>
                  <div className="bills-name">{b.billerName}</div>
                  <div className="bills-meta">
                    {b.category}{b.billNumber ? ` · #${b.billNumber}` : ''} · {formatDate(b.paidAt)}
                  </div>
                </div>
                <div className="tx-amount tx-negative">−{formatCurrency(b.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .bills-grid {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 20px;
        }
        @media (max-width: 900px) {
          .bills-grid {
            grid-template-columns: 1fr;
          }
        }
        .bill-categories {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .bill-category {
          padding: 14px 10px;
          background: var(--itus-surface);
          border: 1px solid var(--itus-border);
          border-radius: 12px;
          cursor: pointer;
          text-align: center;
          color: var(--itus-text);
          transition: all 0.15s ease;
        }
        .bill-category:hover {
          border-color: var(--itus-primary-light);
        }
        .bill-category-active {
          background: var(--itus-gradient);
          color: #fff;
          border-color: transparent;
        }
        .bill-cat-icon {
          font-size: 22px;
          margin-bottom: 4px;
        }
        .bill-cat-label {
          font-size: 12.5px;
          font-weight: 600;
        }
        .bills-history {
          display: flex;
          flex-direction: column;
        }
        .bills-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--itus-border);
        }
        .bills-row:last-child { border-bottom: none; }
        .bills-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--itus-surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .bills-name { font-weight: 600; font-size: 14px; }
        .bills-meta { font-size: 12px; color: var(--itus-muted); margin-top: 2px; }
      `}</style>
    </>
  );
};

export default Bills;
