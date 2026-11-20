"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdmin } from "@/components/admin/admin-context";
import { formatDate, formatEur } from "@/lib/format";
import type { RemovedGroupBy, RemovedReport, RemovedRow, RemovedSource } from "@/lib/types";

type View = {
  days: "7" | "30" | "90" | "all";
  source: "" | RemovedSource;
  groupBy: RemovedGroupBy;
  make: string;
  model: string;
};

const periods: [View["days"], string][] = [
  ["7", "7 дни"],
  ["30", "30 дни"],
  ["90", "90 дни"],
  ["all", "Всички"],
];

const groupings: [RemovedGroupBy, string][] = [
  ["make", "По марка"],
  ["model", "По модел"],
  ["year", "По година"],
  ["make_year", "Марка + година"],
  ["model_year", "Модел + година"],
];

const PAGE = 50;

function readView(p: URLSearchParams): View {
  const days = p.get("days");
  const source = p.get("source");
  const groupBy = p.get("groupBy");
  return {
    days: days === "7" || days === "90" || days === "all" ? days : "30",
    source: source === "AUTOWINI" || source === "GUAZI" || source === "AUTOTRADER_CA" ? source : "",
    groupBy: groupings.some(([g]) => g === groupBy) ? (groupBy as RemovedGroupBy) : "make",
    make: p.get("make") ?? "",
    model: p.get("model") ?? "",
  };
}

function writeView(v: View): string {
  const p = new URLSearchParams();
  if (v.days !== "30") p.set("days", v.days);
  if (v.source) p.set("source", v.source);
  if (v.groupBy !== "make") p.set("groupBy", v.groupBy);
  if (v.make) p.set("make", v.make);
  if (v.model) p.set("model", v.model);
  return p.toString();
}

function requestKey(v: View): string {
  const p = new URLSearchParams({ groupBy: v.groupBy });
  if (v.days !== "all") p.set("days", v.days);
  if (v.source) p.set("source", v.source);
  if (v.make) p.set("make", v.make);
  if (v.model) p.set("model", v.model);
  return p.toString();
}

function rowName(r: RemovedRow): string {
  const name = [r.make, r.model].filter(Boolean).join(" ");
  const parts = [name, r.year != null ? String(r.year) : ""].filter(Boolean);
  return parts.join(" · ") || "Неизвестно";
}

/** Only a make or a model row leads further down; the year groupings are the last step. */
function canDrill(v: View): boolean {
  return v.groupBy === "make" || v.groupBy === "model";
}

export default function AdminRemovedPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Зареждане…</p>}>
      <AdminRemoved />
    </Suspense>
  );
}

