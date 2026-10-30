import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, AuthResponse } from '@xiangqi/shared-types';
import { apiUrl } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('xiangqi_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch(apiUrl('/api/auth/me'), {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const userData: UserProfile = await res.json();
        setUser(userData);
      } else {
        localStorage.removeItem('xiangqi_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      // Offline or network error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Đăng nhập thất bại');
    }

    const authRes = data as AuthResponse;
    localStorage.setItem('xiangqi_token', authRes.token);
    setToken(authRes.token);
    setUser(authRes.user);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Đăng ký thất bại');
    }

    const authRes = data as AuthResponse;
    localStorage.setItem('xiangqi_token', authRes.token);
    setToken(authRes.token);
    setUser(authRes.user);
  };

  const logout = () => {
    localStorage.removeItem('xiangqi_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

