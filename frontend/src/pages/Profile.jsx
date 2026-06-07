import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';
import { useProfile } from '../components/ProfileContext';
import { useConfirmAction } from '../components/ConfirmAction';
import { formatCurrency, formatDateShort, initials } from '../utils';

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    occupation: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef(null);

  const [pinIsSet, setPinIsSet] = useState(false);
  const [pinForm, setPinForm] = useState({ pin: '', currentPin: '', newPin: '' });
  const [pinBusy, setPinBusy] = useState(false);

  const toast = useToast();
  const { refresh: refreshGlobalProfile } = useProfile();
  const { refreshPinStatus } = useConfirmAction();

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: s }, { data: pin }] = await Promise.all([
        api.get('/bank/profile'),
        api.get('/bank/profile/stats'),
        api.get('/bank/security/pin-status'),
      ]);
      setProfile(p);
      setStats(s);
      setPinIsSet(!!pin.isSet);
      setForm({
        fullName: p.fullName || '',
        email: p.email || '',
        phone: p.phone || '',
        address: p.address || '',
        occupation: p.occupation || '',
      });
    } finally {
      setLoading(false);
    }
  };

  const setPinHandler = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinForm.pin)) {
      toast.error('PIN must be 4 digits');
      return;
    }
    setPinBusy(true);
    try {
      const { data } = await api.post('/bank/security/pin', { pin: pinForm.pin });
      if (data.success) {
        toast.success('PIN set. It will now be required for money operations.');
        setPinForm({ pin: '', currentPin: '', newPin: '' });
        load();
        refreshPinStatus();
      } else {
        toast.error(data.message);
      }
    } finally {
      setPinBusy(false);
    }
  };

  const changePinHandler = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinForm.newPin)) {
      toast.error('New PIN must be 4 digits');
      return;
    }
    setPinBusy(true);
    try {
      const { data } = await api.post('/bank/security/pin/change', {
        currentPin: pinForm.currentPin, newPin: pinForm.newPin,
      });
      if (data.success) {
        toast.success('PIN changed');
        setPinForm({ pin: '', currentPin: '', newPin: '' });
        load();
      } else {
        toast.error(data.message);
      }
    } finally {
      setPinBusy(false);
    }
  };

  const removePinHandler = async () => {
    const currentPin = window.prompt('Enter your current PIN to remove it');
    if (!currentPin) return;
    setPinBusy(true);
    try {
      const { data } = await api.delete('/bank/security/pin', { data: { currentPin } });
      if (data.success) {
        toast.success('PIN removed');
        load();
        refreshPinStatus();
      } else {
        toast.error(data.message);
      }
    } finally {
      setPinBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put('/bank/profile', form);
      if (data.success) {
        toast.success('Profile updated');
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem(
          'user',
          JSON.stringify({ ...stored, fullName: data.fullName, email: data.email })
        );
        load();
        refreshGlobalProfile();
      } else {
        toast.error(data.message || 'Could not update profile');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (pw.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setSavingPw(true);
    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      if (data.success) {
        toast.success('Password changed');
        setPw({ currentPassword: '', newPassword: '', confirm: '' });
      } else {
        toast.error(data.message || 'Could not change password');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change password');
    } finally {
      setSavingPw(false);
    }
  };

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      toast.error('Image too large (max 500KB)');
      e.target.value = '';
      return;
    }
    setUploadingAvatar(true);
    try {
      const base64 = await fileToBase64(file);
      const { data } = await api.post('/bank/profile/avatar', { avatarBase64: base64 });
      if (data.success) {
        toast.success('Avatar updated');
        load();
        refreshGlobalProfile();
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const removeAvatar = async () => {
    if (!window.confirm('Remove avatar?')) return;
    try {
      const { data } = await api.post('/bank/profile/avatar', { avatarBase64: null });
      if (data.success) {
        toast.success('Avatar removed');
        load();
        refreshGlobalProfile();
      }
    } catch {
      toast.error('Could not remove');
    }
  };

  if (loading) return <div className="page-loading">Loading profile…</div>;
  if (!profile) return <div className="page-loading">Could not load profile.</div>;

  const kycBadge =
    profile.kycStatus === 'VERIFIED'
      ? { label: 'KYC Verified', cls: 'kyc-verified' }
      : profile.kycStatus === 'PENDING'
      ? { label: 'KYC Pending', cls: 'kyc-pending' }
      : { label: 'KYC Required', cls: 'kyc-none' };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Profile</div>
        <div className="page-subtitle">Your account details and security</div>
      </div>

      <div className="pf-grid">
        <div>
          <div className="card pf-summary">
            <div className="pf-avatar-wrap">
              {profile.avatarBase64 ? (
                <img src={profile.avatarBase64} alt="avatar" className="pf-avatar-img" />
              ) : (
                <div className="pf-avatar">{initials(profile.fullName)}</div>
              )}
              <button
                className="pf-avatar-edit"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                title="Change avatar"
              >
                {uploadingAvatar ? '…' : '📷'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatar}
              />
            </div>
            <div className="pf-name">{profile.fullName}</div>
            <div className="pf-username">@{profile.username}</div>
            <div className={`kyc-badge ${kycBadge.cls}`}>{kycBadge.label}</div>
            {profile.avatarBase64 && (
              <button className="btn btn-ghost btn-sm" onClick={removeAvatar} style={{ marginTop: 10 }}>
                Remove photo
              </button>
            )}

            <div className="pf-divider" />

            <div className="pf-row">
              <div className="pf-row-label">Account No.</div>
              <div className="pf-row-value">{profile.accountNumber}</div>
            </div>
            <div className="pf-row">
              <div className="pf-row-label">Type</div>
              <div className="pf-row-value">{profile.accountType}</div>
            </div>
            <div className="pf-row">
              <div className="pf-row-label">Balance</div>
              <div className="pf-row-value">{formatCurrency(profile.balance)}</div>
            </div>
            <div className="pf-row">
              <div className="pf-row-label">Member since</div>
              <div className="pf-row-value">{formatDateShort(profile.createdAt)}</div>
            </div>
          </div>

          {stats && (
            <div className="card mt-md">
              <div className="card-title">Lifetime Stats</div>
              <div className="pf-stats">
                <div>
                  <div className="pf-stat-label">Credits</div>
                  <div className="pf-stat-value text-success">{formatCurrency(stats.lifetimeCredits)}</div>
                </div>
                <div>
                  <div className="pf-stat-label">Debits</div>
                  <div className="pf-stat-value text-danger">{formatCurrency(stats.lifetimeDebits)}</div>
                </div>
                <div>
                  <div className="pf-stat-label">Deposits</div>
                  <div className="pf-stat-value">{stats.deposits}</div>
                </div>
                <div>
                  <div className="pf-stat-label">Withdrawals</div>
                  <div className="pf-stat-value">{stats.withdrawals}</div>
                </div>
                <div>
                  <div className="pf-stat-label">Sent</div>
                  <div className="pf-stat-value">{stats.transfersSent}</div>
                </div>
                <div>
                  <div className="pf-stat-label">Received</div>
                  <div className="pf-stat-value">{stats.transfersReceived}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">Personal Information</div>
            <div className="card-subtitle">Keep your details up to date</div>
            <form onSubmit={saveProfile}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 …"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Occupation</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.occupation}
                    onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                    placeholder="e.g. Software Engineer"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, City, State, PIN"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? <span className="spinner" /> : 'Save Changes'}
              </button>
            </form>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-title">Transaction PIN</div>
            <div className="card-subtitle">
              {pinIsSet
                ? 'PIN is set and required for any money operation.'
                : 'Optional — when set, this 4-digit PIN is required for transfers, withdrawals, bills, etc.'}
            </div>
            {!pinIsSet ? (
              <form onSubmit={setPinHandler}>
                <div className="form-group">
                  <label className="form-label">Pick a 4-digit PIN</label>
                  <input type="password" inputMode="numeric" maxLength={4}
                         className="form-control" value={pinForm.pin}
                         onChange={(e) => setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                         placeholder="••••" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={pinBusy}>
                  {pinBusy ? <span className="spinner" /> : 'Set PIN'}
                </button>
              </form>
            ) : (
              <form onSubmit={changePinHandler}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Current PIN</label>
                    <input type="password" inputMode="numeric" maxLength={4}
                           className="form-control" value={pinForm.currentPin}
                           onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New PIN</label>
                    <input type="password" inputMode="numeric" maxLength={4}
                           className="form-control" value={pinForm.newPin}
                           onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
                  </div>
                </div>
                <div className="flex gap-sm">
                  <button type="submit" className="btn btn-primary" disabled={pinBusy}>Change PIN</button>
                  <button type="button" className="btn btn-ghost" onClick={removePinHandler} disabled={pinBusy}>
                    Remove PIN
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="card">
            <div className="card-title">Change Password</div>
            <div className="card-subtitle">Use at least 6 characters</div>
            <form onSubmit={changePassword}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={pw.currentPassword}
                  onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={pw.newPassword}
                    onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                    minLength={6}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={pw.confirm}
                    onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingPw}>
                {savingPw ? <span className="spinner" /> : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .pf-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 20px;
        }
        @media (max-width: 900px) {
          .pf-grid { grid-template-columns: 1fr; }
        }
        .pf-summary { text-align: center; }
        .pf-avatar-wrap {
          position: relative;
          width: 100px;
          margin: 0 auto 14px;
        }
        .pf-avatar, .pf-avatar-img {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
        }
        .pf-avatar {
          background: var(--itus-gradient);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 32px;
        }
        .pf-avatar-edit {
          position: absolute;
          right: -4px;
          bottom: -4px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--itus-accent);
          color: var(--itus-primary-dark);
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          border: 3px solid var(--itus-surface);
        }
        .pf-avatar-edit:hover {
          transform: scale(1.08);
        }
        .pf-name { font-weight: 700; font-size: 17px; }
        .pf-username { color: var(--itus-muted); font-size: 13px; margin-bottom: 10px; }
        .kyc-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .kyc-verified { background: rgba(16, 185, 129, 0.15); color: var(--itus-success); }
        .kyc-pending { background: rgba(245, 158, 11, 0.15); color: var(--itus-warning); }
        .kyc-none { background: rgba(239, 68, 68, 0.15); color: var(--itus-danger); }
        .pf-divider {
          margin: 18px 0 8px;
          border-top: 1px solid var(--itus-border);
        }
        .pf-row {
          display: flex;
          justify-content: space-between;
          padding: 9px 0;
          text-align: left;
          font-size: 13.5px;
        }
        .pf-row + .pf-row {
          border-top: 1px solid var(--itus-border);
        }
        .pf-row-label { color: var(--itus-muted); }
        .pf-row-value { font-weight: 600; }
        .pf-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 4px;
        }
        .pf-stat-label {
          font-size: 11px;
          color: var(--itus-muted);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .pf-stat-value {
          font-size: 16px;
          font-weight: 700;
          margin-top: 3px;
        }
      `}</style>
    </>
  );
};

export default Profile;
