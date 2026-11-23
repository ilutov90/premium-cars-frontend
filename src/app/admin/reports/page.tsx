"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { formatDay, heardFromLabels, inquiryStatusLabels, lostReasonLabels } from "@/lib/format";
import type { Funnel, HeardFrom, InquiryReport, InquiryStatus, LostReason } from "@/lib/types";

/** yyyy-MM-dd of a local day. */
function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function daysBack(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { from: isoDay(from), to: isoDay(to) };
}

const presets: [number, string][] = [
  [7, "7 дни"],
  [30, "30 дни"],
  [90, "90 дни"],
];

/** Inquiries per channel, campaign, car and week: which marketing brings customers. */
export default function AdminReportsPage() {
  const { adminFetch } = useAdmin();
  const [range, setRange] = useState(() => daysBack(30));
  const [report, setReport] = useState<InquiryReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminFetch<InquiryReport>(`/api/admin/reports/inquiries?from=${range.from}&to=${range.to}`)
      .then((r) => {
        if (cancelled) return;
        setReport(r);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [adminFetch, range]);

  const preset = presets.find(([d]) => {
    const r = daysBack(d);
    return r.from === range.from && r.to === range.to;
  })?.[0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Отчет за запитванията</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Откъде идват клиентите. „Откъде научихте“ е отговорът на клиента във формата; „Линк“ е източникът от
            линка, по който е дошъл (Facebook, Viber, mobile.bg — линковете в публикациите го носят сами). Запитванията
            по телефон и в Messenger не влизат тук: записвайте ги в таблицата с клиенти.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map(([days, label]) => (
            <button
              key={days}
              type="button"
              onClick={() => setRange(daysBack(days))}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                preset === days ? "bg-ink text-paper" : "bg-card ring-1 ring-line hover:ring-ink"
              }`}
            >
              {label}
            </button>
          ))}
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })}
            className="field w-auto! py-1.5! text-xs!"
            aria-label="От"
          />
          <span className="text-xs text-muted">до</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })}
            className="field w-auto! py-1.5! text-xs!"
            aria-label="До"
          />
        </div>
      </div>

      {error && <p className="text-sm text-accent-dark">{error}</p>}

      {report && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label={`Запитвания ${formatDay(report.from)} – ${formatDay(report.to)}`} value={report.total} />
            {(Object.keys(inquiryStatusLabels) as InquiryStatus[]).map((s) => (
              <Stat
                key={s}
                label={inquiryStatusLabels[s]}
                value={report.byStatus.find((c) => c.key === s)?.count ?? 0}
              />
            ))}
          </div>

          {report.total === 0 ? (
            <p className="mt-6 text-sm text-muted">Няма запитвания за този период.</p>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Bars
                title="Откъде научихте за нас?"
                rows={report.byHeardFrom.map((c) => ({
                  label: c.key ? (heardFromLabels[c.key as HeardFrom] ?? c.key) : "Не е посочено",
                  count: c.count,
                  muted: !c.key,
                }))}
              />
              <Bars
                title="Линк (utm_source)"
                rows={report.byUtmSource.map((c) => ({
                  label: c.key ?? "Без проследен линк",
                  count: c.count,
                  muted: !c.key,
                }))}
              />
              <Bars
                title="Кампания (utm_campaign)"
                rows={report.byUtmCampaign.map((c) => ({
                  label: c.key ?? "Без кампания",
                  count: c.count,
                  muted: !c.key,
                }))}
              />
              <Bars
                title="По седмици (от понеделник)"
                rows={report.byWeek.map((w) => ({ label: `седмица от ${formatDay(w.weekStart)}`, count: w.count }))}
              />
              <Bars
                title="По коли (до 20)"
                wide
                rows={report.byCar.map((c) => ({
                  label: c.carId ? (c.carTitle ?? `#${c.carId}`) : "Общо запитване („Изпрати ни запитване“) или изтрита кола",
                  href: c.carId ? `/admin/cars/${c.carId}` : undefined,
                  count: c.count,
                  muted: !c.carId,
                }))}
              />
            </div>
          )}

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-extrabold">От запитване до продажба</h2>
            <div className="space-y-4">
              <FunnelTable title="По линк (utm_source)" rows={report.funnelBySource} none="Без проследен линк" />
              <FunnelTable title="По кампания (utm_campaign)" rows={report.funnelByCampaign} none="Без кампания" />
              <FunnelTable
                title="Откъде научихте за нас?"
                rows={report.funnelByHeardFrom}
                none="Не е посочено"
                label={(k) => heardFromLabels[k as HeardFrom] ?? k}
              />
              <Bars
                title="Причини за отказ"
                rows={report.lostReasons.map((c) => ({
                  label: c.key ? (lostReasonLabels[c.key as LostReason] ?? c.key) : "Без причина",
                  count: c.count,
                  muted: !c.key,
                }))}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function FunnelTable({
  title,
  rows,
  none,
  label,
}: {
  title: string;
  rows: Funnel[];
  none: string;
  label?: (key: string) => string;
}) {
  return (
    <section className="overflow-x-auto rounded-2xl border border-line bg-card p-4">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Няма данни.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1 pr-3 font-semibold">Канал</th>
              <th className="px-2 py-1 text-right font-semibold">Запитвания</th>
              <th className="px-2 py-1 text-right font-semibold">Поръчки</th>
              <th className="px-2 py-1 text-right font-semibold">Договори</th>
              <th className="px-2 py-1 text-right font-semibold">Доставени</th>
              <th className="px-2 py-1 text-right font-semibold">Отказани</th>
              <th className="py-1 pl-2 text-right font-semibold">% договори</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key ?? "none"} className="border-t border-line tabular-nums">
                <td className={`py-1.5 pr-3 ${r.key ? "font-semibold" : "text-muted"}`}>{r.key ? (label ? label(r.key) : r.key) : none}</td>
                <td className="px-2 py-1.5 text-right">{r.inquiries}</td>
                <td className="px-2 py-1.5 text-right">{r.orders}</td>
                <td className="px-2 py-1.5 text-right">{r.agreed}</td>
                <td className="px-2 py-1.5 text-right">{r.delivered}</td>
                <td className="px-2 py-1.5 text-right">{r.lost}</td>
                <td className="py-1.5 pl-2 text-right font-semibold">
                  {r.inquiries > 0 ? `${Math.round((r.agreed / r.inquiries) * 100)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

type Row = { label: string; count: number; href?: string; muted?: boolean };

/** One measure per row: the number is always written, the bar only shows the size against the largest row. */
function Bars({ title, rows, wide }: { title: string; rows: Row[]; wide?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className={`rounded-2xl border border-line bg-card p-4 ${wide ? "lg:col-span-2" : ""}`}>
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Няма данни.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={`${r.label}-${r.href ?? ""}`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                {r.href ? (
                  <Link href={r.href} className="min-w-0 truncate font-semibold hover:underline">
                    {r.label}
                  </Link>
                ) : (
                  <span className={`min-w-0 truncate ${r.muted ? "text-muted" : "font-semibold"}`}>{r.label}</span>
                )}
                <span className="shrink-0 font-semibold tabular-nums">{r.count}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-paper">
                <div
                  className={`h-1.5 rounded-full ${r.muted ? "bg-muted/40" : "bg-accent"}`}
                  style={{ width: `${Math.max(2, (r.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
