"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/*
 * Admin login with a server session: the backend sets an HttpOnly session cookie (the password is never stored in
 * the browser). Changing requests send the CSRF token from the XSRF-TOKEN cookie in the X-XSRF-TOKEN header.
 * All calls go to the same origin (/api is forwarded to the backend by next.config.ts).
 */

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
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}

function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Bulgarian texts for the backend's (English) answers the admin sees most. */
function message(status: number, detail: string | undefined): string {
  if (status === 429) return "Твърде много опити. Опитайте отново след няколко минути.";
  if (status === 403) return "Сесията е изтекла. Презаредете страницата.";
  if (detail === "Wrong username or password") return "Грешно потребителско име или парола";
  if (detail?.startsWith("Too many wrong passwords")) return "Твърде много грешни пароли. Опитайте след 15 минути.";
  return detail ?? `Грешка ${status}`;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const token = method === "GET" ? null : csrfToken();
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "X-XSRF-TOKEN": token } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new AdminApiError(0, "Няма връзка със сървъра.");
  }
  if (!res.ok) {
    const problem = await res.json().catch(() => null);
    throw new AdminApiError(res.status, message(res.status, problem?.detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  // undefined = not checked yet (avoids flashing the login form), null = logged out
  const [username, setUsername] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    call<{ username: string }>("/api/admin/me")
      .then((me) => setUsername(me.username))
      .catch(() => setUsername(null));
  }, []);

  const logout = useCallback(async () => {
    await call("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setUsername(null);
  }, []);

  const adminFetch = useCallback<AdminFetch>(async (path, init) => {
    try {
      return await call(path, init);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) setUsername(null);
      throw e;
    }
  }, []);

  const value = useMemo(() => ({ username: username ?? "", adminFetch, logout }), [username, adminFetch, logout]);

  if (username === undefined) {
    return <p className="p-10 text-center text-sm text-muted">Зареждане…</p>;
  }
  if (username === null) {
    return <LoginForm onLogin={setUsername} />;
  }
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

function LoginForm({ onLogin }: { onLogin: (username: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await call("/api/admin/csrf"); // sets the XSRF-TOKEN cookie
      const me = await call<{ username: string }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      onLogin(me.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка");
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
