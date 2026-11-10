"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdmin } from "@/components/admin/admin-context";
import { CarImage } from "@/components/car-image";
import { Pager } from "@/components/admin/pager";
import { PostedChips } from "@/components/admin/posted-chips";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatEur, formatKm, listingId, sourceLabels } from "@/lib/format";
import type { AdminCarCounts, AdminCarSummary, CarSource, CarStatus, ImportResult, PageResponse } from "@/lib/types";

const tabs: [CarStatus | "", string][] = [
  ["", "Всички"],
  ["DRAFT", "Чернови"],
  ["PUBLISHED", "Публикувани"],
  ["RESERVED", "Резервирани"],
  ["SOLD", "Продадени"],
  ["ARCHIVED", "Архив"],
];

/** Where the cars are posted (backend PostedFilter, sent in lower case). */
const postedFilters: [string, string][] = [
  ["", "Публикувани където и да е или не"],
  ["none", "Никъде не са публикувани"],
  ["any", "Публикувани някъде"],
  ["not_facebook", "Не са във Facebook"],
  ["not_instagram", "Не са в Instagram"],
  ["not_viber", "Не са във Viber"],
  ["not_mobile_bg", "Не са в mobile.bg"],
  ["not_cars_bg", "Не са в cars.bg"],
];

/**
 * Text that names one car: a link to its page on our site (as a customer sends it) or its number ("Обява № 123").
 * Such a search looks in every status, not only in the open tab.
 */
function namesOneCar(q: string): boolean {
  const text = q.trim();
  return /\/cars\/[a-z0-9][a-z0-9-]*/i.test(text) || /^(#|№|no\.?)?\s*\d+$/i.test(text);
}

const sorts: [string, string][] = [
  ["updated", "Последно променени"],
  ["created", "Последно импортирани"],
  ["price_desc", "Цена: най-висока"],
  ["price_asc", "Цена: най-ниска"],
];

const PAGE_SIZE = 48;
const statusValues = tabs.map(([v]) => v).filter(Boolean) as CarStatus[];
const sourceValues = Object.keys(sourceLabels) as CarSource[];

/** The list's state, kept in the address so it survives a reload and can be shared. */
interface ListState {
  status: CarStatus | "";
  q: string;
  source: CarSource | "";
  posted: string;
  sort: string;
  page: number;
}

function readState(p: URLSearchParams): ListState {
  const status = p.get("status");
  const source = p.get("source");
  const sort = p.get("sort");
  const posted = p.get("posted");
  const page = Number(p.get("page"));
  return {
    // drafts by default: the cars waiting for a check
    status: status === "all" ? "" : statusValues.includes(status as CarStatus) ? (status as CarStatus) : "DRAFT",
    q: p.get("q") ?? "",
    source: sourceValues.includes(source as CarSource) ? (source as CarSource) : "",
    posted: postedFilters.some(([v]) => v === posted) ? (posted as string) : "",
    sort: sorts.some(([v]) => v === sort) ? (sort as string) : "updated",
    page: Number.isInteger(page) && page > 1 ? page - 1 : 0,
  };
}

function writeState(s: ListState): string {
  const p = new URLSearchParams();
  if (s.status !== "DRAFT") p.set("status", s.status || "all");
  if (s.q.trim()) p.set("q", s.q.trim());
  if (s.source) p.set("source", s.source);
  if (s.posted) p.set("posted", s.posted);
  if (s.sort !== "updated") p.set("sort", s.sort);
  if (s.page > 0) p.set("page", String(s.page + 1));
  return p.toString();
}

export default function AdminCarsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Зареждане…</p>}>
      <AdminCars />
    </Suspense>
  );
}

