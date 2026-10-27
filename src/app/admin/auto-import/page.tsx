"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { formatDate } from "@/lib/format";
import type {
  AutoImportBrand,
  AutoImportCatalogEntry,
  AutoImportFilters,
  AutoImportModel,
  AutoImportOverview,
  AutoImportPreview,
  AutoImportRun,
  AutoImportRunStatus,
  AutoImportSource,
  AutoImportSourceView,
} from "@/lib/types";

const sourceNames: Record<AutoImportSource, string> = {
  GUAZI: "guazi (Китай)",
  AUTOWINI: "autowini (Корея)",
};

const runStatusLabels: Record<AutoImportRunStatus, string> = {
  RUNNING: "Върви",
  DONE: "Готово",
  INCOMPLETE: "Непълно",
  STOPPED: "Спряно (защита)",
  FAILED: "Грешка",
};

const GRADES = ["S", "A", "B", "C", "D"];

/** Settings, checks and the report of the automatic import from autowini and guazi. */
export default function AdminAutoImportPage() {
  const { adminFetch } = useAdmin();
  const [overview, setOverview] = useState<AutoImportOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      adminFetch<AutoImportOverview>("/api/admin/auto-import")
        .then((o) => {
          setOverview(o);
          setError(null);
        })
        .catch((e: Error) => setError(e.message)),
    [adminFetch],
  );

  useEffect(() => {
    load();
  }, [load]);

  // follow a run or the queue while something is going on
  const active = !!overview && (!!overview.running || overview.runs.some((r) => r.status === "RUNNING"));
  const queued = !!overview && overview.sources.some((s) => (s.queue.QUEUED ?? 0) > 0) && overview.enabled;
  useEffect(() => {
    if (!active && !queued) return;
    const t = setInterval(load, active ? 5000 : 30000);
    return () => clearInterval(t);
  }, [active, queued, load]);

  async function toggleMain() {
    if (!overview) return;
    const next = !overview.enabled;
    if (
      next &&
      !window.confirm(
        "Включваш автоматичния импорт: всяка нощ в 03:00 новите обяви ще се импортират и публикуват, а изчезналите ще се свалят от сайта. Продължаваш ли?",
      )
    )
      return;
    setBusy(true);
    try {
      setOverview(
        await adminFetch<AutoImportOverview>("/api/admin/auto-import/enabled", {
          method: "PUT",
          body: JSON.stringify({ enabled: next }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-extrabold">Автоматичен импорт</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Всяка нощ в 03:00 (първо guazi, после autowini) се преглеждат всички обяви по избраните марки, години и
        филтри. Новите се импортират една по една и се публикуват директно (с до 20 снимки). Кола, чиято обява липсва
        две нощи подред, се сваля от сайта („Махната от източника“) и се изтрива след 30 дни; ако обявата се върне,
        колата се публикува отново. Ако наведнъж трябва да се махнат над 20% от колите, нищо не се маха и идва имейл.
        Ръчният импорт не се променя.
      </p>
      {error && <p className="mt-4 rounded-xl bg-accent/10 p-3 text-sm font-medium text-accent-dark">{error}</p>}
      {!overview && !error && <p className="mt-6 text-sm text-muted">Зареждане…</p>}

      {overview && (
        <>
          <div
            className={`mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 ring-1 ${
              overview.enabled ? "bg-ok/10 ring-ok/30" : "bg-card ring-line"
            }`}
          >
            <div>
              <p className="font-bold">
                Автоматичният импорт е {overview.enabled ? "включен" : "изключен"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {overview.enabled
                  ? "Тече всяка нощ в 03:00 за включените сайтове; опашката се импортира непрекъснато."
                  : "Нищо не се импортира и нищо не се маха. „Преглед“ и „Пробно пускане“ работят и така."}
              </p>
              {overview.running && (
                <p className="mt-1 text-sm font-semibold text-accent">Сега върви: {overview.running}</p>
              )}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={toggleMain}
              className={overview.enabled ? "btn-ghost" : "btn-accent"}
            >
              {overview.enabled ? "Изключи" : "Включи"}
            </button>
          </div>

          <div className="mt-8 space-y-8">
            {overview.sources.map((s) => (
              <SourceCard
                key={`${s.source}-${JSON.stringify(s.brands)}-${s.enabled}`}
                view={s}
                mainEnabled={overview.enabled}
                onOverview={setOverview}
                onError={setError}
              />
            ))}
          </div>

          <Runs runs={overview.runs} />

          {overview.failures.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 font-bold">Неуспешни импорти</h2>
              <p className="mb-3 text-sm text-muted">
                Опитва се до 3 пъти подред; след следващото нощно пускане — отново (общо до 6 опита).
              </p>
              <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-line">
                <table className="w-full text-sm">
                  <tbody>
                    {overview.failures.map((f) => (
                      <tr key={`${f.source}-${f.listingId}`} className="border-t border-line first:border-0">
                        <td className="p-3 whitespace-nowrap">{f.source}</td>
                        <td className="p-3">
                          <a href={f.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                            {f.title ?? f.listingId}
                          </a>
                        </td>
                        <td className="p-3 whitespace-nowrap">{f.attempts} опита</td>
                        <td className="p-3 text-muted">{f.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SourceCard({
  view,
  mainEnabled,
  onOverview,
  onError,
}: {
  view: AutoImportSourceView;
  mainEnabled: boolean;
  onOverview: (o: AutoImportOverview) => void;
  onError: (e: string | null) => void;
}) {
  const { adminFetch } = useAdmin();
  const [enabled, setEnabled] = useState(view.enabled);
  const [filters, setFilters] = useState<AutoImportFilters>(view.filters);
  const [brands, setBrands] = useState<AutoImportBrand[]>(view.brands);
  const [catalog, setCatalog] = useState<AutoImportCatalogEntry[] | null>(null);
  const [preview, setPreview] = useState<AutoImportPreview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const dirty =
    enabled !== view.enabled ||
    JSON.stringify(filters) !== JSON.stringify(view.filters) ||
    JSON.stringify(brands) !== JSON.stringify(view.brands);
  const valid = brands.every((b) => b.yearFrom >= 1990 && b.yearFrom <= 2100);
  const base = `/api/admin/auto-import/${view.source}`;
  const body = () => JSON.stringify({ enabled, filters, brands });

  async function act(name: string, work: () => Promise<void>) {
    setBusy(name);
    setMessage(null);
    onError(null);
    try {
      await work();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    act("save", async () => {
      onOverview(await adminFetch<AutoImportOverview>(base, { method: "PUT", body: body() }));
      setMessage("Запазено.");
    });

  const runPreview = () =>
    act("preview", async () => {
      setPreview(await adminFetch<AutoImportPreview>(`${base}/preview`, { method: "POST", body: body() }));
    });

  const start = (dryRun: boolean) =>
    act(dryRun ? "dry" : "run", async () => {
      if (
        !dryRun &&
        !window.confirm(`Пускаш истински импорт от ${sourceNames[view.source]} сега: новите коли ще се публикуват. Продължаваш ли?`)
      )
        return;
      onOverview(
        await adminFetch<AutoImportOverview>(`${base}/runs`, { method: "POST", body: JSON.stringify({ dryRun }) }),
      );
      setMessage(dryRun ? "Пробното пускане започна — резултатът ще се появи в отчета долу." : "Пускането започна.");
    });

  async function loadCatalog(refresh = false) {
    await act("catalog", async () => {
      setCatalog(
        await adminFetch<AutoImportCatalogEntry[]>(`${base}/catalog${refresh ? "/refresh" : ""}`, {
          method: refresh ? "POST" : "GET",
        }),
      );
    });
  }

  function updateBrand(code: string, change: Partial<AutoImportBrand>) {
    setBrands((all) => all.map((b) => (b.code === code ? { ...b, ...change } : b)));
  }

  function addBrand(code: string) {
    const entry = catalog?.find((c) => c.code === code);
    if (!entry || brands.some((b) => b.code === code)) return;
    const year = view.source === "GUAZI" ? 2022 : 2018;
    setBrands((all) => [...all, { code, name: entry.name, enabled: true, yearFrom: year, models: [] }]);
  }

  const queue = view.queue;
  return (
    <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">{sourceNames[view.source]}</h2>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Включен за автоматичен импорт
        </label>
      </div>
      <p className="mt-1 text-sm text-muted">
        Опашка: {queue.QUEUED ?? 0} за импорт · {queue.IMPORTED ?? 0} импортирани · {queue.FAILED ?? 0} неуспешни
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {view.source === "AUTOWINI" ? (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.inspected}
                onChange={(e) => setFilters({ ...filters, inspected: e.target.checked })}
              />
              Проверени (Inspected)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.actualMileage}
                onChange={(e) => setFilters({ ...filters, actualMileage: e.target.checked })}
              />
              Реален пробег (Actual)
            </label>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold">Оценка (grade):</span>
            {GRADES.map((g) => (
              <label key={g} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={filters.grades.includes(g)}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      grades: e.target.checked
                        ? GRADES.filter((x) => x === g || filters.grades.includes(x))
                        : filters.grades.filter((x) => x !== g),
                    })
                  }
                />
                {g}
              </label>
            ))}
            {filters.grades.length === 0 && <span className="text-warn">без филтър: всички оценки</span>}
          </div>
        )}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-2 pr-3">Вкл.</th>
              <th className="py-2 pr-3">Марка</th>
              <th className="py-2 pr-3">От година{view.source === "GUAZI" ? " (производство)" : ""}</th>
              <th className="py-2 pr-3">Модели</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <BrandRow
                key={b.code}
                source={view.source}
                brand={b}
                onChange={(change) => updateBrand(b.code, change)}
                onRemove={() => setBrands((all) => all.filter((x) => x.code !== b.code))}
                onError={onError}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {catalog === null ? (
          <button type="button" className="btn-ghost px-4! py-1.5!" disabled={!!busy} onClick={() => loadCatalog()}>
            + Добави марка
          </button>
        ) : (
          <>
            <select
              className="field max-w-xs"
              value=""
              onChange={(e) => addBrand(e.target.value)}
              aria-label="Добави марка"
            >
              <option value="">+ Добави марка…</option>
              {catalog
                .filter((c) => !brands.some((b) => b.code === c.code))
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
            </select>
            <button type="button" className="text-xs font-semibold text-accent hover:underline" onClick={() => loadCatalog(true)}>
              обнови списъка от сайта
            </button>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" disabled={!dirty || !valid || !!busy} onClick={save}>
          {busy === "save" ? "Запазване…" : "Запази"}
        </button>
        <button type="button" className="btn-ghost" disabled={!valid || !!busy} onClick={runPreview}>
          {busy === "preview" ? "Броене…" : "Преглед (колко коли)"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={dirty || !!busy}
          title={dirty ? "Първо запази промените" : undefined}
          onClick={() => start(true)}
        >
          Пробно пускане
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={dirty || !!busy || !mainEnabled || !view.enabled}
          title={!mainEnabled || !view.enabled ? "Включи автоматичния импорт и този сайт" : undefined}
          onClick={() => start(false)}
        >
          Пусни сега
        </button>
        {dirty && <span className="text-sm text-warn">Има незапазени промени</span>}
        {message && <span className="text-sm text-ok">{message}</span>}
      </div>

      {preview && (
        <div className="mt-4 rounded-xl bg-paper p-4 text-sm">
          {preview.error && (
            <p className="mb-2 font-semibold text-warn">Сайтът не отговори както трябва от сървъра: {preview.error}</p>
          )}
          <table className="w-full max-w-md">
            <tbody>
              {preview.brands.map((b) => (
                <tr key={b.code}>
                  <td className="py-0.5 pr-4">{b.name}</td>
                  <td className="py-0.5 text-right font-semibold">
                    {b.count != null ? b.count.toLocaleString("bg-BG") : <span className="text-warn">грешка</span>}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-line">
                <td className="pt-1 pr-4 font-bold">Общо</td>
                <td className="pt-1 text-right font-bold">{preview.total.toLocaleString("bg-BG")}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">Броят е по текущите (и незапазени) настройки, към този момент.</p>
        </div>
      )}
    </section>
  );
}

function BrandRow({
  source,
  brand,
  onChange,
  onRemove,
  onError,
}: {
  source: AutoImportSource;
  brand: AutoImportBrand;
  onChange: (change: Partial<AutoImportBrand>) => void;
  onRemove: () => void;
  onError: (e: string | null) => void;
}) {
  const { adminFetch } = useAdmin();
  const [models, setModels] = useState<AutoImportModel[] | null>(null);
  const [open, setOpen] = useState(false);

  async function openPicker() {
    setOpen(true);
    if (models) return;
    try {
      setModels(
        await adminFetch<AutoImportModel[]>(
          `/api/admin/auto-import/${source}/catalog/${encodeURIComponent(brand.code)}/models`,
        ),
      );
    } catch (e) {
      onError((e as Error).message);
      setOpen(false);
    }
  }

  function toggleModel(m: AutoImportModel, on: boolean) {
    const chosen = on ? [...brand.models, m] : brand.models.filter((x) => x.code !== m.code);
    onChange({ models: chosen });
  }

  return (
    <tr className="border-t border-line align-top">
      <td className="py-2 pr-3">
        <input
          type="checkbox"
          checked={brand.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          aria-label={`${brand.name} включена`}
        />
      </td>
      <td className={`py-2 pr-3 font-semibold ${brand.enabled ? "" : "text-muted"}`}>{brand.name}</td>
      <td className="py-2 pr-3">
        <input
          type="number"
          className="field w-24"
          min={1990}
          max={2100}
          value={brand.yearFrom}
          onChange={(e) => onChange({ yearFrom: Number(e.target.value) })}
          aria-label={`${brand.name} от година`}
        />
      </td>
      <td className="py-2 pr-3">
        {brand.models.length === 0 ? (
          <span className="text-muted">Всички модели</span>
        ) : (
          <span>{brand.models.map((m) => m.name).join(", ")}</span>
        )}{" "}
        <button type="button" className="text-xs font-semibold text-accent hover:underline" onClick={() => (open ? setOpen(false) : openPicker())}>
          {open ? "затвори" : "избери"}
        </button>
        {open && (
          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl bg-paper p-3">
            {models === null ? (
              <p className="text-xs text-muted">Зареждане…</p>
            ) : models.length === 0 ? (
              <p className="text-xs text-muted">Сайтът не даде модели за тази марка.</p>
            ) : (
              <>
                <button
                  type="button"
                  className="mb-2 text-xs font-semibold text-accent hover:underline"
                  onClick={() => onChange({ models: [] })}
                >
                  всички модели
                </button>
                <div className="grid gap-1 sm:grid-cols-2">
                  {models.map((m) => (
                    <label key={m.code} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={brand.models.some((x) => x.code === m.code)}
                        onChange={(e) => toggleModel(m, e.target.checked)}
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </td>
      <td className="py-2 text-right">
        <button type="button" className="text-xs text-muted hover:text-accent" onClick={onRemove} aria-label={`Махни ${brand.name}`}>
          ✕
        </button>
      </td>
    </tr>
  );
}

function Runs({ runs }: { runs: AutoImportRun[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <section className="mt-10">
      <h2 className="mb-3 font-bold">Отчет от пусканията</h2>
      {runs.length === 0 ? (
        <p className="text-sm text-muted">Още няма пускания.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-line">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="p-3">Начало</th>
                <th className="p-3">Сайт</th>
                <th className="p-3">Вид</th>
                <th className="p-3">Статус</th>
                <th className="p-3 text-right">Намерени</th>
                <th className="p-3 text-right">Нови</th>
                <th className="p-3 text-right">Махнати</th>
                <th className="p-3 text-right">Върнати</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <RunRow key={r.id} run={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted">
        При пробно пускане „Нови“ и „Махнати“ са колко биха били — нищо не се променя.
      </p>
    </section>
  );
}

function RunRow({ run, open, onToggle }: { run: AutoImportRun; open: boolean; onToggle: () => void }) {
  const tone =
    run.status === "DONE" ? "text-ok" : run.status === "RUNNING" ? "text-accent" : run.status === "INCOMPLETE" ? "text-warn" : "text-accent-dark";
  return (
    <>
      <tr className="cursor-pointer border-t border-line hover:bg-paper" onClick={onToggle}>
        <td className="p-3 whitespace-nowrap">{formatDate(run.startedAt)}</td>
        <td className="p-3">{run.source}</td>
        <td className="p-3">{run.dryRun ? "Пробно" : "Истинско"}</td>
        <td className={`p-3 font-semibold ${tone}`}>{runStatusLabels[run.status] ?? run.status}</td>
        <td className="p-3 text-right">{run.found.toLocaleString("bg-BG")}</td>
        <td className="p-3 text-right">{run.newCount.toLocaleString("bg-BG")}</td>
        <td className="p-3 text-right">{run.goneCount.toLocaleString("bg-BG")}</td>
        <td className="p-3 text-right">{run.returnedCount.toLocaleString("bg-BG")}</td>
      </tr>
      {open && (
        <tr className="bg-paper">
          <td colSpan={8} className="p-3 text-xs">
            {run.message && <p className="mb-2">{run.message}</p>}
            {run.brands.length > 0 && (
              <table>
                <tbody>
                  {run.brands.map((b) => (
                    <tr key={b.code}>
                      <td className="pr-4">{b.name}</td>
                      <td className="pr-4 text-right">
                        {b.found.toLocaleString("bg-BG")} / {b.expected.toLocaleString("bg-BG")}
                      </td>
                      <td className={b.complete ? "text-ok" : "text-warn"}>
                        {b.complete ? "изцяло" : `непълно${b.error ? `: ${b.error}` : ""}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {run.finishedAt && <p className="mt-2 text-muted">Край: {formatDate(run.finishedAt)}</p>}
          </td>
        </tr>
      )}
    </>
  );
}
