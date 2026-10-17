"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { formatDate, formatEur, priceProfileLabels, stepModeLabels } from "@/lib/format";
import type { PricingProfile, StepMode } from "@/lib/types";

/** Same formula as the backend PriceCalculator; used only for the live example. */
function finalPrice(carEur: number, p: Omit<PricingProfile, "id" | "updatedAt">): number {
  const above = carEur - p.threshold;
  let steps = 0;
  if (above > 0 && p.step > 0) {
    const raw = above / p.step;
    steps = p.stepMode === "STARTED" ? Math.ceil(raw) : p.stepMode === "FULL" ? Math.floor(raw) : raw;
  }
  return Math.round(carEur + p.baseCosts + p.stepCost * steps + p.profit);
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
        Крайна цена = цена на колата в € + разходи + разходи за всяка стъпка
        (10 000 €) над прага + надценка. Тази цена се показва в сайта и във Facebook/Instagram текста. При запис всички
        коли се преизчисляват.
      </p>
      {error && <p className="mt-4 text-sm font-semibold text-warn">{error}</p>}
      {!profiles && !error && <p className="mt-6 text-sm text-muted">Зареждане…</p>}
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

const fields: { name: "baseCosts" | "threshold" | "step" | "stepCost" | "profit"; label: string; hint: string }[] = [
  { name: "baseCosts", label: "Разходи, €", hint: "всички разходи по вноса за кола до прага" },
  { name: "stepCost", label: "Разходи на стъпка, €", hint: "добавят се за всяка стъпка над прага" },
  { name: "step", label: "Стъпка, €", hint: "обикновено 10 000" },
  { name: "threshold", label: "Праг, €", hint: "от тази цена на колата нататък" },
  { name: "profit", label: "Надценка (печалба), €", hint: "твоята печалба на кола" },
];

function ProfileForm({ profile, onSaved }: { profile: PricingProfile; onSaved: (p: PricingProfile) => void }) {
  const { adminFetch } = useAdmin();
  const [values, setValues] = useState(profile);
  const [example, setExample] = useState(25000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const changed = fields.some((f) => values[f.name] !== profile[f.name]) || values.stepMode !== profile.stepMode;
  const valid = fields.every((f) => Number.isFinite(values[f.name]) && values[f.name] >= 0) && values.step > 0;

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
      setMessage({ ok: true, text: "Записано ✓ Цените на колите са преизчислени." });
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
              step="any"
              required
              value={Number.isFinite(values[f.name]) ? values[f.name] : ""}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.valueAsNumber })}
              className="field"
            />
            <p className="mt-1 text-xs text-muted">{f.hint}</p>
          </div>
        ))}
        <div>
          <label className="label" htmlFor={`${profile.id}-stepMode`}>
            Непълна стъпка
          </label>
          <select
            id={`${profile.id}-stepMode`}
            value={values.stepMode}
            onChange={(e) => setValues({ ...values, stepMode: e.target.value as StepMode })}
            className="field"
          >
            {(Object.entries(stepModeLabels) as [StepMode, string][]).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">напр. 15 000 € над прага = 2, 1 или 1,5 стъпки</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-paper p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted">Пример: кола за</span>
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
          <strong className="text-base">{valid ? formatEur(finalPrice(example, values)) : "—"}</strong>
        </div>
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
