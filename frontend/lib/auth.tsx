'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';

interface AuthContextType {
  user: any;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = Cookies.get('token');
    if (savedToken) {
      axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/verify`, { token: savedToken })
        .then(res => {
          if (res.data.valid) {
            setToken(savedToken);
            setUser(res.data.user);
          } else {
            Cookies.remove('token');
          }
        })
        .catch(() => Cookies.remove('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/login`, { email, password });
      const { token, user } = res.data;
      Cookies.set('token', token, { expires: 7 });
      setToken(token);
      setUser(user);
      return true;
    } catch {
      return false;
    }
  }

  function logout() {
    Cookies.remove('token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);