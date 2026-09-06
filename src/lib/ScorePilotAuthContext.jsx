import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const loadUser = async () => {
    setIsLoadingAuth(true);
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error || !authUser) {
      setUser(null);
      setIsAuthenticated(false);
      if (error) setAuthError({ type: 'unknown', message: error.message });
      setIsLoadingAuth(false);
      return;
    }
    const { data: profile } = await supabase.from('scorepilot_profiles').select('*').eq('id', authUser.id).maybeSingle();
    setUser({ id: authUser.id, email: authUser.email, ...(profile || {}) });
    setIsAuthenticated(true);
    setAuthError(null);
    setIsLoadingAuth(false);
  };

  useEffect(() => {
    loadUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUser();
      else { setUser(null); setIsAuthenticated(false); setIsLoadingAuth(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    window.location.assign('/');
  };

  const navigateToLogin = (returnUrl = window.location.href) => {
    window.location.assign(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  return <AuthContext.Provider value={{
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError,
    appPublicSettings: null,
    logout,
    navigateToLogin,
    checkAppState: loadUser
  }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
