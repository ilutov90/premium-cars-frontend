"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { CarImage } from "@/components/car-image";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatEur, formatKm } from "@/lib/format";
import type { CarStatus, CarSummary, ImportResult, PageResponse } from "@/lib/types";

const tabs: [CarStatus | "", string][] = [
  ["", "Всички"],
  ["DRAFT", "Чернови"],
  ["PUBLISHED", "Публикувани"],
  ["RESERVED", "Резервирани"],
  ["SOLD", "Продадени"],
  ["ARCHIVED", "Архив"],
];

export default function AdminCarsPage() {
  const { adminFetch } = useAdmin();
  const [status, setStatus] = useState<CarStatus | "">("DRAFT");
  const [q, setQ] = useState("");
  const [cars, setCars] = useState<PageResponse<CarSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reload, setReload] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ size: "48" });
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    let cancelled = false;
    adminFetch<PageResponse<CarSummary>>(`/api/admin/cars?${params}`)
      .then((page) => {
        if (cancelled) return;
        setCars(page);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [adminFetch, status, q, reload]);

  return (
    <div className="space-y-10">
      <ImportPanel
        onImported={() => {
          setStatus("DRAFT");
          setReload((n) => n + 1);
        }}
      />

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">Коли</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Търсене по име…"
            className="field max-w-xs py-2!"
          />
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tabs.map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                status === value ? "bg-ink text-paper" : "bg-card ring-1 ring-line hover:ring-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-accent-dark">{error}</p>}
        {cars && cars.items.length === 0 && <p className="text-sm text-muted">Няма коли в този списък.</p>}
        {cars && cars.items.length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {cars.items.map((car) => (
              <li key={car.id}>
                <Link href={`/admin/cars/${car.id}`} className="flex items-center gap-4 p-3 hover:bg-paper">
                  <CarImage src={car.coverImageUrl} alt={car.title} className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{car.title}</p>
                    <p className="text-xs text-muted">
                      #{car.id} · {car.year ?? "—"} · {formatKm(car.mileageKm)}
                    </p>
                  </div>
                  <span className="hidden text-sm font-bold sm:block">{formatEur(car.totalPriceEur)}</span>
                  <StatusBadge status={car.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ImportPanel({ onImported }: { onImported: () => void }) {
  const { adminFetch } = useAdmin();
  const [url, setUrl] = useState("");
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
        body: JSON.stringify({ url }),
      });
      setResult(r);
      setUrl("");
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
        Поставете линк към кола от global.autohome.com.cn или autowini.com. Колата се създава като чернова.
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
        <button type="submit" className="btn-accent" disabled={busy}>
          {busy ? "Импортиране… (до 1 мин.)" : "Импортирай"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm font-medium text-[#ffb59a]">{error}</p>}
      {result && (
        <div className="mt-4 rounded-xl bg-paper/10 p-4 text-sm">
          <p className="font-semibold">
            {result.alreadyImported ? "Тази кола вече е импортирана: " : "Създадена чернова: "}
            <Link href={`/admin/cars/${result.car.id}`} className="underline underline-offset-2">
              {result.car.title}
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
