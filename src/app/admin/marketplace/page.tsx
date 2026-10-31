"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { formatDate } from "@/lib/format";
import { CARS_BG_EXTENSION, EXTENSION_ZIP, type ExtMessage, useMobileBgExtension, versionAtLeast } from "@/lib/mobile-bg";
import type { MarketplaceOverview, MarketplaceRow, MarketplaceSite, ModelMatchStatus, SiteMatch } from "@/lib/types";

const SITES: { site: MarketplaceSite; name: string; catalogUrl: string }[] = [
  { site: "MOBILE_BG", name: "mobile.bg", catalogUrl: "/api/admin/mobile-bg/catalog" },
  { site: "CARS_BG", name: "cars.bg", catalogUrl: "/api/admin/cars-bg/catalog" },
];

const statusInfo: Record<ModelMatchStatus, { label: string; tone: "ok" | "warn" | "bad" | "muted" }> = {
  AUTO: { label: "Съвпада", tone: "ok" },
  MANUAL: { label: "Избран", tone: "ok" },
  SUGGESTED: { label: "Предложен", tone: "warn" },
  MODEL_MISSING: { label: "Няма модел", tone: "bad" },
  UNAVAILABLE: { label: "Няма в сайта", tone: "bad" },
  BRAND_MISSING: { label: "Няма марка", tone: "bad" },
  NO_CATALOG: { label: "Няма списъци", tone: "muted" },
};
const toneClass = {
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/10 text-warn",
  bad: "bg-accent/10 text-accent-dark",
  muted: "bg-paper text-muted",
};
const solved = (s: ModelMatchStatus) => s === "AUTO" || s === "MANUAL";
const rowKey = (r: MarketplaceRow) => `${r.make}|${r.model}`;

/**
 * "Съпоставяне на модели": every make + model of our cars against mobile.bg's and cars.bg's lists, the most cars
 * first. The same name matches by itself; anything else an admin confirms, chooses or marks as missing on the site.
 * "Обнови" reloads our models and has the browser extension read both sites' lists again.
 */
