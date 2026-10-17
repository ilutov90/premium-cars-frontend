"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PUBLIC_API_URL } from "@/lib/config";

/*
 * MVP admin auth: HTTP Basic credentials kept in sessionStorage (cleared when the tab closes).
 * Replace with a proper login (OAuth2 / Keycloak / session cookie) before exposing the admin publicly.
 */
const STORAGE_KEY = "pc-admin-auth";

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type AdminFetch = <T>(path: string, init?: RequestInit) => Promise<T>;

interface AdminContextValue {
  username: string;
  adminFetch: AdminFetch;
  logout: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}

async function call<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Basic ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const problem = await res.json().catch(() => null);
    throw new AdminApiError(res.status, problem?.detail ?? `Грешка ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  // undefined = not checked yet (avoids flashing the login form), null = logged out
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const stored = readStoredToken();
    const check: Promise<string | null> = stored
      ? call<{ username: string }>(stored, "/api/admin/me").then((me) => {
          setUsername(me.username);
          return stored;
        })
      : Promise.resolve(null);
    check.catch(() => null).then(setToken);
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    setToken(null);
  }, []);

  const adminFetch = useCallback<AdminFetch>(
    async (path, init) => {
      if (!token) throw new AdminApiError(401, "Не сте влезли");
      try {
        return await call(token, path, init);
      } catch (e) {
        if (e instanceof AdminApiError && e.status === 401) logout();
        throw e;
      }
    },
    [token, logout],
  );

  const value = useMemo(() => ({ username, adminFetch, logout }), [username, adminFetch, logout]);

  if (token === undefined) {
    return <p className="p-10 text-center text-sm text-muted">Зареждане…</p>;
  }
  if (token === null) {
    return (
      <LoginForm
        onLogin={(t, user) => {
          try {
            sessionStorage.setItem(STORAGE_KEY, t);
          } catch {
            /* storage unavailable: stay logged in for this page only */
          }
          setUsername(user);
          setToken(t);
        }}
      />
    );
  }
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

function LoginForm({ onLogin }: { onLogin: (token: string, username: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const user = String(form.get("username") ?? "");
    const bytes = new TextEncoder().encode(`${user}:${form.get("password") ?? ""}`);
    const token = btoa(String.fromCharCode(...bytes)); // UTF-8 safe Basic token
    setBusy(true);
    setError(null);
    try {
      const me = await call<{ username: string }>(token, "/api/admin/me");
      onLogin(token, me.username);
    } catch (err) {
      setError(
        err instanceof AdminApiError && err.status === 401
          ? "Грешно потребителско име или парола"
          : "Няма връзка с бекенда. Стартиран ли е на " + PUBLIC_API_URL + "?",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-2xl font-extrabold tracking-tight">Админ панел</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-2xl border border-line bg-card p-5">
        <div>
          <label className="label" htmlFor="login-user">
            Потребител
          </label>
          <input id="login-user" name="username" required autoComplete="username" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="login-pass">
            Парола
          </label>
          <input id="login-pass" name="password" type="password" required autoComplete="current-password" className="field" />
        </div>
        {error && <p className="text-sm font-medium text-accent-dark">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Влизане…" : "Вход"}
        </button>
      </form>
    </div>
  );
}
