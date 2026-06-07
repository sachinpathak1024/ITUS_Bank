import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast';
import { useConfirmAction } from '../components/ConfirmAction';
import { useProfile } from '../components/ProfileContext';
import { formatCurrency } from '../utils';

const QUICK = [500, 1000, 2500, 5000, 10000];

const Deposit = () => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { confirm } = useConfirmAction();
  const { refresh: refreshProfile } = useProfile();

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) { toast.error('Enter a valid amount'); return; }

    confirm({
      title: 'Deposit money',
      summary: [{ label: 'Amount', value: formatCurrency(value) }],
      confirmLabel: 'Deposit',
      onConfirm: async (pin) => {
        setLoading(true);
        try {
          const { data } = await api.post('/bank/deposit', { amount: value, pin });
          if (!data.success) throw new Error(data.message || 'Deposit failed');
          toast.success(`Deposited ${formatCurrency(value)} — new balance ${formatCurrency(data.balance)}`);
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
        <div className="page-title">Deposit Money</div>
        <div className="page-subtitle">Add funds to your ITUS Bank account</div>
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

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Deposit'}
          </button>
        </form>
      </div>
    </>
  );
};

export default Deposit;
