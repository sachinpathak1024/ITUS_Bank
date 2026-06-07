import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getUser, initials } from '../utils';
import { useTheme } from './Theme';
import { useProfile, notifyAuthChange } from './ProfileContext';
import FloatingChat from './FloatingChat';
import NotificationBell from './NotificationBell';
import './Layout.css';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: '◈' },
      { to: '/transactions', label: 'Transactions', icon: '☰' },
      { to: '/insights', label: 'Insights', icon: '◇' },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/transfer', label: 'Send Money', icon: '⇄' },
      { to: '/qr', label: 'QR Transfer', icon: '⊞' },
      { to: '/deposit', label: 'Deposit', icon: '↓' },
      { to: '/withdraw', label: 'Withdraw', icon: '↑' },
      { to: '/bills', label: 'Pay Bills', icon: '⚡' },
      { to: '/scheduled', label: 'Scheduled', icon: '⌛' },
      { to: '/beneficiaries', label: 'Beneficiaries', icon: '★' },
    ],
  },
  {
    label: 'Banking',
    items: [
      { to: '/accounts', label: 'Accounts', icon: '⊟' },
      { to: '/cards', label: 'Cards', icon: '▭' },
      { to: '/loans', label: 'Loans', icon: '◐' },
      { to: '/fds', label: 'Fixed Deposits', icon: '◉' },
      { to: '/goals', label: 'Goals', icon: '◎' },
      { to: '/budgets', label: 'Budgets', icon: '⌗' },
    ],
  },
  {
    label: 'You',
    items: [
      { to: '/chat', label: 'AI Assistant', icon: '✦' },
      { to: '/profile', label: 'Profile', icon: '◉' },
      { to: '/login-history', label: 'Login Activity', icon: '⌬' },
    ],
  },
];

const Layout = () => {
  const navigate = useNavigate();
  const user = getUser();
  const { theme, toggle } = useTheme();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);

  const displayName = profile?.fullName || user?.fullName || user?.username || 'Customer';
  const avatarSrc = profile?.avatarBase64;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    notifyAuthChange();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">IB</div>
          <div>
            <div className="brand-name">ITUS Bank</div>
            <div className="brand-tag">Online Banking</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="nav-section">
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item-active' : ''}`
                  }
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <button className="nav-item nav-logout" onClick={handleLogout}>
          <span className="nav-icon">⏻</span>
          <span>Logout</span>
        </button>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <div className="welcome">
            <div className="welcome-greeting">
              Welcome back, <strong>{displayName}</strong>
            </div>
            <div className="welcome-meta">Have a great day at ITUS Bank</div>
          </div>
          <div className="topbar-actions">
            <button
              className="theme-toggle"
              onClick={toggle}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? '☾' : '☀'}
            </button>
            <NotificationBell />
            <div className="user-chip">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="avatar avatar-img" />
              ) : (
                <div className="avatar">{initials(displayName)}</div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <FloatingChat />
    </div>
  );
};

export default Layout;
