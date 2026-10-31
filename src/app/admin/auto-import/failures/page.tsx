"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { formatDate } from "@/lib/format";
import type { AutoImportFailure, AutoImportFailures, AutoImportSource } from "@/lib/types";

const PAGE_SIZE = 50;

const sourceNames: Record<AutoImportSource, string> = { GUAZI: "guazi", AUTOWINI: "autowini" };

const key = (f: AutoImportFailure) => `${f.source}|${f.listingId}`;

/**
 * Every listing the automatic import could not import (3 attempts in the last run), with the reasons grouped:
 * filter, review and delete in a batch. A deleted one that is still at the source is found again the next night.
 */
export default function AutoImportFailuresPage() {
  const { adminFetch } = useAdmin();
  const [source, setSource] = useState<AutoImportSource | "">("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AutoImportFailures | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (source) p.set("source", source);
    if (q.trim()) p.set("q", q.trim());
    return adminFetch<AutoImportFailures>(`/api/admin/auto-import/failures?${p}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [adminFetch, source, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  // the search box: wait until typing pauses
  useEffect(() => {
    if (qInput === q) return;
    const t = setTimeout(() => {
      setQ(qInput);
      setPage(0);
      setSelected(new Set());
    }, 350);
    return () => clearTimeout(t);
  }, [qInput, q]);

  const items = data?.page.items ?? [];
  const allOnPage = items.length > 0 && items.every((f) => selected.has(key(f)));

  function toggle(f: AutoImportFailure, on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(key(f));
      else next.delete(key(f));
      return next;
    });
  }

  function togglePage(on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      items.forEach((f) => (on ? next.add(key(f)) : next.delete(key(f))));
      return next;
    });
  }

  async function remove(all: boolean) {
    const count = all ? (data?.page.totalItems ?? 0) : selected.size;
    if (count === 0) return;
    const what = all ? `всички ${count} по текущия филтър` : `избраните ${count}`;
    if (
      !window.confirm(
        `Да се изтрият ли ${what} от отчета? Ако обявата още е в сайта, следващата нощ ще се опита пак като нова.`,
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    try {
      const body = all
        ? { all: true, source: source || null, text: q.trim() || null }
        : {
            all: false,
            items: [...selected].map((k) => {
              const [s, listingId] = k.split("|");
              return { source: s, listingId };
            }),
          };
      const r = await adminFetch<{ deleted: number }>("/api/admin/auto-import/failures/delete", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMessage(`Изтрити: ${r.deleted.toLocaleString("bg-BG")}`);
      setSelected(new Set());
      setPage(0);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const totalPages = data?.page.totalPages ?? 0;

  return (
    <div>
      <Link href="/admin/auto-import" className="text-sm font-semibold text-muted hover:text-ink">
        ← Автоматичен импорт
      </Link>
      <h1 className="mt-2 text-xl font-extrabold">Неуспешни импорти</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Обявите, които не се импортираха след 3 опита при последното пускане. Ако обявата още е в сайта, следващата нощ
        се опитва пак. Изтриването ги маха от отчета (ако обявата още я има, следващата нощ се опитва като нова).
      </p>

      {data && data.reasons.length > 0 && (
        <section className="mt-6 rounded-2xl bg-card p-5 ring-1 ring-line">
          <h2 className="font-bold">Причини</h2>
          <p className="mt-1 text-xs text-muted">Линковете са съкратени до „…“, а числата до „N“, за да се групират.</p>
          <ul className="mt-3 space-y-1 text-sm">
            {data.reasons.map((r) => (
              <li key={r.reason} className="flex items-baseline gap-3">
                <span className="w-16 shrink-0 text-right font-bold tabular-nums">{r.count.toLocaleString("bg-BG")}</span>
                <button
                  type="button"
                  onClick={() => setQInput(reasonFilter(r.reason))}
                  className="text-left hover:text-accent hover:underline"
                  title="Покажи само тези"
                >
                  {r.reason || "(без причина)"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value as AutoImportSource | "");
              setPage(0);
              setSelected(new Set());
            }}
            className="field w-auto py-2!"
            aria-label="Сайт"
          >
            <option value="">Двата сайта</option>
            <option value="GUAZI">guazi</option>
            <option value="AUTOWINI">autowini</option>
          </select>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Причина, заглавие или номер на обява…"
            aria-label="Търсене"
            className="field w-72 py-2!"
          />
          <span className="ml-auto text-sm text-muted">
            {data ? `${data.page.totalItems.toLocaleString("bg-BG")} неуспешни` : ""}
            {selected.size > 0 && ` · ${selected.size} избрани`}
          </span>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || selected.size === 0}
            onClick={() => remove(false)}
            className="btn-primary px-4! py-2!"
          >
            Изтрий избраните
          </button>
          <button
            type="button"
            disabled={busy || !data || data.page.totalItems === 0}
            onClick={() => remove(true)}
            className="btn-ghost px-4! py-2!"
          >
            Изтрий всички по филтъра
          </button>
          {message && <span className="self-center text-sm text-ok">{message}</span>}
        </div>

        {error && <p className="mb-3 text-sm font-semibold text-warn">{error}</p>}
        {data && items.length === 0 && <p className="text-sm text-muted">Няма неуспешни импорти.</p>}
        {items.length > 0 && (
          <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-line">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      checked={allOnPage}
                      onChange={(e) => togglePage(e.target.checked)}
                      aria-label="Избери всички на страницата"
                    />
                  </th>
                  <th className="p-3">Сайт</th>
                  <th className="p-3">Обява</th>
                  <th className="p-3">Причина</th>
                  <th className="p-3 whitespace-nowrap">Последен опит</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <tr key={key(f)} className="border-t border-line align-top">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(key(f))}
                        onChange={(e) => toggle(f, e.target.checked)}
                        aria-label={`Избери ${f.listingId}`}
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap">{sourceNames[f.source]}</td>
                    <td className="p-3">
                      <a href={f.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                        {f.title ?? f.listingId} ↗
                      </a>
                      <span className="block text-xs text-muted">
                        {f.listingId}
                        {f.price != null && ` · $${f.price.toLocaleString("bg-BG")} FOB`}
                      </span>
                    </td>
                    <td className="p-3 text-muted">{f.error}</td>
                    <td className="p-3 whitespace-nowrap text-muted">{formatDate(f.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="btn-ghost px-3! py-1!">
              ‹ Предишна
            </button>
            <span className="text-muted">
              Страница {page + 1} от {totalPages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage(page + 1)}
              className="btn-ghost px-3! py-1!"
            >
              Следваща ›
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/** The longest part of a grouped reason without "…" or "N", to search for it. */
function reasonFilter(reason: string): string {
  return reason
    .split(/…|\bN\b/)
    .map((s) => s.trim())
    .sort((a, b) => b.length - a.length)[0] ?? "";
}
