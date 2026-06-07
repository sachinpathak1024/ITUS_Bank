import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast';
import { useConfirmAction } from '../components/ConfirmAction';
import { useProfile } from '../components/ProfileContext';
import { formatCurrency } from '../utils';

const Transfer = () => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [mode, setMode] = useState('beneficiary'); // 'beneficiary' | 'username'
  const [recipientId, setRecipientId] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useConfirmAction();
  const { refresh: refreshProfile } = useProfile();

  useEffect(() => {
    Promise.all([
      api.get('/bank/beneficiaries'),
      api.get('/bank/account'),
    ]).then(([{ data: list }, { data: acc }]) => {
      setBeneficiaries(list);
      setBalance(Number(acc.balance));
      const prefill = location.state?.beneficiaryId;
      if (prefill) {
        setMode('beneficiary');
        setRecipientId(String(prefill));
      } else if (list.length === 0) {
        setMode('username');
      }
    });
  }, [location.state]);

  const resolvedUsername = () => {
    if (mode === 'username') return recipientUsername.trim();
    const b = beneficiaries.find((x) => String(x.id) === recipientId);
    return b ? b.recipientUsername : '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const username = resolvedUsername();
    const value = parseFloat(amount);
    if (!username) { toast.error('Choose or enter a recipient'); return; }
    if (!value || value <= 0) { toast.error('Enter a valid amount'); return; }
    if (balance !== null && value > balance) { toast.error('Insufficient funds'); return; }

    confirm({
      title: 'Send money',
      summary: [
        { label: 'To', value: '@' + username },
        { label: 'Amount', value: formatCurrency(value) },
        ...(description ? [{ label: 'Note', value: description }] : []),
      ],
      confirmLabel: 'Send',
      onConfirm: async (pin) => {
        setLoading(true);
        try {
          const { data } = await api.post('/bank/transfer', {
            recipientUsername: username, amount: value, description, pin,
          });
          if (!data.success) throw new Error(data.message || 'Transfer failed');
          toast.success(`Sent ${formatCurrency(value)} to ${username}`);
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
        <div className="page-title">Send Money</div>
        <div className="page-subtitle">
          {balance !== null && (
            <>Available balance: <strong>{formatCurrency(balance)}</strong></>
          )}
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="flex gap-sm mt-md" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'beneficiary' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('beneficiary')}
            disabled={beneficiaries.length === 0}
          >
            Saved Beneficiary
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'username' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('username')}
          >
            Enter Username
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'beneficiary' ? (
            <div className="form-group">
              <label className="form-label">Beneficiary</label>
              {beneficiaries.length === 0 ? (
                <div className="form-help">
                  No saved beneficiaries.{' '}
                  <Link to="/beneficiaries">Add one</Link> or switch to username.
                </div>
              ) : (
                <select
                  className="form-select"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  required
                >
                  <option value="">Choose a beneficiary…</option>
                  {beneficiaries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nickname} ({b.recipientUsername})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Recipient Username</label>
              <input
                type="text"
                className="form-control"
                value={recipientUsername}
                onChange={(e) => setRecipientUsername(e.target.value)}
                placeholder="e.g. johndoe"
                required
              />
            </div>
          )}

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

          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input
              type="text"
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lunch payment"
              maxLength={120}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Send Money'}
          </button>
        </form>
      </div>
    </>
  );
};

export default Transfer;
