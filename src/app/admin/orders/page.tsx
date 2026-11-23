"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdmin } from "@/components/admin/admin-context";
import { OrderStatusChip } from "@/components/admin/order-status-chip";
import { Pager } from "@/components/admin/pager";
import { CarImage } from "@/components/car-image";
import { formatDate, formatDay, formatEur, isOverdue, orderStatusLabels } from "@/lib/format";
import type { OrderStatus, OrderSummary, PageResponse } from "@/lib/types";

const PAGE_SIZE = 20;

/** "Поръчки": cars sold to customers, with the customer, the agreed price and the documents. */
export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Зареждане…</p>}>
      <OrdersList />
    </Suspense>
  );
}

function OrdersList() {
  const { adminFetch } = useAdmin();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const followUp = searchParams.get("followUp") === "1";

  function setFollowUp(on: boolean) {
    setPageNo(0);
    router.replace(on ? `${pathname}?followUp=1` : pathname, { scroll: false });
  }
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [pageNo, setPageNo] = useState(0);
  const [data, setData] = useState<PageResponse<OrderSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const params = new URLSearchParams({ page: String(pageNo), size: String(PAGE_SIZE) });
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    if (followUp) params.set("followUp", "true");
    adminFetch<PageResponse<OrderSummary>>(`/api/admin/orders?${params}`)
      .then((p) => {
        if (!current) return;
        setData(p);
        setError(null);
      })
      .catch((e: Error) => current && setError(e.message));
    return () => {
      current = false;
    };
  }, [adminFetch, q, status, pageNo, followUp]);

  return (
    <div className="pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Поръчки</h1>
        <Link href="/admin/orders/new" className="btn-primary">
          Нова поръчка
        </Link>
      </div>

      <form
        className="mb-5 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPageNo(0);
          setQ(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Клиент, телефон, имейл, фирма, кола, VIN, контейнер, Обява № или линк"
          aria-label="Търсене"
          className="field min-w-64 flex-1"
        />
        <select
          value={status}
          onChange={(e) => {
            setPageNo(0);
            setStatus(e.target.value as OrderStatus | "");
          }}
          aria-label="Статус"
          className="field w-auto"
        >
          <option value="">Всички статуси</option>
          {Object.entries(orderStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-ghost">
          Търси
        </button>
        <button
          type="button"
          onClick={() => setFollowUp(!followUp)}
          aria-pressed={followUp}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${followUp ? "bg-ink text-paper" : "bg-card ring-1 ring-line hover:ring-ink"}`}
        >
          За днес / Просрочени
        </button>
      </form>

      {error && <p className="mb-3 text-sm font-medium text-accent-dark">{error}</p>}
      {!data && !error && <p className="text-sm text-muted">Зареждане…</p>}
      {data && (
        <>
          <Pager page={data} onPage={setPageNo} noun="поръчки" />
          {data.items.length === 0 ? (
            <p className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">Няма поръчки.</p>
          ) : (
            <ul className="space-y-2">
              {data.items.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-line bg-card p-3 hover:border-ink"
                  >
                    <CarImage src={o.coverUrl} alt={o.car.title ?? "Кола"} className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {o.status === "LEAD" && o.carId == null ? "Потенциална поръчка" : (o.car.title ?? "Кола")}
                        {o.carId == null && o.status !== "LEAD" && <span className="ml-2 text-xs font-normal text-muted">(колата е изтрита)</span>}
                      </p>
                      <p className="truncate text-sm text-muted">
                        {o.customer.name || o.customer.companyName || "Без име"}
                        {o.customer.phone ? ` · ${o.customer.phone}` : ""}
                      </p>
                      <p className="text-xs text-muted">
                        № {o.id}
                        {o.contractDate ? ` · договор ${formatDay(o.contractDate)}` : ""} · {o.documentCount} док.
                        {o.status === "LEAD" && o.carId == null ? ` · Предложени коли: ${o.candidateCount}` : ""}
                      </p>
                      {o.nextContactAt && (
                        <p className={`text-xs ${isOverdue(o.nextContactAt) ? "font-semibold text-accent-dark" : "text-muted"}`}>
                          Следващ контакт: {formatDate(o.nextContactAt)}
                          {isOverdue(o.nextContactAt) ? " (просрочен)" : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <OrderStatusChip status={o.status} />
                      <span className="text-sm font-bold">{o.agreedPriceEur == null ? "—" : formatEur(o.agreedPriceEur)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pager page={data} onPage={setPageNo} noun="поръчки" bottom />
        </>
      )}
    </div>
  );
}
