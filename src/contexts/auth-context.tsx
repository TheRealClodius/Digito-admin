"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Hub } from "aws-amplify/utils";
import { getCurrentAuthUser, type AuthUser } from "@/lib/auth";
import { ensureAmplifyConfigured } from "@/lib/amplify-config";

/** Session marker cookie name — mirrors proxy.ts */
const SESSION_COOKIE = "gg-session";

function setSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureAmplifyConfigured();

    // Check initial auth state
    getCurrentAuthUser().then((u) => {
      setUser(u);
      if (u) setSessionCookie();
      setLoading(false);
    });

    // Listen for auth events
    const hubListener = Hub.listen("auth", async ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
        case "tokenRefresh": {
          const u = await getCurrentAuthUser();
          setUser(u);
          if (u) setSessionCookie();
          setLoading(false);
          break;
        }
        case "signedOut": {
          setUser(null);
          clearSessionCookie();
          setLoading(false);
          break;
        }
      }
    });

    return () => hubListener();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export type { AuthUser };
