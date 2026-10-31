"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "./admin-context";
import { CarImage } from "@/components/car-image";
import {
  CARS_BG_ENGINE_MAX,
  CARS_BG_MAX_PHOTOS,
  CARS_BG_TEXT_MAX,
  type CarsBgJob,
  carsBgDescription,
  carsBgExtras,
  carsBgOptions,
  carsBgWarningText,
} from "@/lib/cars-bg";
import { formatDate } from "@/lib/format";
import {
  CARS_BG_EXTENSION,
  type CarsBgReport,
  EXTENSION_ZIP,
  type ExtMessage,
  useMobileBgExtension,
  versionAtLeast,
} from "@/lib/mobile-bg";
import { defaultTemplates, renderTemplate, templatesFrom, templateValues } from "@/lib/post-template";
import type { AdminCar, CarsBgCatalog, CarsBgForm, CarsBgListing, PostSettings, PostTemplate } from "@/lib/types";

type Message = { ok: boolean; text: string };

/**
 * The car's cars.bg panel: where it is posted, and "Качи в cars.bg", which opens cars.bg's form filled in from the
 * car (editable) and hands it to the browser extension; the admin presses cars.bg's "Публикувай". One offer per
 * car: a car already posted is not posted again until its offer is marked as taken down.
 */
export function CarsBgPanel({ car }: { car: AdminCar }) {
  const { adminFetch } = useAdmin();
  const [form, setForm] = useState<CarsBgForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const handled = useRef(new Set<string>());

  const load = useCallback(
    () =>
      adminFetch<CarsBgForm>(`/api/admin/cars/${car.id}/cars-bg`)
        .then((f) => {
          setForm(f);
          setError(null);
        })
        .catch((e: Error) => setError(e.message)),
    [adminFetch, car.id],
  );

  useEffect(() => {
    void load();
  }, [load, car.updatedAt]);

  const onExtension = useCallback(
    async (msg: ExtMessage) => {
      if (msg.type === "carsBgCatalog" && msg.catalog?.brands?.length) {
        const stored = form?.catalogCapturedAt ? Date.parse(form.catalogCapturedAt) : 0;
        const read = msg.catalog.capturedAt ? Date.parse(msg.catalog.capturedAt) : 0;
        if (form && read > stored) {
          try {
            await adminFetch("/api/admin/cars-bg/catalog", { method: "PUT", body: JSON.stringify(msg.catalog) });
            await load();
          } catch {
            // tried again next time
          }
        }
      } else if (msg.type === "carsBgReports") {
        for (const [key, r] of Object.entries(msg.reports) as [string, CarsBgReport][]) {
          if (handled.current.has(key)) continue;
          handled.current.add(key);
          try {
            const listing = await adminFetch<CarsBgListing>(`/api/admin/cars/${r.carId}/cars-bg/listing`, {
              method: "POST",
              body: JSON.stringify({ offerId: r.offerId, url: r.url }),
            });
            window.postMessage({ source: "pci-page", type: "ack-report", site: "CARS_BG", key }, window.location.origin);
            if (r.carId === car.id) {
              setForm((f) => (f ? { ...f, listing } : f));
              setMessage({ ok: true, text: "Колата е публикувана в cars.bg ✓" });
            }
          } catch {
            handled.current.delete(key);
          }
        }
      } else if (msg.type === "started" && msg.site === "CARS_BG") {
        setMessage(
          msg.ok
            ? { ok: true, text: "Отворих cars.bg в нов таб: разширението попълва формата и качва снимките." }
            : { ok: false, text: msg.error ?? "Разширението не успя да започне." },
        );
      }
    },
    [adminFetch, car.id, form, load],
  );
  const { version, send } = useMobileBgExtension(onExtension);
  const ready = versionAtLeast(version, CARS_BG_EXTENSION);

  useEffect(() => {
    if (!ready || !form) return;
    send({ type: "get-catalog" });
    send({ type: "get-reports" });
  }, [ready, form, send]);

  async function forget() {
    if (!window.confirm("Обявата в cars.bg е свалена или изтрита? Колата ще може да се качи отново.")) return;
    try {
      await adminFetch(`/api/admin/cars/${car.id}/cars-bg/listing`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const listing = form?.listing ?? null;
  const gone = car.status === "SOLD" || car.status === "ARCHIVED";
  const blocked = form ? blockedReason(form) : null;

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold">cars.bg</h2>
        <Link href="/admin/marketplace" className="text-xs font-semibold text-accent hover:underline">
          Модели
        </Link>
      </div>

      {listing ? (
        <div className="text-sm">
          Качена на {formatDate(listing.publishedAt)}
          {listing.publishedBy ? ` от ${listing.publishedBy}` : ""}
          {listing.url && (
            <>
              {" · "}
              <a href={listing.url} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
                виж ↗
              </a>
            </>
          )}
          <button type="button" onClick={forget} className="mt-1 block text-xs font-semibold text-muted hover:text-ink">
            Обявата е свалена от cars.bg
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">Не е качена в cars.bg.</p>
      )}
      {listing && gone && (
        <p className="mt-2 rounded-xl bg-warn/10 p-2.5 text-sm font-semibold text-warn">
          Колата е {car.status === "SOLD" ? "продадена" : "в архив"}: свалете обявата от cars.bg.
        </p>
      )}

      {!listing && (
        <button
          type="button"
          className="btn-primary mt-3 w-full px-3! py-2.5! text-sm!"
          disabled={!form || !!blocked}
          onClick={() => {
            setMessage(null);
            setOpen(true);
          }}
        >
          Качи в cars.bg…
        </button>
      )}
      {!listing && blocked && <p className="mt-2 text-sm text-warn">{blocked}</p>}
      {error && <p className="mt-2 text-sm text-warn">{error}</p>}
      {message && (
        <p className={`mt-2 text-sm font-semibold break-words ${message.ok ? "text-ok" : "text-warn"}`}>{message.text}</p>
      )}
      {!ready && (
        <p className="mt-3 text-xs text-warn">
          {version ? `Разширението е версия ${version}: за cars.bg трябва ${CARS_BG_EXTENSION} или по-нова. ` : "Разширението не е инсталирано. "}
          <a href={EXTENSION_ZIP} className="font-semibold text-accent hover:underline" download>
            Свалете го
          </a>
          , заменете файловете в папката „mobile-bg“ и натиснете „Презареди“ в <code>chrome://extensions</code>.
        </p>
      )}

      {open && form && (
        <CarsBgDialog
          car={car}
          form={form}
          extensionReady={ready}
          onClose={() => setOpen(false)}
          onStart={(job) => {
            send({ type: "start", job });
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}

/** Why the car cannot be posted to cars.bg as it is: its make is not there, or the model is marked missing. */
function blockedReason(form: CarsBgForm): string | null {
  switch (form.match) {
    case "NO_CATALOG":
      return "Списъците на cars.bg още не са прочетени: обновете ги от „Съпоставяне на модели“.";
    case "BRAND_MISSING":
      return "Марката я няма в cars.bg: колата не може да се качи там.";
    case "UNAVAILABLE":
      return "Отбелязано е, че cars.bg няма този модел (може да се промени в „Съпоставяне на модели“).";
    default:
      return null;
  }
}

type Values = CarsBgJob["values"];
const str = (v: number | string | null | undefined) => (v == null ? "" : String(v));

function initialValues(form: CarsBgForm, notes: string): Values {
  const d = form.draft;
  return {
    brandId: d.brandId,
    brandName: d.brandName,
    modelId: d.modelId,
    modelName: d.modelName,
    engine: d.engine ?? "",
    categoryId: str(d.categoryId),
    fuelId: str(d.fuelId),
    gearId: str(d.gearId),
    power: str(d.power),
    cubature: str(d.cubature),
    productionYear: str(d.productionYear),
    monthId: str(d.monthId),
    run: str(d.run),
    doorId: str(d.doorId),
    colorId: str(d.colorId),
    metallic: d.metallic,
    euroId: str(d.euroId),
    price: str(d.price),
    currencyId: str(d.currencyId),
    stateId: str(d.stateId),
    conditionId: str(d.conditionId),
    isInBg: d.inBulgaria ? "1" : "2",
    usageId: str(d.usageId),
    leasing: d.leasing,
    barter: d.barter,
    notes,
  };
}

const REQUIRED: [keyof Values, string][] = [
  ["modelId", "Модел"],
  ["categoryId", "Категория"],
  ["fuelId", "Гориво"],
  ["gearId", "Скоростна кутия"],
  ["productionYear", "Година"],
  ["monthId", "Месец"],
  ["run", "Пробег"],
  ["doorId", "Врати"],
  ["colorId", "Цвят"],
  ["price", "Цена"],
];

function CarsBgDialog({
  car,
  form,
  extensionReady,
  onClose,
  onStart,
}: {
  car: AdminCar;
  form: CarsBgForm;
  extensionReady: boolean;
  onClose: () => void;
  onStart: (job: CarsBgJob) => void;
}) {
  const { adminFetch } = useAdmin();
  const [catalog, setCatalog] = useState<CarsBgCatalog | null>(null);
  const [values, setValues] = useState<Values | null>(null);
  const [extras, setExtras] = useState<Set<number>>(() => new Set(form.draft.extras));
  const [selected, setSelected] = useState<number[]>(() => car.images.slice(0, CARS_BG_MAX_PHOTOS).map((i) => i.id));
  const [tried, setTried] = useState(false);

  useEffect(() => {
    adminFetch<CarsBgCatalog>("/api/admin/cars-bg/catalog").then(setCatalog).catch(() => setCatalog(null));
    Promise.all([
      adminFetch<PostTemplate[]>("/api/admin/post-templates").catch(() => [] as PostTemplate[]),
      adminFetch<PostSettings>("/api/admin/post-settings").catch(() => null),
    ]).then(([templates, settings]) => {
      const t = templatesFrom(templates).MOBILE_BG ?? defaultTemplates.MOBILE_BG;
      const text = renderTemplate(t, templateValues(car, window.location.origin, settings, "MOBILE_BG"));
      setValues(initialValues(form, carsBgDescription(text, form.draft.fullName)));
    });
  }, [adminFetch, car, form]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const models = useMemo(
    () => catalog?.brands.find((b) => b.id === form.draft.brandId)?.models ?? [],
    [catalog, form.draft.brandId],
  );

  if (!values) {
    return createPortal(
      <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true">
        <p className="rounded-2xl bg-card p-6 text-sm">Зареждане…</p>
      </div>,
      document.body,
    );
  }

  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((cur) => (cur ? { ...cur, [k]: v } : cur));
  const missing = REQUIRED.filter(([k]) => !values[k] || String(values[k]).trim() === "").map(([, l]) => l);
  if (values.price && !/^\d{1,8}$/.test(values.price)) missing.push("Цена (цяло число до 8 цифри)");
  if (values.fuelId !== "7" && !values.cubature) missing.push("Кубатура");
  const ordered = car.images.filter((i) => selected.includes(i.id));

  function start() {
    setTried(true);
    if (missing.length || !extensionReady || !values) return;
    const absolute = (u: string) => new URL(u, window.location.origin).href;
    onStart({
      site: "CARS_BG",
      carId: car.id,
      title: car.specs.title,
      values: {
        ...values,
        engine: values.engine.slice(0, CARS_BG_ENGINE_MAX),
        cubature: values.fuelId === "7" ? "" : values.cubature,
        notes: values.notes.slice(0, CARS_BG_TEXT_MAX),
      },
      extras: [...extras].map(String),
      photos: ordered.map((i) => absolute(i.fileUrl)),
    });
  }

  function togglePhoto(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < CARS_BG_MAX_PHOTOS ? [...s, id] : s));
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="w-full max-w-5xl rounded-2xl bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Качване в cars.bg</h2>
            <p className="text-sm text-muted">{car.specs.title}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-3! py-1.5! text-xs!">
            Затвори
          </button>
        </div>

        {form.warnings.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 rounded-xl bg-paper p-3 pl-7 text-sm">
            {form.warnings.map((w, i) => (
              <li key={i}>{carsBgWarningText(w.code, w.value)}</li>
            ))}
          </ul>
        )}

        <section className="mt-5 rounded-xl border border-line p-4">
          <h3 className="mb-3 font-bold">Данни за обявата</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="label">Марка</span>
              <input value={values.brandName ?? ""} disabled className="field py-2!" />
            </label>
            <Select
              label="Модел *"
              value={values.modelId}
              onChange={(v) => setValues({ ...values, modelId: v || null, modelName: models.find((m) => m.id === v)?.name ?? null })}
              options={models.map((m) => ({ value: m.id, text: m.name }))}
            />
            <Text
              label={`Двигател/модификация (до ${CARS_BG_ENGINE_MAX} знака)`}
              value={values.engine}
              onChange={(v) => set("engine", v)}
              max={CARS_BG_ENGINE_MAX}
            />
            <Select label="Категория *" value={values.categoryId} onChange={(v) => set("categoryId", v)} options={carsBgOptions.categoryId} />
            <Select label="Гориво *" value={values.fuelId} onChange={(v) => set("fuelId", v)} options={carsBgOptions.fuelId} />
            <Select label="Скоростна кутия *" value={values.gearId} onChange={(v) => set("gearId", v)} options={carsBgOptions.gearId} />
            <Text label="Мощност, к.с." value={values.power} onChange={(v) => set("power", v)} type="number" />
            {values.fuelId !== "7" && (
              <Text label="Кубатура, см³ *" value={values.cubature} onChange={(v) => set("cubature", v)} type="number" />
            )}
            <Select label="Евростандарт" value={values.euroId} onChange={(v) => set("euroId", v)} options={carsBgOptions.euroId} />
            <Text label="Година *" value={values.productionYear} onChange={(v) => set("productionYear", v)} type="number" />
            <Select label="Месец *" value={values.monthId} onChange={(v) => set("monthId", v)} options={carsBgOptions.monthId} />
            <Text label="Пробег, км *" value={values.run} onChange={(v) => set("run", v)} type="number" />
            <Select label="Врати *" value={values.doorId} onChange={(v) => set("doorId", v)} options={carsBgOptions.doorId} />
            <Select label="Цвят *" value={values.colorId} onChange={(v) => set("colorId", v)} options={carsBgOptions.colorId} />
            <Text label="Цена, EUR (крайна, с ДДС) *" value={values.price} onChange={(v) => set("price", v)} type="number" />
            <Select label="Състояние" value={values.stateId} onChange={(v) => set("stateId", v)} options={carsBgOptions.stateId} />
            <Select label="Повреди" value={values.conditionId} onChange={(v) => set("conditionId", v)} options={carsBgOptions.conditionId} />
            <Select label="Намира се" value={values.isInBg} onChange={(v) => set("isInBg", v)} options={carsBgOptions.isInBg} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Check label="Металик" checked={values.metallic} onChange={(v) => set("metallic", v)} />
            <Check label="Лизинг" checked={values.leasing} onChange={(v) => set("leasing", v)} />
            <Check label="Бартер" checked={values.barter} onChange={(v) => set("barter", v)} />
          </div>

          <fieldset className="mt-5 rounded-xl border border-line p-3">
            <legend className="px-1 text-sm font-bold">Екстри на cars.bg ({extras.size})</legend>
            <div className="space-y-4">
              {carsBgExtras.map((g) => (
                <div key={g.title}>
                  <h4 className="text-xs font-bold tracking-wide text-muted uppercase">{g.title}</h4>
                  <div className="mt-1.5 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map(([id, label]) => (
                      <Check
                        key={id}
                        label={label}
                        checked={extras.has(id)}
                        onChange={(on) =>
                          setExtras((s) => {
                            const next = new Set(s);
                            if (on) next.add(id);
                            else next.delete(id);
                            return next;
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="mt-5">
            <label className="label" htmlFor="cbg-notes">
              Описание (от шаблона за mobile.bg)
            </label>
            <textarea
              id="cbg-notes"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={9}
              className="field text-sm!"
            />
            <p className="mt-1 text-xs text-muted">
              Правилата на cars.bg забраняват линкове, телефони и емоджита в текста: махнати са. Телефонът в обявата е
              този от профила на автокъщата.
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-line p-4">
          <h3 className="mb-3 font-bold">
            Снимки: {ordered.length} от {Math.min(CARS_BG_MAX_PHOTOS, car.images.length)} (макс. {CARS_BG_MAX_PHOTOS})
          </h3>
          <div className="mb-2 flex gap-1">
            <button type="button" className="btn-ghost px-2! py-0.5! text-xs!" onClick={() => setSelected(car.images.slice(0, CARS_BG_MAX_PHOTOS).map((i) => i.id))}>
              Първите {Math.min(CARS_BG_MAX_PHOTOS, car.images.length)}
            </button>
            <button type="button" className="btn-ghost px-2! py-0.5! text-xs!" onClick={() => setSelected([])}>
              Нито една
            </button>
          </div>
          <ul className="grid max-h-[24rem] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5 lg:grid-cols-6">
            {car.images.map((img) => {
              const n = ordered.findIndex((i) => i.id === img.id);
              const on = n >= 0;
              const disabled = !on && ordered.length >= CARS_BG_MAX_PHOTOS;
              return (
                <li key={img.id}>
                  <button
                    type="button"
                    onClick={() => togglePhoto(img.id)}
                    disabled={disabled}
                    aria-pressed={on}
                    className={`relative block aspect-[4/3] w-full overflow-hidden rounded-lg ring-2 ${on ? "ring-accent" : "ring-transparent"} ${disabled ? "opacity-40" : "hover:ring-ink/40"}`}
                  >
                    <CarImage src={img.url} alt="" className={`h-full w-full object-cover ${on ? "" : "opacity-60"}`} />
                    {on && (
                      <span className="absolute top-1 left-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-white">
                        {n + 1}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-xs text-muted">Качват се в реда от галерията като JPEG, първата е главната.</p>
        </section>

        <div className="mt-5 rounded-xl bg-paper p-3 text-sm">
          <p className="font-semibold">Как продължава</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted">
            <li>Отваря се cars.bg в нов таб („Публикувай обява“), формата се попълва и снимките се качват.</li>
            <li>Проверете всичко и натиснете „Публикувай“ най-долу: това публикува обявата веднага.</li>
            <li>Обявата се записва тук автоматично.</li>
          </ol>
        </div>

        {tried && missing.length > 0 && <p className="mt-3 text-sm font-semibold text-warn">Попълнете: {missing.join(", ")}.</p>}
        {!extensionReady && (
          <p className="mt-3 text-sm font-semibold text-warn">
            Разширението в този браузър не поддържа cars.bg: инсталирайте новата версия (вижте карето cars.bg).
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Откажи
          </button>
          <button type="button" onClick={start} disabled={!extensionReady || (tried && missing.length > 0)} className="btn-primary">
            Попълни в cars.bg ({ordered.length} {ordered.length === 1 ? "снимка" : "снимки"})
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Text({
  label,
  value,
  onChange,
  type = "text",
  max,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  type?: string;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input type={type} value={value ?? ""} maxLength={max} onChange={(e) => onChange(e.target.value)} className="field py-2!" />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  options: { value: string; text: string }[];
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="field py-2!">
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.text}
          </option>
        ))}
      </select>
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 accent-accent" />
      {label}
    </label>
  );
}
