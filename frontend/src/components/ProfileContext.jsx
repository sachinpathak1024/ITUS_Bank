import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api';

const ProfileContext = createContext(null);

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/bank/profile');
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onAuth = () => refresh();
    window.addEventListener('itus-auth-change', onAuth);
    return () => window.removeEventListener('itus-auth-change', onAuth);
  }, [refresh]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
};

export const notifyAuthChange = () => {
  window.dispatchEvent(new Event('itus-auth-change'));
};