function AdminRemoved() {
  const { adminFetch } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>(() => readView(new URLSearchParams(searchParams.toString())));
  const [report, setReport] = useState<RemovedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [resetting, setResetting] = useState(false);
  const [reloads, setReloads] = useState(0);

  const change = (c: Partial<View>) => {
    setShown(PAGE);
    setView((v) => ({ ...v, ...c }));
  };

  useEffect(() => {
    const query = writeView(view);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [view, router, pathname]);

  useEffect(() => {
    const key = requestKey(view);
    let cancelled = false;
    adminFetch<RemovedReport>(`/api/admin/reports/removed?${key}`)
      .then((r) => {
        if (cancelled) return;
        setReport(r);
        setError(null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setReport(null);
        setError(e.message);
      })
      .finally(() => !cancelled && setDoneKey(key));
    return () => {
      cancelled = true;
    };
  }, [adminFetch, view, reloads]);

  const resetStats = async () => {
    if (
      !window.confirm(
        "Статистиката ще започне да брои отначало, от този момент. Старите записи остават в отчетите на пусканията, но няма да се броят тук. Да нулирам ли?",
      )
    )
      return;
    setResetting(true);
    try {
      await adminFetch("/api/admin/reports/removed/reset", { method: "POST" });
      setError(null);
      setReloads((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    } finally {
      setResetting(false);
    }
  };

  const drill = (r: RemovedRow) => {
    if (view.groupBy === "make" && r.make) change({ make: r.make, model: "", groupBy: "model" });
    else if (view.groupBy === "model" && r.model)
      change({ make: r.make ?? view.make, model: r.model, groupBy: "model_year" });
  };

  const back = () => {
    if (view.model) change({ model: "", groupBy: "model" });
    else if (view.make) change({ make: "", groupBy: "make" });
  };

  const loading = doneKey !== requestKey(view);
  const rows = report?.rows ?? [];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">Изчезнали обяви</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Обява, която изчезне от сайта-източник, най-често е продадена, но не винаги: guazi понякога сваля обява и я
          пуска отново под нов номер, затова бройките за Китай са завишени. Броят се само колите, които сме имали в
          каталога, от марките в нашите филтри. Коли, изтрити защото моделът или марката им са махнати от филтрите, не се
          броят.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {periods.map(([days, label]) => (
            <button
              key={days}
              type="button"
              onClick={() => change({ days })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                view.days === days ? "bg-ink text-paper" : "bg-card ring-1 ring-line hover:ring-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className="field w-auto! py-1.5! text-xs!"
          aria-label="Сайт"
          value={view.source}
          onChange={(e) => change({ source: e.target.value as View["source"] })}
        >
          <option value="">Всички сайтове</option>
          <option value="AUTOWINI">autowini (Корея)</option>
          <option value="GUAZI">guazi (Китай)</option>
          <option value="AUTOTRADER_CA">autotrader.ca (Канада)</option>
        </select>
        <select
          className="field w-auto! py-1.5! text-xs!"
          aria-label="Групиране"
          value={view.groupBy}
          onChange={(e) => change({ groupBy: e.target.value as RemovedGroupBy })}
        >
          {groupings.map(([g, label]) => (
            <option key={g} value={g}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="field w-auto! py-1.5! text-xs!"
          aria-label="Марка"
          value={view.make}
          onChange={(e) =>
            change({ make: e.target.value, model: "", groupBy: e.target.value && view.groupBy === "make" ? "model" : view.groupBy })
          }
        >
          <option value="">Всички марки</option>
          {view.make && !report?.makes.includes(view.make) && <option value={view.make}>{view.make}</option>}
          {report?.makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {view.make && (
          <select
            className="field w-auto! py-1.5! text-xs!"
            aria-label="Модел"
            value={view.model}
            onChange={(e) => change({ model: e.target.value })}
          >
            <option value="">Всички модели</option>
            {view.model && !report?.models.includes(view.model) && <option value={view.model}>{view.model}</option>}
            {report?.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
        {(view.make || view.model) && (
          <button type="button" onClick={back} className="btn-ghost px-3! py-1.5! text-xs!">
            ← Назад
          </button>
        )}
        <button
          type="button"
          onClick={resetStats}
          disabled={resetting}
          className="btn-ghost ml-auto px-3! py-1.5! text-xs!"
        >
          Нулирай статистиката
        </button>
      </div>

      {(view.make || view.model) && (
        <p className="mb-3 text-sm text-muted">
          <button type="button" className="hover:underline" onClick={() => change({ make: "", model: "", groupBy: "make" })}>
            Всички марки
          </button>
          {view.make && (
            <>
              {" / "}
              <button
                type="button"
                className="hover:underline"
                onClick={() => change({ model: "", groupBy: "model" })}
              >
                {view.make}
              </button>
            </>
          )}
          {view.model && <> / {view.model}</>}
        </p>
      )}

      {error && <p className="text-sm text-accent-dark">{error}</p>}
      {loading && !report && !error && <p className="text-sm text-muted">Зареждане…</p>}

      {report && (
        <div className={loading ? "opacity-60" : ""}>
          <p className="mb-4 text-sm">
            <span className="font-semibold">Изчезнали обяви: {report.total}</span>
            {report.unrecognized > 0 && <span className="text-muted"> · Неразпознати: {report.unrecognized}</span>}
            {report.statsFrom ? (
              <span className="text-muted"> · Брои се от {formatDate(report.statsFrom)}</span>
            ) : (
              report.firstRemovedAt && (
                <span className="text-muted"> · Данните са от {formatDate(report.firstRemovedAt)}</span>
              )
            )}
          </p>

          {rows.length === 0 ? (
            <p className="text-sm text-muted">Няма изчезнали обяви за този избор.</p>
          ) : (
            <div className="grid gap-6">
              <section className="rounded-2xl border border-line bg-card p-4">
                <h2 className="mb-3 text-sm font-bold">Най-много изчезнали (до 15)</h2>
                <ul className="space-y-2">
                  {rows.slice(0, 15).map((r, i) => (
                    <BarRow key={i} row={r} max={rows[0].count} clickable={canDrill(view)} onClick={() => drill(r)} />
                  ))}
                </ul>
              </section>

              {view.days !== "7" && (
                <section className="rounded-2xl border border-line bg-card p-4">
                  <h2 className="mb-3 text-sm font-bold">По седмици</h2>
                  <WeekChart weeks={report.weeks} />
                </section>
              )}

              <section className="overflow-x-auto rounded-2xl border border-line bg-card p-4">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead className="text-xs text-muted">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Име</th>
                      <th className="px-3 py-2 text-right font-semibold">Брой</th>
                      <th className="px-3 py-2 text-right font-semibold">Дял %</th>
                      <th className="px-3 py-2 text-right font-semibold">Средна крайна цена</th>
                      <th className="py-2 pl-3 text-right font-semibold">Средно дни до изчезване</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, shown).map((r, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="py-2 pr-3 font-semibold">
                          {canDrill(view) ? (
                            <button type="button" className="text-left hover:underline" onClick={() => drill(r)}>
                              {rowName(r)}
                            </button>
                          ) : (
                            rowName(r)
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.sharePct.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.avgPriceEur == null ? "—" : formatEur(r.avgPriceEur)}
                        </td>
                        <td className="py-2 pl-3 text-right tabular-nums">
                          {r.avgDaysListed == null ? "—" : Math.round(r.avgDaysListed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > shown && (
                  <button type="button" className="btn-ghost mt-3 px-4! py-1.5!" onClick={() => setShown((n) => n + PAGE)}>
                    Покажи още ({rows.length - shown})
                  </button>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BarRow({
  row,
  max,
  clickable,
  onClick,
}: {
  row: RemovedRow;
  max: number;
  clickable: boolean;
  onClick: () => void;
}) {
  const name = rowName(row);
  const content = (
    <>
      <span className="w-40 shrink-0 truncate text-left text-sm font-semibold sm:w-56">{name}</span>
      <span className="h-5 min-w-0 flex-1">
        <span
          className="block h-5 rounded bg-accent"
          style={{ width: `${Math.max(2, (row.count / Math.max(1, max)) * 100)}%` }}
        />
      </span>
      <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">{row.count}</span>
    </>
  );
  return (
    <li>
      {clickable ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={`${name}: ${row.count}. Покажи подробно`}
          className="flex w-full items-center gap-3 rounded hover:bg-paper"
        >
          {content}
        </button>
      ) : (
        <div className="flex w-full items-center gap-3">{content}</div>
      )}
    </li>
  );
}

function WeekChart({ weeks }: { weeks: { weekStart: string; count: number }[] }) {
  if (weeks.length === 0) return <p className="text-sm text-muted">Няма данни</p>;
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const step = Math.ceil(weeks.length / 12); // a date under every bar only while they fit
  const label = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}.${m}`;
  };
  return (
    <ol className="flex h-52 items-stretch gap-1 sm:gap-2" aria-label="Изчезнали обяви по седмици">
      {weeks.map((w, i) => (
        <li
          key={w.weekStart}
          className="flex min-w-0 flex-1 flex-col items-center justify-end"
          title={`Седмица от ${label(w.weekStart)}: ${w.count}`}
        >
          <span className="text-[11px] font-semibold tabular-nums">{weeks.length <= 16 ? w.count : ""}</span>
          <span
            className="mt-0.5 w-full max-w-14 rounded-t bg-accent"
            style={{ height: `${Math.max(1, (w.count / max) * 100)}%` }}
          />
          <span className="mt-1 h-4 border-t border-line text-center text-[10px] whitespace-nowrap text-muted w-full">
            {i % step === 0 ? label(w.weekStart) : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}
