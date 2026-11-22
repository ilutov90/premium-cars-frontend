"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminApiError, useAdmin } from "./admin-context";
import { CarImage } from "@/components/car-image";
import { formatEur } from "@/lib/format";
import type { AdminOrder, OrderCandidate } from "@/lib/types";

function availability(c: OrderCandidate): { text: string; tone: string } | null {
  if (c.carStatus == null) return { text: "Вече не е налична", tone: "bg-line text-muted" };
  if (c.carStatus === "SOLD") return { text: "Продадена", tone: "bg-accent/15 text-accent-dark" };
  if (c.carStatus === "RESERVED") return { text: "Резервирана", tone: "bg-warn/15 text-warn" };
  return null;
}

/**
 * The cars offered to the customer ("Предложени коли"). While the order is potential (`editable`) cars are added,
 * removed and chosen; the chosen one becomes the order's car. Every call answers the whole order.
 */
export function OrderCandidates({
  orderId,
  candidates,
  editable,
  onOrder,
}: {
  orderId: number;
  candidates: OrderCandidate[];
  editable: boolean;
  onOrder: (order: AdminOrder, chosen: boolean) => void;
}) {
  const { adminFetch } = useAdmin();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<AdminOrder>, chosen = false) {
    setBusy(true);
    setError(null);
    try {
      onOrder(await fn(), chosen);
      return true;
    } catch (e) {
      setError(
        e instanceof AdminApiError && e.status === 404
          ? "Не намерих такава кола."
          : e instanceof AdminApiError && e.status === 400
            ? "Тази кола вече е предложена или данните са невалидни."
            : (e as Error).message,
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!q.trim()) return;
    const ok = await run(() =>
      adminFetch<AdminOrder>(`/api/admin/orders/${orderId}/candidates`, { method: "POST", body: JSON.stringify({ q: q.trim() }) }),
    );
    if (ok) setQ("");
  }

  async function remove(c: OrderCandidate) {
    await run(() => adminFetch<AdminOrder>(`/api/admin/orders/${orderId}/candidates/${c.id}`, { method: "DELETE" }));
  }

  async function choose(c: OrderCandidate) {
    if (!window.confirm(`Клиентът избира „${c.title ?? "колата"}“. Поръчката ще стане с подписан договор, а колата ще се маркира като „Продадена“ и ще се скрие от сайта. Продължаваме ли?`)) return;
    await run(
      () => adminFetch<AdminOrder>(`/api/admin/orders/${orderId}/candidates/${c.id}/choose`, { method: "POST", body: JSON.stringify({}) }),
      true,
    );
  }

  return (
    <fieldset className="rounded-2xl border border-line bg-card p-5">
      <legend className="px-1 text-sm font-bold">Предложени коли ({candidates.length})</legend>
      {candidates.length === 0 ? (
        <p className="text-sm text-muted">Още няма предложени коли.</p>
      ) : (
        <ul className="space-y-2">
          {candidates.map((c) => {
            const badge = availability(c);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-ink/5 p-3">
                <CarImage src={c.coverUrl} alt={c.title ?? "Кола"} className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 text-sm">
                  {c.slug ? (
                    <Link href={`/cars/${c.slug}`} target="_blank" className="font-bold underline-offset-2 hover:underline">
                      {c.title ?? "Кола"} ↗
                    </Link>
                  ) : (
                    <span className="font-bold">{c.title ?? "Кола"}</span>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    <span>{formatEur(c.priceEur)}</span>
                    {badge && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.tone}`}>{badge.text}</span>}
                  </p>
                </div>
                {editable && (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className="btn-accent px-3! py-1.5! text-sm" disabled={busy || c.carId == null} onClick={() => void choose(c)}>
                      Клиентът избра тази
                    </button>
                    <button type="button" className="btn-ghost px-3! py-1.5! text-sm" disabled={busy} onClick={() => void remove(c)}>
                      Махни
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {editable && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void add();
              }
            }}
            placeholder="Обява № или линк"
            aria-label="Обява № или линк"
            className="field min-w-64 flex-1"
          />
          <button type="button" className="btn-ghost" disabled={busy || !q.trim()} onClick={() => void add()}>
            Добави
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm font-medium text-accent-dark">{error}</p>}
      {editable && <p className="mt-2 text-xs text-muted">Предложените коли остават в сайта. При избор колата се маркира като „Продадена“.</p>}
    </fieldset>
  );
}
