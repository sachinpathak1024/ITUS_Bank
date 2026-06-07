import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast';
import { initials } from '../utils';

const Beneficiaries = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ recipientUsername: '', nickname: '' });
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bank/beneficiaries');
      setList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.recipientUsername.trim()) {
      toast.error('Username is required');
      return;
    }
    setAdding(true);
    try {
      const { data } = await api.post('/bank/beneficiaries', form);
      if (data.success) {
        toast.success('Beneficiary added');
        setForm({ recipientUsername: '', nickname: '' });
        load();
      } else {
        toast.error(data.message || 'Could not add beneficiary');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add beneficiary');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (b) => {
    if (!window.confirm(`Remove ${b.nickname || b.recipientUsername}?`)) return;
    try {
      const { data } = await api.delete(`/bank/beneficiaries/${b.id}`);
      if (data.success) {
        toast.success('Removed');
        load();
      } else {
        toast.error(data.message || 'Could not remove');
      }
    } catch {
      toast.error('Could not remove');
    }
  };

  const sendTo = (b) => {
    navigate('/transfer', { state: { beneficiaryId: b.id } });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Beneficiaries</div>
        <div className="page-subtitle">Save recipients for fast transfers</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }} className="bf-grid">
        <div className="card">
          <div className="card-title">Add Beneficiary</div>
          <div className="card-subtitle">Save someone you transfer to often</div>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label className="form-label">Recipient Username</label>
              <input
                type="text"
                className="form-control"
                value={form.recipientUsername}
                onChange={(e) => setForm({ ...form, recipientUsername: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nickname (optional)</label>
              <input
                type="text"
                className="form-control"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="e.g. Mom, Roommate"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={adding}>
              {adding ? <span className="spinner" /> : 'Add Beneficiary'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Saved ({list.length})</div>
              <div className="card-subtitle">Tap to send money</div>
            </div>
          </div>

          {loading ? (
            <div className="page-loading">Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">★</div>
              <div>No beneficiaries yet</div>
              <div className="form-help" style={{ marginTop: 6 }}>
                Add one to enable quick transfers.
              </div>
            </div>
          ) : (
            <div className="bf-list">
              {list.map((b) => (
                <div key={b.id} className="bf-row">
                  <div className="bf-avatar">{initials(b.nickname || b.recipientFullName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bf-name">{b.nickname || b.recipientFullName}</div>
                    <div className="bf-meta">
                      @{b.recipientUsername} · A/C {b.recipientAccountNumber}
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => sendTo(b)}>
                    Send
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(b)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .bf-list {
          display: flex;
          flex-direction: column;
        }
        .bf-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid var(--itus-border);
        }
        .bf-row:last-child {
          border-bottom: none;
        }
        .bf-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--itus-gradient);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }
        .bf-name {
          font-weight: 600;
        }
        .bf-meta {
          font-size: 12px;
          color: var(--itus-muted);
          margin-top: 2px;
        }
        @media (max-width: 900px) {
          .bf-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
};

export default Beneficiaries;
