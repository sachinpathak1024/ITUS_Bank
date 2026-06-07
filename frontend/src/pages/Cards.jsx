import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils';

const NETWORKS = ['VISA', 'MASTERCARD', 'RUPAY'];
const NET_COLORS = {
  VISA: 'linear-gradient(135deg, #1a3a8e 0%, #2952cc 100%)',
  MASTERCARD: 'linear-gradient(135deg, #5a1c1c 0%, #c24a3a 100%)',
  RUPAY: 'linear-gradient(135deg, #0a3d62 0%, #1e5980 100%)',
};

const Cards = () => {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ type: 'DEBIT', network: 'VISA', dailyLimit: '25000', creditLimit: '100000' });
  const toast = useToast();

  const load = async () => {
    const { data } = await api.get('/bank/cards');
    setCards(data);
  };

  useEffect(() => { load(); }, []);

  const issue = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/bank/cards', {
        type: form.type,
        network: form.network,
        dailyLimit: parseFloat(form.dailyLimit),
        creditLimit: form.type === 'CREDIT' ? parseFloat(form.creditLimit) : null,
      });
      if (data.success) {
        toast.success(`${form.type} card issued`);
        load();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const toggleFreeze = async (card) => {
    const { data } = await api.post(`/bank/cards/${card.id}/freeze`, { frozen: !card.frozen });
    if (data.success) {
      toast.success(card.frozen ? 'Card unfrozen' : 'Card frozen');
      load();
    } else {
      toast.error(data.message);
    }
  };

  const updateLimit = async (card) => {
    const val = window.prompt(`New daily limit for card •••• ${card.cardNumber.slice(-4)}`, card.dailyLimit);
    if (!val) return;
    const { data } = await api.post(`/bank/cards/${card.id}/limit`, { dailyLimit: parseFloat(val) });
    if (data.success) {
      toast.success('Limit updated');
      load();
    } else {
      toast.error(data.message);
    }
  };

  const remove = async (card) => {
    if (!window.confirm(`Remove card ending ${card.cardNumber.slice(-4)}?`)) return;
    const { data } = await api.delete(`/bank/cards/${card.id}`);
    if (data.success) {
      toast.success('Card removed');
      load();
    } else {
      toast.error(data.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Cards</div>
        <div className="page-subtitle">Your virtual cards (demo · no real card numbers)</div>
      </div>

      <div className="cards-grid">
        {cards.map((c) => (
          <div key={c.id} className="vcard-wrap">
            <div className={`vcard ${c.frozen ? 'vcard-frozen' : ''}`}
                 style={{ background: NET_COLORS[c.network] || NET_COLORS.VISA }}>
              <div className="vcard-top">
                <div className="vcard-type">{c.type}</div>
                <div className="vcard-net">{c.network}</div>
              </div>
              <div className="vcard-num">{c.cardNumber}</div>
              <div className="vcard-bot">
                <div>
                  <div className="vcard-lab">CARDHOLDER</div>
                  <div className="vcard-val">{c.cardHolder}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="vcard-lab">EXPIRES</div>
                  <div className="vcard-val">{String(c.expiryMonth).padStart(2, '0')}/{String(c.expiryYear).slice(-2)}</div>
                </div>
              </div>
              {c.frozen && <div className="vcard-frozen-stamp">FROZEN</div>}
            </div>
            <div className="vcard-actions">
              <button className={`btn btn-sm ${c.frozen ? 'btn-success' : 'btn-ghost'}`}
                      onClick={() => toggleFreeze(c)}>
                {c.frozen ? 'Unfreeze' : 'Freeze'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => updateLimit(c)}>
                Limit: {formatCurrency(c.dailyLimit)}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(c)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div className="card-title">Issue a new card</div>
        <div className="card-subtitle">Mock card — not a real payment instrument</div>
        <form onSubmit={issue}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Network</label>
              <select className="form-select" value={form.network}
                      onChange={(e) => setForm({ ...form, network: e.target.value })}>
                {NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Daily limit</label>
              <input type="number" min="1" step="100" className="form-control"
                     value={form.dailyLimit}
                     onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} required />
            </div>
            {form.type === 'CREDIT' && (
              <div className="form-group">
                <label className="form-label">Credit limit</label>
                <input type="number" min="1" step="1000" className="form-control"
                       value={form.creditLimit}
                       onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-primary">Issue Card</button>
        </form>
      </div>

      <style>{`
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }
        .vcard {
          color: #fff;
          padding: 22px;
          border-radius: 16px;
          min-height: 200px;
          position: relative;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }
        .vcard-frozen { opacity: 0.7; }
        .vcard-top {
          display: flex;
          justify-content: space-between;
        }
        .vcard-type {
          font-size: 11px;
          letter-spacing: 0.5px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.15);
          padding: 3px 9px;
          border-radius: 999px;
        }
        .vcard-net { font-size: 14px; font-weight: 700; opacity: 0.9; }
        .vcard-num {
          font-family: 'Inter', monospace;
          font-size: 19px;
          letter-spacing: 2px;
          font-weight: 600;
          margin-top: 18px;
        }
        .vcard-bot { display: flex; justify-content: space-between; align-items: flex-end; }
        .vcard-lab { font-size: 9px; opacity: 0.7; letter-spacing: 0.6px; }
        .vcard-val { font-size: 13px; font-weight: 600; margin-top: 2px; }
        .vcard-frozen-stamp {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-12deg);
          font-size: 26px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.85);
          border: 4px solid rgba(255, 255, 255, 0.85);
          padding: 6px 18px;
          border-radius: 8px;
          letter-spacing: 4px;
          pointer-events: none;
        }
        .vcard-wrap { display: flex; flex-direction: column; gap: 10px; }
        .vcard-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .vcard-actions .btn {
          flex: 1;
          min-width: 0;
          padding: 8px 10px;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </>
  );
};

export default Cards;
