"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useAdmin } from "./admin-context";
import { SocialPostPanel } from "./social-post-panel";
import { StatusBadge } from "./status-badge";
import {
  drivetrainLabels,
  formatEur,
  formatNumber,
  fuelLabels,
  priceProfileLabels,
  statusLabels,
  transmissionLabels,
} from "@/lib/format";
import type {
  AdminCar,
  CarSpecs,
  CarStatus,
  Drivetrain,
  FuelType,
  PriceProfile,
  PricingInputs,
  Transmission,
} from "@/lib/types";

const statusActions: [CarStatus, string][] = [
  ["PUBLISHED", "Публикувай"],
  ["RESERVED", "Резервирана"],
  ["SOLD", "Продадена"],
  ["ARCHIVED", "Архивирай"],
  ["DRAFT", "Върни в чернова"],
];

/** Reads the form into the API shape: { specs, pricing }. Empty inputs become null. */
function readForm(form: HTMLFormElement): { specs: CarSpecs; pricing: PricingInputs } {
  const f = new FormData(form);
  const text = (k: string) => {
    const v = String(f.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  const number = (k: string) => {
    const v = text(k);
    return v === null ? null : Number(v);
  };
  const specKeys = f.getAll("specKey").map(String);
  const specValues = f.getAll("specValue").map(String);
  const extraSpecs = Object.fromEntries(
    specKeys.map((k, i) => [k.trim(), specValues[i]?.trim() ?? ""]).filter(([k, v]) => k && v),
  );
  return {
    specs: {
      title: text("title") ?? "",
      make: text("make"),
      model: text("model"),
      trim: text("trim"),
      year: number("year"),
      firstRegistration: text("firstRegistration"),
      mileageKm: number("mileageKm"),
      fuelType: text("fuelType") as FuelType | null,
      transmission: text("transmission") as Transmission | null,
      drivetrain: text("drivetrain") as Drivetrain | null,
      engineCc: number("engineCc"),
      engine: text("engine"),
      powerHp: number("powerHp"),
      batteryKwh: number("batteryKwh"),
      electricRangeKm: number("electricRangeKm"),
      rangeStandard: text("rangeStandard"),
      motorPowerKw: number("motorPowerKw"),
      bodyType: text("bodyType"),
      seats: number("seats"),
      doors: number("doors"),
      color: text("color"),
      curbWeightKg: number("curbWeightKg"),
      dimensions: text("dimensions"),
      description: text("description"),
      extraSpecs,
    },
    pricing: {
      sourcePrice: number("sourcePrice"),
      sourceCurrency: text("sourceCurrency"),
      profile: text("profile") as PriceProfile | null,
    },
  };
}

export function CarEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { adminFetch } = useAdmin();
  const router = useRouter();
  const [car, setCar] = useState<AdminCar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminFetch<AdminCar>(`/api/admin/cars/${id}`)
      .then(setCar)
      .catch((e: Error) => setError(e.message));
  }, [adminFetch, id]);

  async function run(action: () => Promise<AdminCar | void>, message?: string) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await action();
      if (updated) setCar(updated);
      if (message) setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    } finally {
      setBusy(false);
    }
  }

  if (!car) return error ? <p className="text-accent-dark">{error}</p> : <p className="text-sm text-muted">Зареждане…</p>;

  const s = car.specs;
  const p = car.pricing;

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = readForm(e.currentTarget);
    void run(
      () => adminFetch<AdminCar>(`/api/admin/cars/${car!.id}`, { method: "PUT", body: JSON.stringify(body) }),
      "saved",
    );
  }

  const publicLink = car.status === "PUBLISHED" || car.status === "RESERVED" ? `/cars/${car.slug}` : null;

  return (
    <div className="pb-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-muted hover:text-ink">
            ← Всички коли
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{s.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <StatusBadge status={car.status} />
            <span>#{car.id}</span>
            <span>· {car.source}</span>
            {car.sourceRef && <span>· {car.sourceRef}</span>}
            {car.sourceLocation && <span>· {car.sourceLocation}</span>}
            {car.sourceUrl && (
              <a href={car.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                оригинална обява ↗
              </a>
            )}
            {publicLink && (
              <Link href={publicLink} target="_blank" className="underline underline-offset-2">
                виж в сайта ↗
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {statusActions
            .filter(([st]) => st !== car.status)
            .map(([st, label]) => (
              <button
                key={st}
                type="button"
                disabled={busy}
                onClick={() =>
                  run(() =>
                    adminFetch<AdminCar>(`/api/admin/cars/${car.id}/status`, {
                      method: "POST",
                      body: JSON.stringify({ status: st }),
                    }),
                  )
                }
                className={st === "PUBLISHED" ? "btn-accent px-4! py-2!" : "btn-ghost px-4! py-2!"}
                title={statusLabels[st]}
              >
                {label}
              </button>
            ))}
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl bg-accent/10 p-3 text-sm font-medium text-accent-dark">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <form key={car.updatedAt} onSubmit={onSave} className="space-y-8">
          <Fieldset title="Основни данни">
            <Field label="Заглавие" name="title" value={s.title} required wide />
            <Field label="Марка" name="make" value={s.make} />
            <Field label="Модел" name="model" value={s.model} />
            <Field label="Версия" name="trim" value={s.trim} wide />
            <Field label="Година" name="year" value={s.year} type="number" />
            <Field label="Първа регистрация (ГГГГ-ММ)" name="firstRegistration" value={s.firstRegistration} />
            <Field label="Пробег, км" name="mileageKm" value={s.mileageKm} type="number" />
            <Choice label="Гориво" name="fuelType" value={s.fuelType} options={fuelLabels} />
            <Choice label="Скоростна кутия" name="transmission" value={s.transmission} options={transmissionLabels} />
            <Choice label="Задвижване" name="drivetrain" value={s.drivetrain} options={drivetrainLabels} />
          </Fieldset>

          <Fieldset title="Двигател и купе">
            <Field label="Обем, см³" name="engineCc" value={s.engineCc} type="number" />
            <Field label="Двигател (текст, напр. 1.5T)" name="engine" value={s.engine} />
            <Field label="Мощност общо, к.с." name="powerHp" value={s.powerHp} type="number" />
            <Field label="Купе (Sedan, SUV …)" name="bodyType" value={s.bodyType} />
            <Field label="Места" name="seats" value={s.seats} type="number" />
            <Field label="Врати" name="doors" value={s.doors} type="number" />
            <Field label="Цвят" name="color" value={s.color} />
            <Field label="Тегло, кг" name="curbWeightKg" value={s.curbWeightKg} type="number" />
            <Field label="Размери, мм (Д × Ш × В)" name="dimensions" value={s.dimensions} wide />
          </Fieldset>

          <Fieldset title="Електрическо задвижване (електромобили и хибриди)">
            <Field label="Батерия, kWh" name="batteryKwh" value={s.batteryKwh} type="number" step="0.1" />
            <Field label="Пробег на ток, км" name="electricRangeKm" value={s.electricRangeKm} type="number" />
            <Field label="Стандарт (CLTC, NEDC, WLTP, EPA)" name="rangeStandard" value={s.rangeStandard} />
            <Field label="Електромотор(и), kW" name="motorPowerKw" value={s.motorPowerKw} type="number" />
          </Fieldset>

          <Fieldset title="Бележки към описанието">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">
                Показват се под описанието в сайта (по желание)
              </label>
              <textarea id="description" name="description" rows={4} defaultValue={s.description ?? ""} className="field" />
            </div>
          </Fieldset>

          <Fieldset title="Цена">
            <Field label="Цена при източника" name="sourcePrice" value={p.sourcePrice} type="number" step="0.01" />
            <Field label="Валута (USD, CNY, KRW, EUR)" name="sourceCurrency" value={p.sourceCurrency} />
            <Choice label="Ценова формула" name="profile" value={p.profile} options={priceProfileLabels} />
            <p className="self-end pb-2.5 text-xs text-muted">
              Разходите и надценката се променят в{" "}
              <Link href="/admin/pricing" className="font-semibold text-accent hover:underline">
                Цени
              </Link>
              .
            </p>
          </Fieldset>

          <SpecsEditor specs={s.extraSpecs} />

          <div className="sticky bottom-4 flex items-center gap-3 rounded-2xl border border-line bg-card/95 p-3 backdrop-blur">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Записване…" : "Запиши"}
            </button>
            {saved && <span className="text-sm font-semibold text-ok">Записано ✓</span>}
            <button
              type="button"
              className="ml-auto text-sm font-semibold text-accent-dark hover:underline"
              onClick={() => {
                if (!confirm("Да изтрия ли колата и снимките ѝ?")) return;
                void run(async () => {
                  await adminFetch<void>(`/api/admin/cars/${car.id}`, { method: "DELETE" });
                  router.push("/admin");
                });
              }}
            >
              Изтрий
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <PriceSummary car={car} />
          <SocialPostPanel car={car} />
          <section>
            <h2 className="mb-3 font-bold">Снимки ({car.images.length})</h2>
            {car.images.length === 0 && <p className="text-sm text-muted">Няма снимки.</p>}
            <div className="grid grid-cols-2 gap-2">
              {car.images.map((img, i) => (
                <div key={img.id} className="group relative overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="aspect-[4/3] w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1.5 left-1.5 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-paper">
                      КОРИЦА
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 p-1.5 opacity-0 transition group-hover:opacity-100">
                    {i !== 0 ? (
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-paper"
                        onClick={() =>
                          run(() =>
                            adminFetch<AdminCar>(`/api/admin/cars/${car.id}/images/${img.id}/cover`, { method: "POST" }),
                          )
                        }
                      >
                        Корица
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-[#ffb59a]"
                      onClick={() =>
                        run(() => adminFetch<AdminCar>(`/api/admin/cars/${car.id}/images/${img.id}`, { method: "DELETE" }))
                      }
                    >
                      Изтрий
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PriceSummary({ car }: { car: AdminCar }) {
  const p = car.price;
  if (!p) {
    return (
      <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4 text-sm">
        Няма цена — въведете цената при източника и запишете.
      </div>
    );
  }
  const rows: [string, number][] = [
    [`Кола (${formatNumber(p.sourcePrice)} ${p.sourceCurrency})`, p.carPriceEur],
    ["Разходи", p.baseCostsEur],
    [`Разходи над прага (× ${formatNumber(p.steps)})`, p.stepCostsEur],
    ["Надценка", p.profitEur],
  ];
  return (
    <div className="rounded-2xl bg-ink p-5 text-paper">
      <p className="text-[11px] font-semibold tracking-wide text-paper/60 uppercase">Крайна цена за клиента</p>
      <p className="mt-1 text-3xl font-extrabold">{formatEur(p.totalEur)}</p>
      <dl className="mt-4 space-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-paper/60">{label}</dt>
            <dd className="font-semibold">{formatEur(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-paper/50">
        {priceProfileLabels[p.profile]}. Клиентът вижда само крайната цена.
      </p>
    </div>
  );
}

function SpecsEditor({ specs }: { specs: Record<string, string> }) {
  const [rows, setRows] = useState<[string, string][]>(() => {
    const entries = Object.entries(specs ?? {});
    return entries.length ? entries : [["", ""]];
  });
  return (
    <Fieldset title="Допълнителни характеристики (етикет → стойност)">
      <div className="space-y-2 sm:col-span-2">
        {rows.map(([k, v], i) => (
          <div key={i} className="flex gap-2">
            <input name="specKey" defaultValue={k} placeholder="Име" className="field w-2/5" />
            <input name="specValue" defaultValue={v} placeholder="Стойност" className="field flex-1" />
            <button
              type="button"
              aria-label="Премахни"
              className="btn-ghost px-3!"
              onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={() => setRows((r) => [...r, ["", ""]])}>
          + Добави ред
        </button>
      </div>
    </Fieldset>
  );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-card p-5">
      <legend className="px-1 text-sm font-bold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  step,
  required,
  wide,
}: {
  label: string;
  name: string;
  value: string | number | null;
  type?: string;
  step?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type={type} step={step} required={required} defaultValue={value ?? ""} className="field" />
    </div>
  );
}

function Choice<T extends string>({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: T | null;
  options: Record<T, string>;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} defaultValue={value ?? ""} className="field">
        <option value="">—</option>
        {(Object.entries(options) as [T, string][]).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}
