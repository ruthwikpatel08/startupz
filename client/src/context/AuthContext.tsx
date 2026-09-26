import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('startupz_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('startupz_token'));
  const [loading, setLoading] = useState<boolean>(!user && !!token);

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('startupz_token');
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem('startupz_user', JSON.stringify(data.user));
      }
    } catch (err: any) {
      console.warn('Backend verification warning:', err?.message || err);
      // Only logout if the token is explicitly rejected as unauthorized or invalid
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('jwt') || msg.includes('invalid token')) {
        logout();
      } else {
        // Retain offline or cached session if server is waking up or network unavailable
        const cached = localStorage.getItem('startupz_user');
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch {}
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('startupz_token', newToken);
    localStorage.setItem('startupz_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('startupz_token');
    localStorage.removeItem('startupz_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('startupz_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
