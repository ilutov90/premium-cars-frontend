"use client";

import { useState } from "react";
import { useAdmin } from "./admin-context";
import { contactKindLabels, formatDate } from "@/lib/format";
import { fromSofiaInput, toSofiaInput } from "@/lib/sofia-time";
import type { AdminOrder, ContactKind, ContactRequest, OrderContact } from "@/lib/types";

const kinds = Object.keys(contactKindLabels) as ContactKind[];
/** What an admin may log by hand; INQUIRY entries come from the site (still editable when shown). */
const writable = kinds.filter((k) => k !== "INQUIRY");

function body(kind: ContactKind, text: string, when: string): ContactRequest {
  return { kind, body: text.trim(), happenedAt: fromSofiaInput(when)?.toISOString() ?? null };
}

/** "Комуникация": what was said with the customer, newest first; Bulgarian time. */
export function OrderContacts({
  orderId,
  contacts,
  onOrder,
}: {
  orderId: number;
  contacts: OrderContact[];
  onOrder: (order: AdminOrder) => void;
}) {
  const { adminFetch } = useAdmin();
  const [kind, setKind] = useState<ContactKind>("CALL");
  const [text, setText] = useState("");
  const [when, setWhen] = useState(() => toSofiaInput(new Date()));
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ kind: ContactKind; text: string; when: string }>({ kind: "CALL", text: "", when: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<AdminOrder>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      onOrder(await fn());
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!text.trim()) return;
    const ok = await run(() =>
      adminFetch<AdminOrder>(`/api/admin/orders/${orderId}/contacts`, { method: "POST", body: JSON.stringify(body(kind, text, when)) }),
    );
    if (ok) {
      setText("");
      setWhen(toSofiaInput(new Date()));
    }
  }

  function startEdit(c: OrderContact) {
    setEditId(c.id);
    setEdit({ kind: c.kind, text: c.body, when: toSofiaInput(new Date(c.happenedAt)) });
  }

  async function saveEdit() {
    if (editId == null || !edit.text.trim()) return;
    const ok = await run(() =>
      adminFetch<AdminOrder>(`/api/admin/orders/${orderId}/contacts/${editId}`, {
        method: "PUT",
        body: JSON.stringify(body(edit.kind, edit.text, edit.when)),
      }),
    );
    if (ok) setEditId(null);
  }

  async function remove(c: OrderContact) {
    if (!window.confirm("Да изтрия ли този запис?")) return;
    await run(() => adminFetch<AdminOrder>(`/api/admin/orders/${orderId}/contacts/${c.id}`, { method: "DELETE" }));
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-3 text-sm font-bold">Комуникация</h2>
      <div className="grid gap-2 sm:grid-cols-[auto_auto_1fr]">
        <select value={kind} onChange={(e) => setKind(e.target.value as ContactKind)} aria-label="Вид" className="field w-auto">
          {writable.map((k) => (
            <option key={k} value={k}>
              {contactKindLabels[k]}
            </option>
          ))}
        </select>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Кога (българско време)" className="field w-auto" />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Какво е казано / договорено"
          aria-label="Текст"
          className="field sm:col-span-3"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy || !text.trim()} onClick={() => void add()}>
          Запиши
        </button>
        <span className="text-xs text-muted">Часът е българско време.</span>
        {error && <span className="text-sm font-medium text-accent-dark">{error}</span>}
      </div>

      {contacts.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Още няма записи.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className={`rounded-xl p-3 text-sm ${c.kind === "INQUIRY" ? "border border-accent/40 bg-accent/10" : "bg-ink/5"}`}>
              {editId === c.id ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as ContactKind })} aria-label="Вид" className="field w-auto">
                      {kinds.map((k) => (
                        <option key={k} value={k}>
                          {contactKindLabels[k]}
                        </option>
                      ))}
                    </select>
                    <input type="datetime-local" value={edit.when} onChange={(e) => setEdit({ ...edit, when: e.target.value })} aria-label="Кога" className="field w-auto" />
                  </div>
                  <textarea value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} rows={3} aria-label="Текст" className="field" />
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary px-3! py-1.5!" disabled={busy || !edit.text.trim()} onClick={() => void saveEdit()}>
                      Запази
                    </button>
                    <button type="button" className="btn-ghost px-3! py-1.5!" onClick={() => setEditId(null)}>
                      Отказ
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-bold">{contactKindLabels[c.kind]}</span>
                    <span className="text-xs text-muted">
                      {formatDate(c.happenedAt)}
                      {c.createdBy ? ` · ${c.createdBy}` : ""}
                    </span>
                    <span className="ml-auto flex gap-3 text-xs">
                      <button type="button" className="font-semibold underline underline-offset-2" onClick={() => startEdit(c)}>
                        Редактирай
                      </button>
                      <button type="button" className="font-semibold text-accent-dark underline underline-offset-2" disabled={busy} onClick={() => void remove(c)}>
                        Изтрий
                      </button>
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line">{c.body}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
