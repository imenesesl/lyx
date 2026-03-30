import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api, setToken, clearToken, isAuthenticated } from "../api/client";

interface Account {
  id: string;
  email: string;
  name: string;
  alias: string | null;
  shellUrl: string;
}

interface AuthContextValue {
  account: Account | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      api
        .get<Account>("/auth/me")
        .then(setAccount)
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; account: Account }>("/auth/login", {
      email,
      password,
    });
    setToken(res.token);
    setAccount(res.account);
  }

  async function register(email: string, password: string, name: string) {
    const res = await api.post<{ token: string; account: Account }>("/auth/register", {
      email,
      password,
      name,
    });
    setToken(res.token);
    setAccount(res.account);
  }

  function logout() {
    clearToken();
    setAccount(null);
  }

  async function refreshAccount() {
    const data = await api.get<Account>("/auth/me");
    setAccount(data);
  }

  return (
    <AuthContext.Provider value={{ account, loading, login, register, logout, refreshAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
