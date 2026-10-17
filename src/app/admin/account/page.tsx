"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";

const MIN_LENGTH = 12;

/** Change the admin password (the first one comes from Vault: ADMIN_INITIAL_PASSWORD). */
export default function AdminAccountPage() {
  const { username, adminFetch } = useAdmin();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const next = String(form.get("newPassword") ?? "");
    if (next !== form.get("repeat")) {
      setMessage({ ok: false, text: "Новите пароли не съвпадат." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await adminFetch("/api/admin/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: next }),
      });
      formElement.reset();
      setMessage({ ok: true, text: "Паролата е сменена ✓" });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Грешка";
      setMessage({
        ok: false,
        text:
          text === "The current password is wrong"
            ? "Текущата парола е грешна."
            : text.startsWith("The new password needs")
              ? `Новата парола трябва да е поне ${MIN_LENGTH} знака.`
              : text === "The new password must differ from the current one"
                ? "Новата парола трябва да е различна от текущата."
                : text,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-extrabold">Профил</h1>
      <p className="mt-1 text-sm text-muted">
        Влезли сте като <strong>{username}</strong>. Сменете първоначалната парола след първия вход.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-2xl border border-line bg-card p-5">
        <div>
          <label className="label" htmlFor="currentPassword">
            Текуща парола
          </label>
          <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">
            Нова парола (поне {MIN_LENGTH} знака)
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={MIN_LENGTH}
            autoComplete="new-password"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="repeat">
            Повторете новата парола
          </label>
          <input id="repeat" name="repeat" type="password" required minLength={MIN_LENGTH} autoComplete="new-password" className="field" />
        </div>
        {message && (
          <p className={`text-sm font-semibold ${message.ok ? "text-ok" : "text-warn"}`}>{message.text}</p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Записване…" : "Смени паролата"}
        </button>
      </form>
    </div>
  );
}
