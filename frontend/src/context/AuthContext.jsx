import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/index';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifie la session au montage
  useEffect(() => {
    authApi.me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await authApi.login({ email, password });
    setUser(res.data);
    return res.data;
  }

  async function register(firstName, lastName, email, password) {
    const res = await authApi.register({ firstName, lastName, email, password });
    setUser(res.data);
    return res.data;
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
