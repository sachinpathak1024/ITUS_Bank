import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import { formatDateShort } from '../utils';
import './NotificationBell.css';

const TYPE_ICON = {
  DEPOSIT: '↓',
  WITHDRAWAL: '↑',
  TRANSFER: '⇄',
  BENEFICIARY: '★',
  BILL: '⚡',
  SYSTEM: 'i',
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get('/bank/notifications');
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch {}
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      try {
        await api.post('/bank/notifications/read-all');
        setUnread(0);
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {}
    }
  };

  return (
    <div className="nb-wrap" ref={ref}>
      <button className="nb-btn" onClick={toggle} aria-label="Notifications">
        <span className="nb-icon">🔔</span>
        {unread > 0 && <span className="nb-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="nb-panel">
          <div className="nb-header">
            <div className="nb-title">Notifications</div>
            <button className="nb-refresh" onClick={load} title="Refresh">↻</button>
          </div>
          <div className="nb-list">
            {items.length === 0 ? (
              <div className="nb-empty">No notifications yet</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`nb-item ${n.read ? '' : 'nb-unread'}`}>
                  <div className="nb-item-icon">{TYPE_ICON[n.type] || '•'}</div>
                  <div className="nb-item-body">
                    <div className="nb-item-title">{n.title}</div>
                    <div className="nb-item-msg">{n.message}</div>
                    <div className="nb-item-date">{formatDateShort(n.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
