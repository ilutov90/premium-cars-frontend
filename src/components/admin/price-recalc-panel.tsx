"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { PostedChips } from "@/components/admin/posted-chips";
import { formatDate, formatEur, sourceLabels, statusLabels } from "@/lib/format";
import type { CarSource, PageResponse, PriceRecalcItem, PriceRecalcRun } from "@/lib/types";

const scopes: [CarSource | "", string][] = [
  ["", "Всички сайтове"],
  ["AUTOWINI", "autowini"],
  ["GUAZI", "guazi"],
  ["AUTOHOME", "autohome"],
  ["MANUAL", "Ръчно добавени"],
];

const modeLabels: Record<PriceRecalcRun["mode"], string> = {
  STORED: "от записаната ФОБ",
  SOURCE: "с ФОБ от сайта на продавача",
};

function scopeLabel(scope: string) {
  return scope === "ALL" ? "всички сайтове" : (sourceLabels[scope as CarSource] ?? scope);
}

/**
 * "Преизчисляване на цените": only by hand, per site or all, from the kept FOB or read again from each listing;
 * the reports of the past recalculations with the cars whose price changed and where they were posted.
 */
export function PriceRecalcPanel() {
  const { adminFetch } = useAdmin();
  const [scope, setScope] = useState<CarSource | "">("");
  const [runs, setRuns] = useState<PriceRecalcRun[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      adminFetch<PriceRecalcRun[]>("/api/admin/pricing-profiles/recalculations")
        .then(setRuns)
        .catch((e: Error) => setError(e.message)),
    [adminFetch],
  );

  useEffect(() => {
    load();
  }, [load]);

  const running = runs?.some((r) => r.status === "RUNNING") ?? false;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [running, load]);

  async function start(mode: PriceRecalcRun["mode"]) {
    const what = scope ? `колите от ${scopes.find(([v]) => v === scope)?.[1]}` : "всички коли";
    const text =
      mode === "STORED"
        ? `Преизчисляване на цените на ${what} по днешните формули и курсове, от ФОБ цената, записана при импорта. Новите цени веднага се показват в сайта (колите с ръчно въведена крайна цена не се пипат). Продължаваш ли?`
        : `Преизчисляване на цените на ${what}, като ФОБ цената се изтегля наново от обявата при продавача — по една обява в секунда, за хиляди коли това са часове. Новите цени веднага се показват в сайта. Продължаваш ли?`;
    if (!window.confirm(text)) return;
    setBusy(true);
    setError(null);
    try {
      const run = await adminFetch<PriceRecalcRun>("/api/admin/pricing-profiles/recalculations", {
        method: "POST",
        body: JSON.stringify({ source: scope || null, mode }),
      });
      setOpen(run.id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Да се изтрие ли този отчет? Цените остават.")) return;
    try {
      await adminFetch(`/api/admin/pricing-profiles/recalculations/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-line bg-card p-5">
      <h2 className="text-lg font-bold">Преизчисляване на цените</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Промяна на формулата или курса не пипа цените на качените коли. Тук ги преизчисляваш ръчно, когато прецениш.
        В отчета остават колите с променена цена и къде са публикувани (Facebook, Instagram, Viber, mobile.bg), за да
        ги обновиш и там.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="recalc-scope">
            Кои коли
          </label>
          <select
            id="recalc-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as CarSource | "")}
            className="field w-auto py-2!"
          >
            {scopes.map(([v, label]) => (
              <option key={label} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" disabled={busy || running} onClick={() => start("STORED")} className="btn-primary">
          Преизчисли от записаната ФОБ
        </button>
        <button
          type="button"
          disabled={busy || running || scope === "MANUAL"}
          onClick={() => start("SOURCE")}
          className="btn-ghost"
          title={scope === "MANUAL" ? "Ръчно добавените коли нямат обява, от която да се изтегли цената" : undefined}
        >
          Изтегли ФОБ наново от сайтовете и преизчисли
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        „От записаната ФОБ“ отнема секунди. „Изтегли наново“ отваря всяка обява (по една в секунда) и хваща смяна на
        цената при продавача; ако обявата не може да се прочете, колата се преизчислява от записаната ФОБ и се показва
        в отчета.
      </p>
      {error && <p className="mt-3 text-sm font-semibold text-warn">{error}</p>}

      {runs && runs.length > 0 && (
        <div className="mt-6 space-y-2">
          {runs.map((r) => (
            <RunRow
              key={r.id}
              run={r}
              open={open === r.id}
              onToggle={() => setOpen(open === r.id ? null : r.id)}
              onDelete={() => remove(r.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RunRow({
  run,
  open,
  onToggle,
  onDelete,
}: {
  run: PriceRecalcRun;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const pct = run.total > 0 ? Math.round((run.processed / run.total) * 100) : 100;
  return (
    <div className="rounded-xl bg-paper ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-sm">
        <button type="button" onClick={onToggle} className="font-semibold hover:underline">
          {open ? "▾" : "▸"} {formatDate(run.startedAt)} · {scopeLabel(run.scope)} · {modeLabels[run.mode]}
        </button>
        {run.status === "RUNNING" ? (
          <span className="font-semibold text-accent">
            Върви: {run.processed} от {run.total} ({pct}%)
          </span>
        ) : (
          <span className={run.status === "DONE" ? "text-ok" : "text-warn"}>
            {run.status === "DONE" ? "Готово" : "Прекъснато"}
          </span>
        )}
        <span className="text-muted">
          {run.changed} с нова цена · {run.fixedPrice} с ръчна цена (непроменени)
          {run.mode === "SOURCE" && ` · ${run.failed} непрочетени обяви`} · общо {run.total}
        </span>
        {run.startedBy && <span className="text-xs text-muted">пуснато от {run.startedBy}</span>}
        {run.status !== "RUNNING" && (
          <button type="button" onClick={onDelete} className="ml-auto text-xs font-semibold text-muted hover:text-warn">
            Изтрий отчета
          </button>
        )}
      </div>
      {run.message && <p className="px-3 pb-2 text-xs text-warn">{run.message}</p>}
      {open && <RunReport run={run} />}
    </div>
  );
}

function RunReport({ run }: { run: PriceRecalcRun }) {
  const { adminFetch } = useAdmin();
  const [kind, setKind] = useState<"" | "CHANGED" | "FAILED">("CHANGED");
  const [onlyPosted, setOnlyPosted] = useState(false);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<PageResponse<PriceRecalcItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams({ page: String(page), size: "50", posted: String(onlyPosted) });
    if (kind) p.set("kind", kind);
    let cancelled = false;
    adminFetch<PageResponse<PriceRecalcItem>>(`/api/admin/pricing-profiles/recalculations/${run.id}/items?${p}`)
      .then((r) => !cancelled && setItems(r))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [adminFetch, run.id, run.processed, kind, onlyPosted, page]);

  return (
    <div className="border-t border-line p-3">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as typeof kind);
            setPage(0);
          }}
          className="field w-auto py-1.5!"
          aria-label="Вид"
        >
          <option value="CHANGED">С нова цена</option>
          {run.mode === "SOURCE" && <option value="FAILED">Непрочетени обяви</option>}
          <option value="">Всички</option>
        </select>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyPosted}
            onChange={(e) => {
              setOnlyPosted(e.target.checked);
              setPage(0);
            }}
          />
          Само публикуваните (за обновяване)
        </label>
        {items && <span className="text-muted">{items.totalItems} коли</span>}
      </div>
      {error && <p className="text-sm text-warn">{error}</p>}
      {items && items.items.length === 0 && <p className="text-sm text-muted">Няма коли.</p>}
      {items && items.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 pr-3 font-semibold">Кола</th>
                <th className="py-1 pr-3 font-semibold">Стара цена</th>
                <th className="py-1 pr-3 font-semibold">Нова цена</th>
                <th className="py-1 pr-3 font-semibold">Публикувана</th>
              </tr>
            </thead>
            <tbody>
              {items.items.map((i) => {
                const diff = i.oldPriceEur != null && i.newPriceEur != null ? i.newPriceEur - i.oldPriceEur : null;
                return (
                  <tr key={i.id} className="border-t border-line align-top">
                    <td className="py-2 pr-3">
                      {i.carId ? (
                        <Link href={`/admin/cars/${i.carId}`} className="font-semibold hover:underline">
                          {i.title ?? `#${i.carId}`}
                        </Link>
                      ) : (
                        <span className="font-semibold">{i.title ?? "изтрита кола"}</span>
                      )}
                      <span className="block text-xs text-muted">
                        {i.source ? sourceLabels[i.source] : ""}
                        {i.carStatus && ` · ${statusLabels[i.carStatus]}`}
                        {i.oldSourcePrice != null &&
                          i.newSourcePrice != null &&
                          i.oldSourcePrice !== i.newSourcePrice &&
                          ` · ФОБ ${i.oldSourcePrice} → ${i.newSourcePrice} ${i.sourceCurrency ?? ""}`}
                      </span>
                      {i.note && <span className="block text-xs text-warn">{noteLabel(i.note)}</span>}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatEur(i.oldPriceEur)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <strong>{formatEur(i.newPriceEur)}</strong>
                      {diff != null && diff !== 0 && (
                        <span className={`block text-xs ${diff > 0 ? "text-warn" : "text-ok"}`}>
                          {diff > 0 ? "+" : "−"}
                          {formatEur(Math.abs(diff))}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <PostedChips posted={i.posted} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {items && items.totalPages > 1 && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="btn-ghost px-3! py-1!">
            ‹ Предишна
          </button>
          <span className="text-muted">
            Страница {page + 1} от {items.totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= items.totalPages}
            onClick={() => setPage(page + 1)}
            className="btn-ghost px-3! py-1!"
          >
            Следваща ›
          </button>
        </div>
      )}
    </div>
  );
}

/** The backend's notes in Bulgarian. */
function noteLabel(note: string): string {
  if (note.startsWith("The source's price changed")) return "Продавачът е сменил цената.";
  if (note.startsWith("The listing shows no price now"))
    return "Обявата вече няма цена (продадена или търг?) — преизчислена от записаната ФОБ.";
  if (note.startsWith("The listing could not be read"))
    return `Обявата не можа да се прочете — преизчислена от записаната ФОБ. (${note.replace(/^The listing could not be read \((.*)\).*$/, "$1")})`;
  return note;
}
