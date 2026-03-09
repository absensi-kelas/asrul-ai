import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'DEVELOPER' | 'PREMIUM' | 'BASIC';

interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  daily_limit: number;
  used_today: number;
}

interface AuthContextType {
  user: UserProfile | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // For this demo/applet, we'll use a simple mock-auth backed by Supabase if possible,
  // or just local storage for persistence if the table doesn't exist yet.
  // BUT the user wants a real "Developer Account" that can manage others.
  
  useEffect(() => {
    const savedUser = localStorage.getItem('asrul_ai_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // Hardcoded Developer Account
    if (username === 'ASRUL ALFANDI' && password === 'asruldeveloperaimantap') {
      const devUser: UserProfile = {
        id: 'dev-1',
        username: 'ASRUL ALFANDI',
        role: 'DEVELOPER',
        daily_limit: Infinity,
        used_today: 0
      };
      setUser(devUser);
      localStorage.setItem('asrul_ai_user', JSON.stringify(devUser));
      return true;
    }

    // Check Supabase for other users
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (data && !error) {
        const profile: UserProfile = {
          id: data.id,
          username: data.username,
          role: data.role as UserRole,
          daily_limit: data.daily_limit,
          used_today: data.used_today
        };
        setUser(profile);
        localStorage.setItem('asrul_ai_user', JSON.stringify(profile));
        return true;
      }
    } catch (e) {
      console.error('Login error:', e);
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('asrul_ai_user');
  };

  const refreshUser = async () => {
    if (!user || user.id === 'dev-1') return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        const profile: UserProfile = {
          id: data.id,
          username: data.username,
          role: data.role as UserRole,
          daily_limit: data.daily_limit,
          used_today: data.used_today
        };
        setUser(profile);
        localStorage.setItem('asrul_ai_user', JSON.stringify(profile));
      }
    } catch (e) {
      console.error('Refresh error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
