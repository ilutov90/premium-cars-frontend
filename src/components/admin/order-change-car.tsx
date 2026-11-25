"use client";

import { useState } from "react";
import { AdminApiError, useAdmin } from "./admin-context";
import { StatusBadge } from "./status-badge";
import { CarImage } from "@/components/car-image";
import { formatEur } from "@/lib/format";
import type { AdminOrder, OrderCarLookup } from "@/lib/types";

/**
 * "Смени колата" of an agreed order: another car by "Обява №" or a site link becomes the order's car
 * (`POST /api/admin/orders/{id}/car`); the previous one stays among the offered cars and, when ticked, goes back on the site.
 */
export function OrderChangeCar({ order, onChanged }: { order: AdminOrder; onChanged: (saved: AdminOrder) => void }) {
  const { adminFetch } = useAdmin();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState<OrderCarLookup | null>(null);
  const [republishOld, setRepublishOld] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function find() {
    setError(null);
    setLookup(null);
    if (!query.trim()) return;
    try {
      setLookup(await adminFetch<OrderCarLookup>(`/api/admin/orders/car-lookup?q=${encodeURIComponent(query.trim())}`));
    } catch (e) {
      setError(e instanceof AdminApiError && e.status === 404 ? "Не намерих такава кола." : (e as Error).message);
    }
  }

  async function change() {
    if (!lookup) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await adminFetch<AdminOrder>(`/api/admin/orders/${order.id}/car`, {
        method: "POST",
        body: JSON.stringify({ q: String(lookup.id), republishOld }),
      });
      onChanged(saved);
      setOpen(false);
      setQuery("");
      setLookup(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost text-sm" onClick={() => setOpen(true)}>
        Смени колата
      </button>
    );
  }

  const sameCar = lookup != null && lookup.id === order.carId;
  const elsewhere = lookup?.activeOrderId != null && lookup.activeOrderId !== order.id;
  return (
    <div className="space-y-3 rounded-xl border border-line bg-paper p-4 text-sm">
      <p className="font-semibold">Смяна на колата</p>
      <p className="text-muted">
        Новата кола става колата на поръчката и се маркира „Продадена“. Статусът, клиентът, цените и документите остават.
        Старата кола остава в „Предложени коли“, а смяната се записва в „Комуникация“.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void find();
            }
          }}
          placeholder="Обява № или линк към новата кола"
          aria-label="Нова кола"
          className="field min-w-64 flex-1"
        />
        <button type="button" className="btn-ghost" onClick={() => void find()}>
          Намери
        </button>
      </div>
      {lookup && (
        <div className="flex items-center gap-3">
          <CarImage src={lookup.coverUrl} alt={lookup.title} className="h-16 w-24 shrink-0 rounded-lg object-cover" />
          <div>
            <p className="font-semibold">
              {lookup.title} <span className="font-normal text-muted">№ {lookup.id}</span>
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs">
              <StatusBadge status={lookup.status} />
              <span>{formatEur(lookup.priceEur)}</span>
            </p>
          </div>
        </div>
      )}
      {sameCar && <p className="font-medium text-accent-dark">Това е сегашната кола на поръчката.</p>}
      {elsewhere && <p className="font-medium text-accent-dark">Колата вече е в поръчка № {lookup?.activeOrderId}.</p>}
      {order.carId != null && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={republishOld} onChange={(e) => setRepublishOld(e.target.checked)} />
          Върни старата кола в сайта
        </label>
      )}
      {error && <p className="font-medium text-accent-dark">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy || !lookup || sameCar || elsewhere} onClick={() => void change()}>
          {busy ? "Сменям…" : "Смени"}
        </button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => setOpen(false)}>
          Отказ
        </button>
      </div>
    </div>
  );
}
