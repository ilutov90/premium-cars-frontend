"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrderStatusChip } from "@/components/admin/order-status-chip";
import { useAdmin } from "@/components/admin/admin-context";
import { formatDate, heardFromLabels, inquiryStatusLabels } from "@/lib/format";
import type { AdminInquiry, InquiryStatus, PageResponse } from "@/lib/types";

/** "Откъде: Facebook · линк: facebook / social / car-post · сайт: l.facebook.com · страница: /cars/…" */
function sourceLine(q: AdminInquiry): string | null {
  const a = q.attribution;
  const parts: string[] = [];
  if (q.heardFrom) parts.push(`Откъде: ${heardFromLabels[q.heardFrom]}`);
  const utm = [a?.utmSource, a?.utmMedium, a?.utmCampaign, a?.utmContent].filter(Boolean).join(" / ");
  if (utm) parts.push(`линк: ${utm}`);
  if (a?.referrer) parts.push(`сайт: ${a.referrer}`);
  if (a?.landingPath) parts.push(`първа страница: ${a.landingPath}`);
  return parts.length ? parts.join(" · ") : null;
}

const statuses = Object.keys(inquiryStatusLabels) as InquiryStatus[];

export default function AdminInquiriesPage() {
  const { adminFetch } = useAdmin();
  const router = useRouter();
  const [notice, setNotice] = useState<{ inquiryId: number; orderId: number } | null>(null);
  const [filter, setFilter] = useState<InquiryStatus | "">("NEW");
  const [data, setData] = useState<PageResponse<AdminInquiry> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminFetch<PageResponse<AdminInquiry>>(`/api/admin/inquiries${filter ? `?status=${filter}` : ""}`)
      .then((page) => {
        if (cancelled) return;
        setData(page);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [adminFetch, filter, reload]);

  async function setStatus(id: number, status: InquiryStatus) {
    try {
      const updated = await adminFetch<AdminInquiry>(`/api/admin/inquiries/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      setNotice(status === "CONTACTED" && updated.orderId != null ? { inquiryId: id, orderId: updated.orderId } : null);
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    }
  }

  async function openOrder(id: number) {
    try {
      const order = await adminFetch<{ id: number }>(`/api/admin/inquiries/${id}/order`, { method: "POST" });
      router.push(`/admin/orders/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-extrabold">Запитвания</h1>
          <Link href="/admin/reports" className="text-sm font-semibold text-accent hover:underline">
            Отчет по канали →
          </Link>
        </div>
        <div className="flex gap-1.5">
          {(["", ...statuses] as const).map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === s ? "bg-ink text-paper" : "bg-card ring-1 ring-line hover:ring-ink"
              }`}
            >
              {s ? inquiryStatusLabels[s] : "Всички"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-accent-dark">{error}</p>}
      {notice && (
        <p className="mb-3 rounded-xl border border-ok/40 bg-ok/10 p-3 text-sm">
          Създадена е потенциална поръчка:{" "}
          <Link href={`/admin/orders/${notice.orderId}`} className="font-semibold underline">
            Поръчка #{notice.orderId}
          </Link>
        </p>
      )}
      {data?.items.length === 0 && <p className="text-sm text-muted">Няма запитвания.</p>}

      <ul className="space-y-3">
        {data?.items.map((q) => (
          <li key={q.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold">{q.name || q.phone || "Без име"}</p>
                <p className="text-sm text-muted">
                  {[q.phone, q.email].filter(Boolean).join(" · ")} · {formatDate(q.createdAt)}
                </p>
                <p className="mt-1 text-sm">
                  {q.carId ? (
                    <Link href={`/admin/cars/${q.carId}`} className="font-semibold text-accent hover:underline">
                      {q.carTitle}
                    </Link>
                  ) : (
                    <span className="font-semibold">Общо запитване („Изпрати ни запитване“)</span>
                  )}
                </p>
              </div>
              <select
                value={q.status}
                onChange={(e) => setStatus(q.id, e.target.value as InquiryStatus)}
                className="field w-auto py-1.5! text-sm"
                aria-label="Статус"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {inquiryStatusLabels[s]}
                  </option>
                ))}
              </select>
            </div>
            {q.message && <p className="mt-3 text-sm whitespace-pre-line text-ink-soft">{q.message}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {q.orderId != null && (
                <>
                  <Link href={`/admin/orders/${q.orderId}`} className="font-semibold text-accent hover:underline">
                    Поръчка #{q.orderId}
                  </Link>
                  {q.orderStatus && <OrderStatusChip status={q.orderStatus} />}
                </>
              )}
              <button type="button" className="btn-ghost px-3! py-1!" onClick={() => void openOrder(q.id)}>
                {q.orderId != null ? "Отвори поръчката" : "Създай поръчка"}
              </button>
            </div>
            {(q.otherInquiryIds.length > 0 || q.otherOrderIds.length > 0) && (
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="font-semibold text-ink">Познат клиент:</span>
                {q.otherOrderIds.map((id) => (
                  <Link key={`o${id}`} href={`/admin/orders/${id}`} className="font-semibold text-accent hover:underline">
                    Поръчка #{id}
                  </Link>
                ))}
                {q.otherInquiryIds.map((id) => (
                  <span key={`i${id}`}>Запитване #{id}</span>
                ))}
              </p>
            )}
            {sourceLine(q) && <p className="mt-2 text-xs break-all text-muted">{sourceLine(q)}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