export default function MarketplacePage() {
  const { adminFetch } = useAdmin();
  const [data, setData] = useState<MarketplaceOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const dataRef = useRef<MarketplaceOverview | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const load = useCallback(
    () =>
      adminFetch<MarketplaceOverview>("/api/admin/marketplace/models")
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e: Error) => setError(e.message)),
    [adminFetch],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // lists the extension read: kept on the server when newer than the server's
  const onExtension = useCallback(
    async (msg: ExtMessage) => {
      const site = msg.type === "catalog" ? SITES[0] : msg.type === "carsBgCatalog" ? SITES[1] : null;
      if (!site || (msg.type !== "catalog" && msg.type !== "carsBgCatalog")) return;
      const catalog = msg.catalog;
      const current = dataRef.current?.sites[site.site]?.capturedAt;
      if (!catalog?.brands?.length || !catalog.capturedAt || !dataRef.current) return;
      if (current && Date.parse(catalog.capturedAt) <= Date.parse(current)) return;
      try {
        await adminFetch(site.catalogUrl, { method: "PUT", body: JSON.stringify(catalog) });
        setRefreshing((r) => (r ? `Списъците на ${site.name} са обновени.` : r));
        await load();
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [adminFetch, load],
  );
  const { version, send } = useMobileBgExtension(onExtension);
  const ready = versionAtLeast(version, CARS_BG_EXTENSION);

  // once the overview is there (its dates decide what is newer)
  const loaded = data !== null;
  useEffect(() => {
    if (ready && loaded) send({ type: "get-catalog" });
  }, [ready, loaded, send]);

  async function refresh() {
    setRefreshing(null);
    await load();
    if (!ready) {
      setRefreshing("Нашите марки и модели са обновени. За списъците на сайтовете трябва разширението (версия 1.1.0+).");
      return;
    }
    send({ type: "refresh", sites: SITES.map((s) => s.site) });
    setRefreshing(
      "Нашите марки и модели са обновени. Отворих mobile.bg и cars.bg в нови табове: разширението чете списъците " +
        "(cars.bg — около минута). Ако не сте влезли в профилите, влезте. Таблицата се обновява сама.",
    );
  }

  async function choose(row: MarketplaceRow, site: MarketplaceSite, targetModel: string | null, unavailable: boolean) {
    setBusy(`${rowKey(row)}|${site}`);
    try {
      const d = await adminFetch<MarketplaceOverview>("/api/admin/marketplace/models", {
        method: "PUT",
        body: JSON.stringify({ site, make: row.make, model: row.model, targetModel, unavailable }),
      });
      setData(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reset(row: MarketplaceRow, site: MarketplaceSite) {
    setBusy(`${rowKey(row)}|${site}`);
    try {
      const p = new URLSearchParams({ site, make: row.make, model: row.model });
      setData(await adminFetch<MarketplaceOverview>(`/api/admin/marketplace/models?${p}`, { method: "DELETE" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const rows = useMemo(() => {
    const text = q.trim().toLowerCase();
    return (data?.rows ?? []).filter(
      (r) =>
        (!onlyOpen || SITES.some((s) => !solved(r.sites[s.site].status))) &&
        (!text || `${r.make} ${r.model}`.toLowerCase().includes(text)),
    );
  }, [data, onlyOpen, q]);

  const missingOnCarsBg = useMemo(
    () =>
      (data?.rows ?? []).filter((r) => ["MODEL_MISSING", "BRAND_MISSING", "UNAVAILABLE"].includes(r.sites.CARS_BG.status)),
    [data],
  );

  return (
    <div>
      <h1 className="text-xl font-extrabold">Съпоставяне на модели</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Нашите марки и модели срещу списъците на mobile.bg и cars.bg, първо тези с най-много коли. Еднаквите имена се
        съпоставят сами. Останалите потвърдете, изберете модела на сайта или отбележете, че сайтът го няма. Изборът важи
        за всички коли с този модел.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={refresh} className="btn-primary px-4! py-2!">
          Обнови списъците
        </button>
        {SITES.map((s) => {
          const info = data?.sites[s.site];
          return (
            <span key={s.site} className="text-sm text-muted">
              {s.name}:{" "}
              {info?.capturedAt ? `${info.brandCount} марки, прочетени ${formatDate(info.capturedAt)}` : "непрочетени"}
            </span>
          );
        })}
      </div>
      {refreshing && <p className="mt-2 max-w-3xl text-sm font-semibold text-ok">{refreshing}</p>}
      {!ready && (
        <p className="mt-2 text-sm text-warn">
          {version ? `Разширението е версия ${version}; трябва ${CARS_BG_EXTENSION} или по-нова. ` : "Разширението не е инсталирано. "}
          <a href={EXTENSION_ZIP} className="font-semibold text-accent hover:underline" download>
            Свалете го
          </a>
          , заменете файловете в папката „mobile-bg“ и натиснете „Презареди“ в <code>chrome://extensions</code>.
        </p>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-warn">{error}</p>}

      <div className="mt-5 mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} className="accent-accent" />
          Само несъпоставените
        </label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Марка или модел…" className="field w-64 py-2!" aria-label="Търсене" />
        <span className="ml-auto text-sm text-muted">
          {data ? `${rows.length} от ${data.rows.length} модела` : "Зареждане…"}
        </span>
      </div>

      {data && rows.length === 0 && <p className="text-sm text-muted">Няма модели за показване.</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-line">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="p-3">Наш модел</th>
                <th className="p-3 text-right">Коли</th>
                {SITES.map((s) => (
                  <th key={s.site} className="p-3">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={rowKey(r)} className="border-t border-line align-top">
                  <td className="p-3 font-semibold">
                    {r.make} {r.model}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap tabular-nums">
                    {r.cars}
                    {r.publicCars !== r.cars && <span className="block text-xs text-muted">{r.publicCars} на сайта</span>}
                  </td>
                  {SITES.map((s) => (
                    <td key={s.site} className="min-w-64 p-3">
                      <SiteCell
                        key={`${r.sites[s.site].status}|${r.sites[s.site].model ?? ""}`}
                        match={r.sites[s.site]}
                        models={r.sites[s.site].brand ? (data?.sites[s.site].brands[r.sites[s.site].brand!] ?? []) : []}
                        busy={busy === `${rowKey(r)}|${s.site}`}
                        onChoose={(m) => choose(r, s.site, m, false)}
                        onUnavailable={() => choose(r, s.site, null, true)}
                        onReset={() => reset(r, s.site)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {missingOnCarsBg.length > 0 && (
        <section className="mt-8 rounded-2xl bg-card p-5 ring-1 ring-line">
          <h2 className="font-bold">Липсват в cars.bg ({missingOnCarsBg.length})</h2>
          <p className="mt-1 text-sm text-muted">За писмо до cars.bg с молба да добавят марките и моделите.</p>
          <textarea
            readOnly
            rows={Math.min(12, missingOnCarsBg.length + 1)}
            className="field mt-3 font-mono text-xs!"
            value={missingOnCarsBg
              .map((r) => `${r.make} ${r.model}${r.sites.CARS_BG.status === "BRAND_MISSING" ? " (няма марката)" : ""}`)
              .join("\n")}
          />
        </section>
      )}
    </div>
  );
}

function SiteCell({
  match,
  models,
  busy,
  onChoose,
  onUnavailable,
  onReset,
}: {
  match: SiteMatch;
  models: string[];
  busy: boolean;
  onChoose: (model: string) => void;
  onUnavailable: () => void;
  onReset: () => void;
}) {
  const [pick, setPick] = useState(match.model ?? ""); // the cell is new when the match changes (key)
  const info = statusInfo[match.status];
  const canChoose = !!match.brand && match.status !== "NO_CATALOG";
  const options = useMemo(() => {
    // the suggestions first, then the make's other models
    const rest = models.filter((m) => !match.suggestions.includes(m));
    return [...match.suggestions, ...rest];
  }, [models, match.suggestions]);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneClass[info.tone]}`}>{info.label}</span>
        {match.model && (
          <span className="text-xs">
            {match.brand} {match.model}
          </span>
        )}
      </div>
      {canChoose && (
        <div className="flex flex-wrap items-center gap-1">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="field w-40 py-1! text-xs!"
            aria-label="Модел на сайта"
            disabled={busy}
          >
            <option value="">— модел —</option>
            {options.map((m) => (
              <option key={m} value={m}>
                {match.suggestions.includes(m) ? `★ ${m}` : m}
              </option>
            ))}
          </select>
          {match.status !== "AUTO" && (
            <button
              type="button"
              disabled={busy || !pick || (match.status === "MANUAL" && pick === match.model)}
              onClick={() => onChoose(pick)}
              className="btn-primary px-2! py-1! text-xs!"
            >
              {match.status === "SUGGESTED" && pick === match.model ? "Потвърди" : "Избери"}
            </button>
          )}
          {match.status === "AUTO" && pick && pick !== match.model && (
            <button type="button" disabled={busy} onClick={() => onChoose(pick)} className="btn-primary px-2! py-1! text-xs!">
              Избери
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        {match.status !== "UNAVAILABLE" && match.status !== "BRAND_MISSING" && match.status !== "AUTO" && (
          <button type="button" disabled={busy} onClick={onUnavailable} className="font-semibold text-muted hover:text-ink">
            Няма в сайта
          </button>
        )}
        {match.setBy && (
          <button type="button" disabled={busy} onClick={onReset} className="font-semibold text-muted hover:text-ink" title={`${match.setBy}, ${match.setAt ? formatDate(match.setAt) : ""}`}>
            Нулирай
          </button>
        )}
      </div>
    </div>
  );
}