function AdminCars() {
  const { adminFetch } = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ListState>(() => readState(new URLSearchParams(searchParams.toString())));
  const [qInput, setQInput] = useState(state.q);
  const [cars, setCars] = useState<PageResponse<AdminCarSummary> | null>(null);
  const [counts, setCounts] = useState<AdminCarCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const update = useCallback((change: Partial<ListState>) => {
    // any change of filters starts again at the first page
    setState((s) => ({ ...s, page: 0, ...change }));
  }, []);

  // the search box: wait until typing pauses
  useEffect(() => {
    if (qInput === state.q) return;
    const t = setTimeout(() => update(namesOneCar(qInput) ? { q: qInput, status: "" } : { q: qInput }), 350);
    return () => clearTimeout(t);
  }, [qInput, state.q, update]);

  // keep the address in step with the list
  useEffect(() => {
    const query = writeState(state);
    router.replace(query ? `/admin?${query}` : "/admin", { scroll: false });
  }, [state, router]);

  useEffect(() => {
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(state.page), sort: state.sort });
    if (state.status) params.set("status", state.status);
    if (state.q.trim()) params.set("q", state.q.trim());
    if (state.source) params.set("source", state.source);
    if (state.posted) params.set("posted", state.posted);
    let cancelled = false;
    adminFetch<PageResponse<AdminCarSummary>>(`/api/admin/cars?${params}`)
      .then((page) => {
        if (cancelled) return;
        setCars(page);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [adminFetch, state, reload]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (state.q.trim()) params.set("q", state.q.trim());
    if (state.source) params.set("source", state.source);
    if (state.posted) params.set("posted", state.posted);
    let cancelled = false;
    adminFetch<AdminCarCounts>(`/api/admin/cars/counts?${params}`)
      .then((c) => !cancelled && setCounts(c))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [adminFetch, state.q, state.source, state.posted, reload]);

  const countOf = (value: CarStatus | "") =>
    counts == null ? null : value === "" ? counts.total : (counts.byStatus[value] ?? 0);

  const goTo = (page: number) => {
    setState((s) => ({ ...s, page }));
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-10">
      <ImportPanel
        onImported={() => {
          update({ status: "DRAFT", sort: "updated" });
          setReload((n) => n + 1);
        }}
      />

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">Коли</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Име, линк от сайта, № на обява…"
              title="Име, марка или модел; линк към колата на нашия сайт или при източника; номерът на обявата от сайта (Обява №) или номерът при източника"
              aria-label="Търсене"
              className="field w-72 py-2!"
            />
            <select
              value={state.source}
              onChange={(e) => update({ source: e.target.value as CarSource | "" })}
              aria-label="Сайт източник"
              className="field w-auto py-2!"
            >
              <option value="">Всички сайтове</option>
              {sourceValues.map((s) => (
                <option key={s} value={s}>
                  {sourceLabels[s]}
                </option>
              ))}
            </select>
            <select
              value={state.posted}
              onChange={(e) => update({ posted: e.target.value })}
              aria-label="Къде са публикувани"
              className="field w-auto py-2!"
            >
              {postedFilters.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={state.sort}
              onChange={(e) => update({ sort: e.target.value })}
              aria-label="Подреждане"
              className="field w-auto py-2!"
            >
              {sorts.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tabs.map(([value, label]) => {
            const n = countOf(value);
            return (
              <button
                key={label}
                type="button"
                onClick={() => update({ status: value })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  state.status === value ? "bg-ink text-paper" : "bg-card ring-1 ring-line hover:ring-ink"
                }`}
              >
                {label}
                {n != null && (
                  <span className={state.status === value ? "ml-1 text-paper/60" : "ml-1 text-muted"}>
                    {n.toLocaleString("bg-BG")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-accent-dark">{error}</p>}
        {cars && cars.items.length === 0 && <p className="text-sm text-muted">Няма коли в този списък.</p>}
        {cars && cars.items.length > 0 && (
          <>
            <Pager page={cars} onPage={goTo} noun="коли" />
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {cars.items.map((car) => (
                <li key={car.id} className="hover:bg-paper">
                  <div className="flex items-center gap-2 pr-3">
                    <Link href={`/admin/cars/${car.id}`} className="flex min-w-0 flex-1 items-center gap-4 p-3">
                      <CarImage src={car.coverImageUrl} alt={car.title} className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{car.title}</p>
                        <p className="truncate text-xs text-muted">
                          #{car.id} · {car.year ?? "—"} · {formatKm(car.mileageKm)} · {sourceLabels[car.source]}
                          {listingId(car.source, car.sourceRef) && ` ${listingId(car.source, car.sourceRef)}`}
                        </p>
                      </div>
                      <span className="hidden text-sm font-bold sm:block">{formatEur(car.totalPriceEur)}</span>
                      <StatusBadge status={car.status} />
                    </Link>
                    {car.sourceUrl ? (
                      <a
                        href={car.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={car.sourceUrl}
                        className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-muted ring-1 ring-line hover:text-ink hover:ring-ink"
                      >
                        оригинал ↗
                      </a>
                    ) : (
                      <span className="w-[74px] shrink-0" aria-hidden />
                    )}
                  </div>
                  {(car.posted ?? []).length > 0 && (
                    <div className="-mt-1 flex items-center gap-2 pb-2.5 pl-[108px] pr-3">
                      <PostedChips posted={car.posted} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Pager page={cars} onPage={goTo} noun="коли" bottom />
          </>
        )}
      </section>
    </div>
  );
}

function ImportPanel({ onImported }: { onImported: () => void }) {
  const { adminFetch } = useAdmin();
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  // the listing page as saved in this browser (guazi answers the server with a bot check)
  const [saved, setSaved] = useState<{ name: string; html: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await adminFetch<ImportResult>("/api/admin/imports", {
        method: "POST",
        body: JSON.stringify({
          url,
          price: price.trim() ? Number(price) : null,
          currency,
          html: saved?.html ?? null,
        }),
      });
      setResult(r);
      setUrl("");
      setPrice("");
      setSaved(null);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Импортът не успя");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-ink p-6 text-paper sm:p-8">
      <h2 className="text-xl font-extrabold">Импорт по линк</h2>
      <p className="mt-1 text-sm text-paper/60">
        Поставете линк към кола от global.autohome.com.cn, en.guazi.com или autowini.com. Колата се създава като
        чернова.
        Цената се чете от обявата: за autowini това е цената в евро, която autowini показва и таксува (от долари по
        курса на самия autowini); за guazi е текущата цена в долари (с отстъпката, ако има). Цена, въведена тук, е с
        предимство.
      </p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://global.autohome.com.cn/en/…"
          className="field flex-1 border-paper/15! bg-paper/10! text-paper! placeholder:text-paper/40!"
        />
        <input
          type="number"
          min={0}
          step="any"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Цена (по желание)"
          aria-label="Цена при източника"
          className="field border-paper/15! bg-paper/10! text-paper! placeholder:text-paper/40! sm:w-44"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          aria-label="Валута"
          className="field border-paper/15! bg-paper/10! text-paper! sm:w-24 [&>option]:text-ink"
        >
          {["EUR", "USD", "KRW", "CNY"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="btn-accent" disabled={busy}>
          {busy ? "Импортиране… (до 2 мин.)" : "Импортирай"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-paper/60">
        <label className="cursor-pointer font-semibold text-paper underline underline-offset-2">
          {saved ? "Друг запазен файл" : "Импорт от запазена страница"}
          <input
            type="file"
            accept=".html,.htm,text/html"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) setSaved({ name: file.name, html: await file.text() });
            }}
          />
        </label>
        {saved ? (
          <span>
            {saved.name}{" "}
            <button type="button" className="ml-1 underline" onClick={() => setSaved(null)}>
              махни
            </button>
          </span>
        ) : (
          <span>
            За guazi, когато импортът по линк не става: отворете обявата, Ctrl+S → „Уеб страница, само HTML“,
            изберете файла тук и поставете линка горе.
          </span>
        )}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-[#ffb59a]">{error}</p>}
      {result && (
        <div className="mt-4 rounded-xl bg-paper/10 p-4 text-sm">
          <p className="font-semibold">
            {result.alreadyImported ? "Тази кола вече е импортирана: " : "Създадена чернова: "}
            <Link href={`/admin/cars/${result.car.id}`} className="underline underline-offset-2">
              {result.car.specs.title}
            </Link>{" "}
            {!result.alreadyImported && `(${result.importedImages} снимки)`}
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-paper/70">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
