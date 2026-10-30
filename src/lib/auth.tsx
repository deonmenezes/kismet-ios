import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setApiToken } from "./api";
import { tokenStore } from "./token-store";

type Auth = {
  ready: boolean;
  token: string | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    tokenStore
      .get()
      .catch(() => null)
      .then((t) => {
        setApiToken(t);
        setToken(t);
        setReady(true);
      });
  }, []);

  const signIn = async (t: string) => {
    await tokenStore.set(t);
    setApiToken(t);
    queryClient.clear();
    setToken(t);
  };

  const signOut = async () => {
    await tokenStore.clear().catch(() => undefined);
    setApiToken(null);
    queryClient.clear();
    setToken(null);
  };

  return <AuthContext value={{ ready, token, signIn, signOut }}>{children}</AuthContext>;
}

export function useAuth() {
  const auth = use(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}
