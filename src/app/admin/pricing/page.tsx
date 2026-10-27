"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { formatDate, formatEur, priceProfileLabels } from "@/lib/format";
import type { ExchangeRates, PricingProfile } from "@/lib/types";

/** Same formula as the backend PriceCalculator; used only for the live example. */
function priceParts(fob: number, p: Omit<PricingProfile, "id" | "updatedAt">) {
  const dutyVat = Math.round((fob + p.seaFreight) * p.dutyVatPct) / 100;
  const profit = Math.max(Math.round(fob * p.profitPct) / 100, p.profitMin);
  const total = Math.round(fob + p.seaFreight + p.landTransport + p.commission + dutyVat + profit);
  return { dutyVat, profit, total };
}

export default function AdminPricingPage() {
  const { adminFetch } = useAdmin();
  const [profiles, setProfiles] = useState<PricingProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<PricingProfile[]>("/api/admin/pricing-profiles")
      .then(setProfiles)
      .catch((e: Error) => setError(e.message));
  }, [adminFetch]);

  return (
    <div>
      <h1 className="text-xl font-extrabold">Цени</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Всичко се смята от FOB цената от обявата (в евро): крайна цена = FOB + морски транспорт + сухопътен
        транспорт + комисионна + мито и ДДС + надценка, където мито и ДДС = процент от (FOB + морски транспорт), а
        надценката = процент от FOB, но не по-малко от минимума. Пример за Китай, FOB 21 450 €: 21 450 + 2000 + 1600
        + 500 + 4690 (20 % от 23 450) + 2145 (10 % от 21 450) = 32 385 €. При FOB 8000 € надценката е минимумът
        1000 €, не 800 €.
        Тази цена се показва в сайта и в постовете. Промяна на формулата важи за новите импорти: цените на вече
        добавените коли остават същите (може да са публикувани). Отделна кола се преизчислява от страницата ѝ
        („Преизчисли“).
      </p>
      {error && <p className="mt-4 text-sm font-semibold text-warn">{error}</p>}
      {!profiles && !error && <p className="mt-6 text-sm text-muted">Зареждане…</p>}
      <RatesCard />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {profiles?.map((p) => (
          <ProfileForm
            key={p.id}
            profile={p}
            onSaved={(saved) => setProfiles((list) => list?.map((x) => (x.id === saved.id ? saved : x)) ?? null)}
          />
        ))}
      </div>
    </div>
  );
}

/** The exchange rates in use: the ECB daily rates (new ones reprice every car) or the configured fallback. */
function RatesCard() {
  const { adminFetch } = useAdmin();
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<ExchangeRates>("/api/admin/pricing-profiles/exchange-rates")
      .then(setRates)
      .catch((e: Error) => setError(e.message));
  }, [adminFetch]);

  if (error) return <p className="mt-4 text-sm font-semibold text-warn">Валутни курсове: {error}</p>;
  if (!rates) return null;
  const entries = Object.entries(rates.eurPerUnit).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="mt-6 rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-extrabold">Валутни курсове</h2>
        <p className={`text-xs font-semibold ${rates.source === "ECB" ? "text-ok" : "text-warn"}`}>
          {rates.source === "ECB"
            ? `ЕЦБ, курс от ${rates.date ? new Date(rates.date).toLocaleDateString("bg-BG", { timeZone: "UTC" }) : "—"}`
            : "Резервни курсове от настройките (ЕЦБ още не е отговорила)"}
        </p>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {entries.map(([code, eur]) => (
          <div key={code} className="flex justify-between gap-4">
            <dt className="text-muted">1 {code}</dt>
            <dd className="font-semibold tabular-nums">{rateFormat.format(eur)} €</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">
        Курсовете се обновяват автоматично всеки работен ден (ЕЦБ публикува около 16:00 ч.). Новият курс важи за
        новите импорти; цените на вече добавените коли не се променят.
      </p>
    </div>
  );
}

const rateFormat = new Intl.NumberFormat("bg-BG", { maximumSignificantDigits: 5 });

type FieldName = "seaFreight" | "landTransport" | "commission" | "profitPct" | "profitMin" | "dutyVatPct";

const fields: { name: FieldName; label: string; hint: string; max?: number }[] = [
  { name: "seaFreight", label: "Морски транспорт, €", hint: "до европейското пристанище" },
  { name: "landTransport", label: "Сухопътен транспорт, €", hint: "от пристанището до България" },
  { name: "commission", label: "Комисионна, €", hint: "на посредника" },
  { name: "profitPct", label: "Надценка, %", hint: "процент от FOB цената", max: 100 },
  { name: "profitMin", label: "Минимална надценка, €", hint: "ако процентът дава по-малко" },
  { name: "dutyVatPct", label: "Мито и ДДС, %", hint: "процент от FOB + морски транспорт", max: 100 },
];

function ProfileForm({ profile, onSaved }: { profile: PricingProfile; onSaved: (p: PricingProfile) => void }) {
  const { adminFetch } = useAdmin();
  const [values, setValues] = useState(profile);
  const [example, setExample] = useState(20000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const changed = fields.some((f) => values[f.name] !== profile[f.name]);
  const valid = fields.every(
    (f) => Number.isFinite(values[f.name]) && values[f.name] >= 0 && (f.max == null || values[f.name] <= f.max),
  );
  const parts = valid ? priceParts(example, values) : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const saved = await adminFetch<PricingProfile>(`/api/admin/pricing-profiles/${profile.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      onSaved(saved);
      setValues(saved);
      setMessage({ ok: true, text: "Записано ✓ Важи за новите импорти." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Грешка" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{priceProfileLabels[profile.id]}</h2>
        <span className="text-xs text-muted">обновено {formatDate(profile.updatedAt)}</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="label" htmlFor={`${profile.id}-${f.name}`}>
              {f.label}
            </label>
            <input
              id={`${profile.id}-${f.name}`}
              type="number"
              min={0}
              max={f.max}
              step="any"
              required
              value={Number.isFinite(values[f.name]) ? values[f.name] : ""}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.valueAsNumber })}
              className="field"
            />
            <p className="mt-1 text-xs text-muted">{f.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-paper p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted">Пример: FOB</span>
          <input
            type="number"
            min={0}
            step={1000}
            value={example}
            onChange={(e) => setExample(e.target.valueAsNumber || 0)}
            className="field w-32! py-1.5!"
            aria-label="Цена на колата за примера"
          />
          <span className="text-muted">€ →</span>
          <strong className="text-base">{parts ? formatEur(parts.total) : "—"}</strong>
        </div>
        {parts && (
          <p className="mt-2 text-xs text-muted">
            {formatEur(example)} + {formatEur(values.seaFreight)} + {formatEur(values.landTransport)} +{" "}
            {formatEur(values.commission)} + мито и ДДС {formatEur(parts.dutyVat)} + надценка {formatEur(parts.profit)}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy || !changed || !valid}>
          {busy ? "Записване…" : "Запиши"}
        </button>
        {message && (
          <span className={`text-sm font-semibold ${message.ok ? "text-ok" : "text-warn"}`}>{message.text}</span>
        )}
      </div>
    </form>
  );
}
