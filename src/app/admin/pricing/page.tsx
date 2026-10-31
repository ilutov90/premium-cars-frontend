"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { PriceRecalcPanel } from "@/components/admin/price-recalc-panel";
import { formatDate, formatEur, priceProfileLabels } from "@/lib/format";
import type { DutyBracket, ExchangeRates, PricingProfile } from "@/lib/types";

/** The table's row for a FOB, as the backend PriceCalculator.bracket: the next row up, else the open row. */
function bracket(fob: number, rows: DutyBracket[]): DutyBracket | null {
  if (rows.length === 0) return null;
  const closed = rows.filter((r) => r.fobUpTo != null).sort((a, b) => a.fobUpTo! - b.fobUpTo!);
  return closed.find((r) => fob <= r.fobUpTo!) ?? rows.find((r) => r.fobUpTo == null) ?? closed[closed.length - 1];
}

/** Same formula as the backend PriceCalculator; used only for the live example. */
function priceParts(fob: number, p: Omit<PricingProfile, "id" | "updatedAt">) {
  const row = bracket(fob, p.dutyBrackets);
  const dutyVat = row ? row.dutyVat : Math.round((fob + p.seaFreight) * p.dutyVatPct) / 100;
  const markup = fob <= p.markupThreshold ? p.markupLow : p.markupHigh;
  const total = Math.round(fob + p.seaFreight + p.landTransport + p.commission + dutyVat + markup);
  return { dutyVat, row, markup, total };
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
        транспорт + комисионна + мито и ДДС + надценка. Мито и ДДС = процент от (FOB + морски транспорт) или по
        таблица според FOB (autowini; за FOB между два реда — следващият ред нагоре); надценка = фиксирана сума
        според FOB (до прага включително едната, над него другата). Пример за autowini, FOB 15 700 €: 15 700 + 1200 +
        1600 + 500 + мито и ДДС 2680 (редът до 16 000) + надценка 1000 = 22 680 €. Тази цена се показва в сайта и в постовете. Промяна на
        формулата важи за новите импорти; качените коли се преизчисляват само ръчно (по-долу) или една по една от
        страницата им („Преизчисли“).
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
      <PriceRecalcPanel />
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

type FieldName = Exclude<keyof PricingProfile, "id" | "updatedAt" | "dutyBrackets">;

const fields: { name: FieldName; label: string; hint: string; max?: number }[] = [
  { name: "seaFreight", label: "Морски транспорт, €", hint: "до европейското пристанище" },
  { name: "landTransport", label: "Сухопътен транспорт, €", hint: "от пристанището до България" },
  { name: "commission", label: "Комисионна, €", hint: "на посредника" },
  { name: "dutyVatPct", label: "Мито и ДДС, %", hint: "процент от FOB + морски транспорт (0 = няма)", max: 100 },
  { name: "markupThreshold", label: "Праг на надценката (FOB), €", hint: "до него включително — първата сума" },
  { name: "markupLow", label: "Надценка до прага, €", hint: "фиксирана сума" },
  { name: "markupHigh", label: "Надценка над прага, €", hint: "фиксирана сума" },
];

function ProfileForm({ profile, onSaved }: { profile: PricingProfile; onSaved: (p: PricingProfile) => void }) {
  const { adminFetch } = useAdmin();
  const [values, setValues] = useState(profile);
  const [example, setExample] = useState(20000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const table = values.dutyBrackets.length > 0;
  const shown = fields.filter((f) => !(table && f.name === "dutyVatPct"));
  const changed =
    fields.some((f) => values[f.name] !== profile[f.name]) ||
    JSON.stringify(values.dutyBrackets) !== JSON.stringify(profile.dutyBrackets);
  const upTos = values.dutyBrackets.filter((r) => r.fobUpTo != null).map((r) => r.fobUpTo);
  const valid =
    shown.every(
      (f) => Number.isFinite(values[f.name]) && values[f.name] >= 0 && (f.max == null || values[f.name] <= f.max),
    ) &&
    values.dutyBrackets.every(
      (r) => Number.isFinite(r.dutyVat) && r.dutyVat >= 0 && (r.fobUpTo == null || (Number.isFinite(r.fobUpTo) && r.fobUpTo >= 0)),
    ) &&
    new Set(upTos).size === upTos.length;
  const parts = valid ? priceParts(example, values) : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const saved = await adminFetch<PricingProfile>(`/api/admin/pricing-profiles/${profile.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...values, dutyBrackets: sortRows(values.dutyBrackets) }),
      });
      onSaved(saved);
      setValues(saved);
      setMessage({ ok: true, text: "Записано ✓ Важи за новите импорти; качените коли — след преизчисляване." });
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
        {shown.map((f) => (
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

      <DutyTable profileId={profile.id} rows={values.dutyBrackets} onChange={(dutyBrackets) => setValues({ ...values, dutyBrackets })} />

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
            {formatEur(values.commission)}
            {parts.dutyVat > 0 && (
              <>
                {" "}
                + мито и ДДС {formatEur(parts.dutyVat)}
                {parts.row &&
                  (parts.row.fobUpTo != null ? ` (редът до ${formatEur(parts.row.fobUpTo)})` : " (редът „над“)")}
              </>
            )}{" "}
            + надценка {formatEur(parts.markup)}
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

/** Ascending by "FOB up to", the open row last (as the backend keeps them). */
function sortRows(rows: DutyBracket[]): DutyBracket[] {
  return [...rows].sort((a, b) => (a.fobUpTo ?? Infinity) - (b.fobUpTo ?? Infinity));
}

/** Duty and VAT: a percent of FOB + sea freight, or a table by FOB (the next row up; the open row above all). */
function DutyTable({
  profileId,
  rows,
  onChange,
}: {
  profileId: string;
  rows: DutyBracket[];
  onChange: (rows: DutyBracket[]) => void;
}) {
  const table = rows.length > 0;
  const closed = rows.filter((r) => r.fobUpTo != null);
  const open = rows.find((r) => r.fobUpTo == null);
  const setRow = (i: number, change: Partial<DutyBracket>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...change } : r)));

  return (
    <fieldset className="mt-5 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-bold">Мито и ДДС</legend>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`${profileId}-duty`}
            checked={!table}
            onChange={() => onChange([])}
          />
          Процент от FOB + морски транспорт
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`${profileId}-duty`}
            checked={table}
            onChange={() =>
              onChange([
                { fobUpTo: 10000, dutyVat: 0 },
                { fobUpTo: null, dutyVat: 0 },
              ])
            }
          />
          Фиксирано по таблица според FOB
        </label>
      </div>
      {table && (
        <>
          <p className="mt-2 text-xs text-muted">
            За FOB между два реда се взема следващият ред нагоре (15 700 → редът до 16 000). Последният ред е за всеки
            FOB над останалите.
          </p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="pb-1 font-semibold">FOB до, €</th>
                <th className="pb-1 font-semibold">Мито и ДДС, €</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) =>
                r.fobUpTo == null ? null : (
                  <tr key={i}>
                    <td className="py-0.5 pr-2">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={Number.isFinite(r.fobUpTo) ? r.fobUpTo : ""}
                        onChange={(e) => setRow(i, { fobUpTo: e.target.valueAsNumber })}
                        aria-label={`FOB до, ред ${i + 1}`}
                        className="field py-1.5!"
                      />
                    </td>
                    <td className="py-0.5 pr-2">
                      <input
                        type="number"
                        min={0}
                        step={10}
                        value={Number.isFinite(r.dutyVat) ? r.dutyVat : ""}
                        onChange={(e) => setRow(i, { dutyVat: e.target.valueAsNumber })}
                        aria-label={`Мито и ДДС, ред ${i + 1}`}
                        className="field py-1.5!"
                      />
                    </td>
                    <td className="py-0.5">
                      <button
                        type="button"
                        onClick={() => onChange(rows.filter((_, j) => j !== i))}
                        disabled={closed.length <= 1}
                        className="px-2 text-muted hover:text-warn disabled:opacity-30"
                        aria-label="Махни реда"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ),
              )}
              <tr>
                <td className="py-0.5 pr-2 text-muted">
                  над {closed.length ? formatEur(Math.max(...closed.map((r) => r.fobUpTo ?? 0))) : "—"}
                </td>
                <td className="py-0.5 pr-2">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={open && Number.isFinite(open.dutyVat) ? open.dutyVat : ""}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      onChange(
                        open
                          ? rows.map((r) => (r.fobUpTo == null ? { ...r, dutyVat: v } : r))
                          : [...rows, { fobUpTo: null, dutyVat: v }],
                      );
                    }}
                    aria-label="Мито и ДДС над последния ред"
                    className="field py-1.5!"
                  />
                </td>
                <td />
              </tr>
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => {
              const top = closed.length ? Math.max(...closed.map((r) => r.fobUpTo ?? 0)) : 9000;
              const last = closed.find((r) => r.fobUpTo === top);
              onChange(sortRows([...rows, { fobUpTo: top + 1000, dutyVat: last?.dutyVat ?? 0 }]));
            }}
            className="mt-2 text-sm font-semibold text-accent hover:underline"
          >
            + Добави ред
          </button>
        </>
      )}
    </fieldset>
  );
}
