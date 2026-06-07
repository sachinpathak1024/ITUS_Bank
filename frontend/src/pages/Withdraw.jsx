import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast';
import { useConfirmAction } from '../components/ConfirmAction';
import { useProfile } from '../components/ProfileContext';
import { formatCurrency } from '../utils';

const QUICK = [500, 1000, 2500, 5000];

const Withdraw = () => {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { confirm } = useConfirmAction();
  const { refresh: refreshProfile } = useProfile();

  useEffect(() => {
    api.get('/bank/account').then(({ data }) => setBalance(Number(data.balance)));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) { toast.error('Enter a valid amount'); return; }
    if (balance !== null && value > balance) { toast.error('Insufficient funds'); return; }

    confirm({
      title: 'Withdraw money',
      summary: [
        { label: 'Amount', value: formatCurrency(value) },
        { label: 'Balance after', value: formatCurrency((balance || 0) - value) },
      ],
      confirmLabel: 'Withdraw',
      onConfirm: async (pin) => {
        setLoading(true);
        try {
          const { data } = await api.post('/bank/withdraw', { amount: value, pin });
          if (!data.success) throw new Error(data.message || 'Withdrawal failed');
          toast.success(`Withdrew ${formatCurrency(value)} — new balance ${formatCurrency(data.balance)}`);
          refreshProfile();
          navigate('/dashboard');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Withdraw Money</div>
        <div className="page-subtitle">
          {balance !== null && (
            <>Available balance: <strong>{formatCurrency(balance)}</strong></>
          )}
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
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
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <div className="form-help" style={{ marginBottom: 8 }}>Quick amounts</div>
            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
              {QUICK.map((q) => (
                <button
                  type="button"
                  key={q}
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAmount(String(q))}
                >
                  ₹{q.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-warning btn-block" disabled={loading} style={{ color: '#fff' }}>
            {loading ? <span className="spinner" /> : 'Withdraw'}
          </button>
        </form>
      </div>
    </>
  );
};

export default Withdraw;
