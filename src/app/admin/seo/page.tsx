"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AdminApiError, useAdmin } from "@/components/admin/admin-context";
import { formatDate } from "@/lib/format";
import {
  SEO_LIMITS,
  seoAutoDescription,
  seoAutoText,
  seoAutoTitle,
  seoMakePath,
  seoModelPath,
} from "@/lib/seo-pages";
import { site } from "@/lib/site";
import type { AdminSeoPage, SaveSeoPageRequest, SeoPage } from "@/lib/types";

const rowKey = (r: { makeSlug: string; modelSlug: string | null }) => `${r.makeSlug}/${r.modelSlug ?? ""}`;
const pagePath = (r: AdminSeoPage) => (r.modelSlug ? seoModelPath(r.makeSlug, r.modelSlug) : seoMakePath(r.makeSlug));
const hasOwn = (r: AdminSeoPage) => Boolean(r.title || r.description || r.text);

export default function AdminSeoPages() {
  const { adminFetch } = useAdmin();
  const [rows, setRows] = useState<AdminSeoPage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ownOnly, setOwnOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminFetch<AdminSeoPage[]>("/api/admin/seo/pages")
      .then((r) => !cancelled && setRows(r))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [adminFetch]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) => (!ownOnly || hasOwn(r)) && (!q || `${r.make} ${r.model ?? ""}`.toLowerCase().includes(q)),
    );
  }, [rows, query, ownOnly]);

  const saved = (row: AdminSeoPage) =>
    setRows((list) => list?.map((r) => (rowKey(r) === rowKey(row) ? { ...r, ...row } : r)) ?? null);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">SEO страници</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Всяка марка и всеки модел с поне една кола на сайта има собствена страница. Текстовете се пишат сами от
          данните (брой коли, години, цени) и се обновяват сами. Тук можете да ги замените със свои за най-важните
          модели; празно поле значи автоматичен текст.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          className="field w-64!"
          placeholder="Търсене по марка или модел"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ownOnly} onChange={(e) => setOwnOnly(e.target.checked)} />
          Само със собствен текст
        </label>
        {rows && (
          <span className="text-sm text-muted">
            {shown.length} от {rows.length} страници
          </span>
        )}
      </div>

      {error && <p className="mb-4 text-sm font-semibold text-danger">{error}</p>}
      {!rows && !error && <p className="text-sm text-muted">Зареждане…</p>}

      {rows && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted uppercase">
                <th className="px-4 py-2.5 font-semibold">Марка / модел</th>
                <th className="px-4 py-2.5 text-right font-semibold">Коли</th>
                <th className="px-4 py-2.5 font-semibold">Текст</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const key = rowKey(r);
                const isOpen = open === key;
                return (
                  <Fragment key={key}>
                    <tr
                      className={`cursor-pointer border-b border-line hover:bg-ink/5 ${isOpen ? "bg-ink/5" : ""}`}
                      onClick={() => setOpen(isOpen ? null : key)}
                    >
                      <td className="px-4 py-2.5">
                        {r.model ? (
                          <span className="pl-5">
                            <span className="text-muted">{r.make} </span>
                            <span className="font-semibold">{r.model}</span>
                          </span>
                        ) : (
                          <span className="font-extrabold">{r.make}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.count}</td>
                      <td className="px-4 py-2.5">
                        {hasOwn(r) ? (
                          <span className="font-semibold text-ok">Собствен</span>
                        ) : (
                          <span className="text-muted">Автоматичен</span>
                        )}
                        {r.count === 0 && <span className="ml-2 text-xs text-danger">няма коли</span>}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-line">
                        <td colSpan={3} className="px-4 py-4">
                          <Editor row={r} onSaved={saved} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    Няма страници по това търсене.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Field = "title" | "description" | "text";

function Editor({ row, onSaved }: { row: AdminSeoPage; onSaved: (row: AdminSeoPage) => void }) {
  const { adminFetch } = useAdmin();
  const [values, setValues] = useState<Record<Field, string>>({
    title: row.title ?? "",
    description: row.description ?? "",
    text: row.text ?? "",
  });
  // undefined = loading, null = the page does not exist (no cars)
  const [page, setPage] = useState<SeoPage | null | undefined>(undefined);
  const [state, setState] = useState<{ kind: "idle" | "saving" | "saved" } | { kind: "error"; message: string }>({
    kind: "idle",
  });

  useEffect(() => {
    let cancelled = false;
    const path = `/api/public/seo/pages/${encodeURIComponent(row.makeSlug)}${row.modelSlug ? `/${encodeURIComponent(row.modelSlug)}` : ""}`;
    adminFetch<SeoPage>(path)
      .then((p) => !cancelled && setPage(p))
      .catch((e: unknown) => {
        if (cancelled) return;
        setPage(null);
        if (!(e instanceof AdminApiError && e.status === 404)) {
          setState({ kind: "error", message: e instanceof Error ? e.message : "Грешка" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [adminFetch, row.makeSlug, row.modelSlug]);

  const auto: Record<Field, string> | null = page
    ? { title: seoAutoTitle(page), description: seoAutoDescription(page), text: seoAutoText(page).join("\n\n") }
    : null;

  const save = async (body: SaveSeoPageRequest) => {
    setState({ kind: "saving" });
    try {
      const savedRow = await adminFetch<AdminSeoPage>("/api/admin/seo/pages", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      onSaved(savedRow);
      setValues({ title: savedRow.title ?? "", description: savedRow.description ?? "", text: savedRow.text ?? "" });
      setState({ kind: "saved" });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Грешка" });
    }
  };

  const blankToNull = (v: string) => (v.trim() ? v.trim() : null);
  const onSave = () =>
    save({
      makeSlug: row.makeSlug,
      modelSlug: row.modelSlug,
      title: blankToNull(values.title),
      description: blankToNull(values.description),
      text: blankToNull(values.text),
    });
  const onReset = () => {
    if (!window.confirm("Да изтрия ли собствените текстове на тази страница? Ще се показват автоматичните.")) return;
    save({ makeSlug: row.makeSlug, modelSlug: row.modelSlug, title: null, description: null, text: null });
  };

  const tooLong = (Object.keys(SEO_LIMITS) as Field[]).some((f) => values[f].length > SEO_LIMITS[f]);
  const fields: [Field, string, string][] = [
    ["title", "Заглавие", `Заглавие в Google и при споделяне; „ · ${site.brandName}“ се добавя само.`],
    ["description", "Описание за Google", "Текстът под заглавието в резултатите от търсене."],
    ["text", "Текст на страницата", "Въведението над колите. Празен ред започва нов абзац."],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-bold">{pagePath(row)}</span>
          {row.updatedAt && <span className="ml-2 text-muted">променен {formatDate(row.updatedAt)}</span>}
        </p>
        {row.count > 0 && (
          <a href={pagePath(row)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-accent">
            Виж страницата ↗
          </a>
        )}
      </div>
      {page === null && (
        <p className="text-sm text-muted">
          В момента няма коли за тази страница, затова тя не се показва на сайта. Текстовете ѝ остават запазени.
        </p>
      )}
      {fields.map(([field, label, help]) => {
        const id = `seo-${field}`;
        const value = values[field];
        const limit = SEO_LIMITS[field];
        const placeholder = auto?.[field] ?? (page === undefined ? "Зареждане…" : "");
        return (
          <div key={field}>
            <div className="flex items-baseline justify-between gap-3">
              <label className="label" htmlFor={id}>
                {label}
              </label>
              <span className={`text-xs tabular-nums ${value.length > limit ? "font-bold text-danger" : "text-muted"}`}>
                {value.length} / {limit}
              </span>
            </div>
            {field === "text" ? (
              <textarea
                id={id}
                className="field min-h-40"
                value={value}
                placeholder={placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
              />
            ) : (
              <input
                id={id}
                className="field"
                value={value}
                placeholder={placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
              />
            )}
            <p className="mt-1 text-xs text-muted">
              {help}
              {auto && value.trim() && (
                <>
                  {" "}
                  <span className="whitespace-pre-line">Автоматично: {auto[field]}</span>
                </>
              )}
            </p>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={onSave} disabled={state.kind === "saving" || tooLong}>
          {state.kind === "saving" ? "Записване…" : "Запиши"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={onReset}
          disabled={state.kind === "saving" || !hasOwn(row)}
        >
          Върни автоматичния текст
        </button>
        {state.kind === "saved" && <span className="text-sm font-semibold text-ok">Записано.</span>}
        {state.kind === "error" && <span className="text-sm font-semibold text-danger">{state.message}</span>}
      </div>
    </div>
  );
}
