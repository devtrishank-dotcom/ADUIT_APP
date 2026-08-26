import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { feedbackNotification as notification } from '../services/feedback';
import apiFunctions from '../services/api';

const AuthContext = createContext(null);

const unwrapUser = (payload) => payload?.user || payload?.data?.user || payload?.data || payload;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const storeAuth = useCallback((tokenVal, refreshToken, userVal) => {
    const normalizedUser = unwrapUser(userVal);
    localStorage.setItem('ams_token', tokenVal);
    localStorage.setItem('ams_refresh_token', refreshToken);
    localStorage.setItem('ams_user', JSON.stringify(normalizedUser));
    setToken(tokenVal);
    setUser(normalizedUser);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('ams_token');
    localStorage.removeItem('ams_refresh_token');
    localStorage.removeItem('ams_user');
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (employeeCode, password) => {
    const response = await apiFunctions.auth.login(employeeCode, password);
    const { token: t, refreshToken: rt, user: u } = response.data;
    storeAuth(t, rt, u);
    return u;
  }, [storeAuth]);

  const logout = useCallback(async () => {
    try {
      await apiFunctions.auth.logout();
    } catch {
      // ignore
    }
    clearAuth();
  }, [clearAuth]);

  const refreshAuth = useCallback(async () => {
    const refreshToken = localStorage.getItem('ams_refresh_token');
    if (!refreshToken) {
      clearAuth();
      return false;
    }
    try {
      const response = await apiFunctions.auth.refresh(refreshToken);
      const { token: newToken, refreshToken: newRt, user: u } = response.data;
      storeAuth(newToken, newRt || refreshToken, u || JSON.parse(localStorage.getItem('ams_user') || 'null'));
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [storeAuth, clearAuth]);

  const hasRole = useCallback((roleName) => {
    if (!user) return false;

    const normalize = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
    const aliases = {
      ADMIN: ['ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMINISTRATOR'],
      SUPER_ADMIN: ['ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMINISTRATOR'],
      SYSTEM_ADMINISTRATOR: ['ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMINISTRATOR'],
      PLANNER: ['PLANNER', 'AUDIT_PLANNER'],
      AUDIT_PLANNER: ['PLANNER', 'AUDIT_PLANNER'],
      BRANCH_MANAGER: ['BRANCH_MANAGER'],
      COMPLIANCE_OFFICER: ['COMPLIANCE_OFFICER', 'COMPLIANCE_OWNER'],
      COMPLIANCE_OWNER: ['COMPLIANCE_OFFICER', 'COMPLIANCE_OWNER'],
      HIA_REVIEWER: ['HIA_REVIEWER', 'HIA'],
      HIA: ['HIA_REVIEWER', 'HIA'],
    };
    const requested = normalize(roleName);
    const accepted = aliases[requested] || [requested];

    return user.roles?.some((role) => accepted.includes(normalize(role?.name || role))) || false;
  }, [user]);

  const hasPermission = useCallback((module, action) => {
    if (!user) return false;
    if (hasRole('SYSTEM_ADMINISTRATOR')) return true;
    const perms = user.permissions || [];
    const normalizedAction = { read: 'view', update: 'edit' }[action] || action;
    return perms.some(p =>
      p.module === module && p.actions?.some((allowed) => (
        allowed === '*' || ({ read: 'view', update: 'edit' }[allowed] || allowed) === normalizedAction
      ))
    );
  }, [user, hasRole]);

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const savedToken = localStorage.getItem('ams_token');
      const savedUser = localStorage.getItem('ams_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(unwrapUser(JSON.parse(savedUser)));
        try {
          const response = await apiFunctions.auth.getMe();
          const freshUser = unwrapUser(response.data);
          localStorage.setItem('ams_user', JSON.stringify(freshUser));
          setUser(freshUser);
        } catch (err) {
          if (err.response?.status === 401) {
            const refreshed = await refreshAuth();
            if (refreshed) {
              try {
                const response = await apiFunctions.auth.getMe();
                const freshUser = unwrapUser(response.data);
                localStorage.setItem('ams_user', JSON.stringify(freshUser));
                setUser(freshUser);
              } catch {
                clearAuth();
              }
            }
          } else {
            notification.warning({
              message: 'Session Issue',
              description: 'Could not verify session. Please login again.',
            });
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [refreshAuth, clearAuth]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    refreshAuth,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
