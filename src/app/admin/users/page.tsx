"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { formatDate } from "@/lib/format";
import type { AdminUser, OneTimePassword } from "@/lib/types";

/** Bulgarian texts for the backend's answers on this page. */
function bg(message: string): string {
  if (message.startsWith("Username:")) return "Потребителско име: 3–50 знака, малки латински букви, цифри, „.“, „_“ или „-“.";
  if (message === "The username is taken") return "Това потребителско име е заето.";
  if (message === "You cannot delete yourself") return "Не можете да изтриете себе си.";
  if (message === "The last admin cannot be deleted") return "Последният администратор не може да бъде изтрит.";
  if (message === "Change your own password under Profile") return "Своята парола сменяте от „Профил“.";
  return message;
}

/** Admins: all have the same rights; new ones get a one-time password to replace at the first login. */
export default function AdminUsersPage() {
  const { adminFetch } = useAdmin();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handover, setHandover] = useState<{ title: string; data: OneTimePassword } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    adminFetch<AdminUser[]>("/api/admin/users")
      .then(setUsers)
      .catch((e: Error) => setError(e.message));
  }, [adminFetch]);

  useEffect(load, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    const username = String(new FormData(formElement).get("username") ?? "");
    setBusy("create");
    setError(null);
    try {
      const data = await adminFetch<OneTimePassword>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      formElement.reset();
      setHandover({ title: `Създаден потребител „${data.user.username}“`, data });
      load();
    } catch (err) {
      setError(bg(err instanceof Error ? err.message : "Грешка"));
    } finally {
      setBusy(null);
    }
  }

  async function reset(user: AdminUser) {
    if (!confirm(`Нова еднократна парола за „${user.username}“? Текущата спира да работи и сесиите му приключват.`)) return;
    setBusy(`reset-${user.id}`);
    setError(null);
    try {
      const data = await adminFetch<OneTimePassword>(`/api/admin/users/${user.id}/reset-password`, { method: "POST" });
      setHandover({ title: `Нова парола за „${user.username}“`, data });
      load();
    } catch (err) {
      setError(bg(err instanceof Error ? err.message : "Грешка"));
    } finally {
      setBusy(null);
    }
  }

  async function remove(user: AdminUser) {
    if (!confirm(`Да изтрия ли потребител „${user.username}“? Ще бъде изваден от админ панела веднага.`)) return;
    setBusy(`delete-${user.id}`);
    setError(null);
    try {
      await adminFetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(bg(err instanceof Error ? err.message : "Грешка"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-extrabold">Потребители</h1>
      <p className="mt-1 text-sm text-muted">
        Всички администратори имат еднакви права. Новият потребител получава еднократна парола, която му предавате
        лично (напр. по телефона), и при първия вход си избира своя.
      </p>

      <form onSubmit={create} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-card p-4">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="new-username">
            Ново потребителско име
          </label>
          <input
            id="new-username"
            name="username"
            required
            minLength={3}
            maxLength={50}
            pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,49}"
            title="3–50 знака: латински букви, цифри, „.“, „_“ или „-“"
            autoComplete="off"
            placeholder="напр. maria"
            className="field"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={busy !== null}>
          {busy === "create" ? "Създаване…" : "Създай"}
        </button>
      </form>

      {handover && <Handover {...handover} onClose={() => setHandover(null)} />}
      {error && <p className="mt-4 text-sm font-semibold text-warn">{error}</p>}
      {!users && !error && <p className="mt-6 text-sm text-muted">Зареждане…</p>}

      {users && (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-bold">
                  {u.username}
                  {u.you && <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold">вие</span>}
                  {u.mustChangePassword && (
                    <span className="ml-2 rounded-full bg-warn/10 px-2 py-0.5 text-xs font-semibold text-warn">
                      с еднократна парола
                    </span>
                  )}
                  {u.locked && (
                    <span className="ml-2 rounded-full bg-warn/10 px-2 py-0.5 text-xs font-semibold text-warn">
                      заключен (грешни пароли)
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Създаден {formatDate(u.createdAt)} · последен вход {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                </p>
              </div>
              {!u.you && (
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost px-3! py-1.5! text-xs!" disabled={busy !== null} onClick={() => reset(u)}>
                    {busy === `reset-${u.id}` ? "…" : "Нова парола"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-3! py-1.5! text-xs! text-warn!"
                    disabled={busy !== null}
                    onClick={() => remove(u)}
                  >
                    {busy === `delete-${u.id}` ? "…" : "Изтрий"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The one-time password, shown once: copy it and hand it over. */
function Handover({ title, data, onClose }: { title: string; data: OneTimePassword; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Потребител: ${data.user.username}\nЕднократна парола: ${data.oneTimePassword}`;
  return (
    <div className="mt-4 rounded-2xl border border-ok/30 bg-ok/5 p-4">
      <p className="font-bold text-ok">{title}</p>
      <p className="mt-2 font-mono text-sm">
        Потребител: <strong>{data.user.username}</strong>
        <br />
        Еднократна парола: <strong className="select-all">{data.oneTimePassword}</strong>
      </p>
      <p className="mt-2 text-xs text-muted">
        Паролата се показва само сега. Предайте я на човека; при първия вход ще си избере своя.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn-ghost px-3! py-1.5! text-xs!"
          onClick={() =>
            navigator.clipboard.writeText(text).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }
        >
          {copied ? "Копирано ✓" : "Копирай"}
        </button>
        <button type="button" className="btn-ghost px-3! py-1.5! text-xs!" onClick={onClose}>
          Готово
        </button>
      </div>
    </div>
  );
}
