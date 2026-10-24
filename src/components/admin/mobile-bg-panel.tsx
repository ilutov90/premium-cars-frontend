"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "./admin-context";
import { CarImage } from "@/components/car-image";
import { featureGroups, featureLabels, formatDate } from "@/lib/format";
import {
  EXTENSION_ZIP,
  type ExtMessage,
  MOBILE_BG_MAX_PHOTOS,
  MOBILE_BG_TEXT_MAX,
  mobileBgOptions,
  mobileBgPhone,
  type ListingReport,
  type MobileBgJob,
  useMobileBgExtension,
  warningText,
  withoutEmoji,
} from "@/lib/mobile-bg";
import { defaultTemplates, renderTemplate, templatesFrom, templateValues } from "@/lib/post-template";
import { contactDetails } from "@/lib/site";
import type {
  AdminCar,
  CarFeature,
  MobileBgCatalog,
  MobileBgForm,
  MobileBgListing,
  PostSettings,
  PostTemplate,
} from "@/lib/types";

type Message = { ok: boolean; text: string };

/**
 * The car's mobile.bg panel: where it is posted, and "Качи в mobile.bg", which opens the module (mobile.bg's
 * form filled in from the car, editable) and hands it to the browser extension. Listings the extension saw
 * published are recorded here; mobile.bg's lists it read are sent to the server for everyone.
 */
export function MobileBgPanel({ car }: { car: AdminCar }) {
  const { adminFetch } = useAdmin();
  const [form, setForm] = useState<MobileBgForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const handled = useRef(new Set<string>());

  const load = useCallback(
    () =>
      adminFetch<MobileBgForm>(`/api/admin/cars/${car.id}/mobile-bg`)
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
      if (msg.type === "catalog" && msg.catalog?.brands?.length) {
        // newer lists from mobile.bg: kept on the server, and the form is matched against them again
        const stored = form?.catalogCapturedAt ? Date.parse(form.catalogCapturedAt) : 0;
        const read = msg.catalog.capturedAt ? Date.parse(msg.catalog.capturedAt) : 0;
        if (form && read > stored) {
          try {
            await adminFetch("/api/admin/mobile-bg/catalog", { method: "PUT", body: JSON.stringify(msg.catalog) });
            await load();
          } catch {
            // not important: tried again next time
          }
        }
      } else if (msg.type === "reports") {
        for (const [key, r] of Object.entries(msg.reports) as [string, ListingReport][]) {
          if (handled.current.has(key)) continue;
          handled.current.add(key);
          try {
            const listing = await adminFetch<MobileBgListing>(`/api/admin/cars/${r.carId}/mobile-bg/listing`, {
              method: "POST",
              body: JSON.stringify({ listingId: r.listingId, url: r.url }),
            });
            window.postMessage({ source: "pci-page", type: "ack-report", key }, window.location.origin);
            if (r.carId === car.id) {
              setForm((f) => (f ? { ...f, listing } : f));
              setMessage({ ok: true, text: "Колата е публикувана в mobile.bg ✓" });
            }
          } catch {
            handled.current.delete(key); // tried again on the next page load
          }
        }
      } else if (msg.type === "started") {
        setMessage(
          msg.ok
            ? { ok: true, text: "Отворих mobile.bg в нов таб: разширението попълва формата стъпка по стъпка." }
            : { ok: false, text: msg.error ?? "Разширението не успя да започне." },
        );
      } else if (msg.type === "error") {
        setMessage({ ok: false, text: msg.error });
      }
    },
    [adminFetch, car.id, form, load],
  );
  const { version, send } = useMobileBgExtension(onExtension);

  useEffect(() => {
    if (!version || !form) return;
    send({ type: "get-catalog" });
    send({ type: "get-reports" });
  }, [version, form, send]);

  const listing = form?.listing ?? null;
  const gone = car.status === "SOLD" || car.status === "ARCHIVED";

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold">mobile.bg</h2>
        <Link href="/admin/templates" className="text-xs font-semibold text-accent hover:underline">
          Шаблон
        </Link>
      </div>

      {listing ? (
        <p className="text-sm">
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
        </p>
      ) : (
        <p className="text-sm text-muted">Не е качена в mobile.bg.</p>
      )}
      {listing && gone && (
        <p className="mt-2 rounded-xl bg-warn/10 p-2.5 text-sm font-semibold text-warn">
          Колата е {car.status === "SOLD" ? "продадена" : "в архив"}: свалете обявата от mobile.bg.
        </p>
      )}

      <button
        type="button"
        className="btn-primary mt-3 w-full px-3! py-2.5! text-sm!"
        disabled={!form}
        onClick={() => {
          setMessage(null);
          setOpen(true);
        }}
      >
        Качи в mobile.bg…
      </button>
      {error && <p className="mt-2 text-sm text-warn">{error}</p>}
      {message && (
        <p className={`mt-2 text-sm font-semibold break-words ${message.ok ? "text-ok" : "text-warn"}`}>{message.text}</p>
      )}
      {!version && <InstallHelp />}

      {open && form && (
        <MobileBgDialog
          car={car}
          form={form}
          extensionReady={!!version}
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

function InstallHelp() {
  return (
    <details className="mt-3 rounded-xl border border-line p-3 text-xs">
      <summary className="cursor-pointer font-semibold text-warn">Разширението за mobile.bg не е инсталирано</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted">
        <li>
          Свалете{" "}
          <a href={EXTENSION_ZIP} className="font-semibold text-accent hover:underline" download>
            разширението (zip)
          </a>{" "}
          и го разархивирайте в папка, която няма да триете.
        </li>
        <li>
          В Chrome (или Edge) отворете <code>chrome://extensions</code> и включете „Режим за програмисти“.
        </li>
        <li>„Зареди разархивирано“ → изберете папката „mobile-bg“.</li>
        <li>Презаредете тази страница. Влезте в mobile.bg с дилърския профил в същия браузър.</li>
      </ol>
    </details>
  );
}

type Values = MobileBgJob["values"];

const str = (v: number | string | null | undefined) => (v == null ? "" : String(v));

/** The editable values of the form, starting from the server's draft. */
function initialValues(form: MobileBgForm, description: string, phone: string): Values {
  const d = form.draft;
  return {
    brand: d.brand,
    model: d.model,
    modification: d.modification,
    engineType: d.engineType,
    condition: d.condition,
    powerHp: str(d.powerHp),
    euroStandard: str(d.euroStandard),
    gearbox: d.gearbox,
    category: d.category,
    engineCc: str(d.engineCc),
    price: str(d.price),
    vat: d.vat,
    currency: d.currency,
    mileageKm: str(d.mileageKm),
    month: d.month,
    year: str(d.year),
    color: d.color,
    region: d.region,
    city: d.city,
    rangeKm: str(d.rangeKm),
    batteryKwh: str(d.batteryKwh),
    vin: "",
    description,
    phone,
  };
}

const REQUIRED: [keyof Values, string][] = [
  ["brand", "Марка"],
  ["model", "Модел"],
  ["engineType", "Двигател"],
  ["condition", "Състояние"],
  ["gearbox", "Скоростна кутия"],
  ["category", "Категория"],
  ["price", "Цена"],
  ["currency", "Валута"],
  ["mileageKm", "Пробег"],
  ["month", "Месец"],
  ["year", "Година"],
  ["region", "Намира се в"],
  ["city", "Населено място"],
  ["phone", "Телефон"],
];

/**
 * The module: mobile.bg's three steps with the car's data filled in, everything editable. "Попълни в mobile.bg"
 * hands it to the extension, which types it into mobile.bg; the admin presses mobile.bg's buttons.
 */
function MobileBgDialog({
  car,
  form,
  extensionReady,
  onClose,
  onStart,
}: {
  car: AdminCar;
  form: MobileBgForm;
  extensionReady: boolean;
  onClose: () => void;
  onStart: (job: MobileBgJob) => void;
}) {
  const { adminFetch } = useAdmin();
  const [catalog, setCatalog] = useState<MobileBgCatalog | null>(null);
  const [values, setValues] = useState<Values | null>(null);
  const [extras, setExtras] = useState<Set<CarFeature>>(() => new Set(form.draft.extras));
  const [selected, setSelected] = useState<number[]>(() => car.images.slice(0, MOBILE_BG_MAX_PHOTOS).map((i) => i.id));
  const [tried, setTried] = useState(false);

  useEffect(() => {
    adminFetch<MobileBgCatalog>("/api/admin/mobile-bg/catalog").then(setCatalog).catch(() => setCatalog(null));
    Promise.all([
      adminFetch<PostTemplate[]>("/api/admin/post-templates").catch(() => [] as PostTemplate[]),
      adminFetch<PostSettings>("/api/admin/post-settings").catch(() => null),
    ]).then(([templates, settings]) => {
      const t = templatesFrom(templates).MOBILE_BG ?? defaultTemplates.MOBILE_BG;
      const text = withoutEmoji(renderTemplate(t, templateValues(car, window.location.origin, settings)));
      setValues(initialValues(form, text.slice(0, MOBILE_BG_TEXT_MAX), mobileBgPhone(contactDetails(settings).phone)));
    });
  }, [adminFetch, car, form]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const brands = useMemo(() => catalog?.brands ?? [], [catalog]);
  const models = useMemo(
    () => brands.find((b) => b.name === values?.brand)?.models ?? [],
    [brands, values?.brand],
  );

  if (!values) {
    return createPortal(
      <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true">
        <p className="rounded-2xl bg-card p-6 text-sm">Зареждане…</p>
      </div>,
      document.body,
    );
  }

  const set = (k: keyof Values, v: string) => setValues((cur) => (cur ? { ...cur, [k]: v === "" ? null : v } : cur));
  const battery = values.engineType === "Електрически" || values.engineType === "Plug-in хибрид";
  const missing = REQUIRED.filter(([k]) => !values[k] || String(values[k]).trim() === "").map(([, l]) => l);
  if (battery && !values.rangeKm) missing.push("Пробег на ток (WLTP)");
  if (battery && !values.batteryKwh) missing.push("Капацитет на батерията");
  if (values.price && !/^\d{1,7}$/.test(values.price)) missing.push("Цена (цяло число до 7 цифри)");
  if (values.phone && !/^0\d{6,12}$/.test(values.phone)) missing.push("Телефон (само цифри, започва с 0)");
  const ordered = car.images.filter((i) => selected.includes(i.id));
  const brandKnown = !brands.length || brands.some((b) => b.name === values.brand);
  const modelKnown = !models.length || models.includes(values.model ?? "");

  function start() {
    setTried(true);
    if (missing.length || !extensionReady || !values) return;
    const absolute = (u: string) => new URL(u, window.location.origin).href;
    onStart({
      carId: car.id,
      title: car.specs.title,
      values: { ...values, description: values.description.slice(0, MOBILE_BG_TEXT_MAX) },
      extras: [...extras].map((f) => form.extraValues[f]).filter(Boolean),
      photos: ordered.map((i) => absolute(i.url)),
    });
  }

  function togglePhoto(id: number) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < MOBILE_BG_MAX_PHOTOS ? [...s, id] : s,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="w-full max-w-5xl rounded-2xl bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Качване в mobile.bg</h2>
            <p className="text-sm text-muted">{car.specs.title}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-3! py-1.5! text-xs!">
            Затвори
          </button>
        </div>

        {form.listing && (
          <p className="mt-3 rounded-xl bg-warn/10 p-3 text-sm text-warn">
            Колата вече е качена в mobile.bg на {formatDate(form.listing.publishedAt)}
            {form.listing.url && (
              <>
                {" "}
                (
                <a href={form.listing.url} target="_blank" rel="noreferrer" className="underline">
                  обявата
                </a>
                )
              </>
            )}
            . Ново качване прави втора обява.
          </p>
        )}
        {form.warnings.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 rounded-xl bg-paper p-3 pl-7 text-sm">
            {form.warnings.map((w, i) => (
              <li key={i}>{warningText(w.code, w.value)}</li>
            ))}
          </ul>
        )}

        <Step n={1} title="Данни за обявата">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {brands.length ? (
              <Select label="Марка *" value={values.brand} onChange={(v) => setValues({ ...values, brand: v || null, model: null })}
                options={brands.map((b) => ({ value: b.name, text: b.name }))} extra={brandKnown ? null : values.brand} />
            ) : (
              <Text label="Марка *" value={values.brand} onChange={(v) => set("brand", v)} />
            )}
            {models.length ? (
              <Select label="Модел *" value={values.model} onChange={(v) => set("model", v)}
                options={models.map((m) => ({ value: m, text: m }))} extra={modelKnown ? null : values.model} />
            ) : (
              <Text label="Модел *" value={values.model} onChange={(v) => set("model", v)} />
            )}
            <Text label="Модификация" value={values.modification} onChange={(v) => set("modification", v)} max={50} />
            <Select label="Двигател *" value={values.engineType} onChange={(v) => set("engineType", v)} options={mobileBgOptions(catalog, "f8")} />
            <Select label="Състояние *" value={values.condition} onChange={(v) => set("condition", v)} options={mobileBgOptions(catalog, "f25")} />
            <Text label="Мощност, к.с." value={values.powerHp} onChange={(v) => set("powerHp", v)} type="number" />
            <Select label="Евростандарт" value={values.euroStandard} onChange={(v) => set("euroStandard", v)} options={mobileBgOptions(catalog, "f29")} />
            <Select label="Скоростна кутия *" value={values.gearbox} onChange={(v) => set("gearbox", v)} options={mobileBgOptions(catalog, "f10")} />
            <Select label="Категория *" value={values.category} onChange={(v) => set("category", v)} options={mobileBgOptions(catalog, "f11")} />
            <Text label="Кубатура, см³" value={values.engineCc} onChange={(v) => set("engineCc", v)} type="number" />
            <Text label="Цена *" value={values.price} onChange={(v) => set("price", v)} type="number" />
            <Select label="ДДС" value={values.vat} onChange={(v) => set("vat", v)} options={mobileBgOptions(catalog, "f31")} />
            <Select label="Валута *" value={values.currency} onChange={(v) => set("currency", v)} options={mobileBgOptions(catalog, "f13")} />
            <Text label="Пробег, км *" value={values.mileageKm} onChange={(v) => set("mileageKm", v)} type="number" />
            <Select label="Месец на производство *" value={values.month} onChange={(v) => set("month", v)} options={mobileBgOptions(catalog, "f14")} />
            <Text label="Година *" value={values.year} onChange={(v) => set("year", v)} type="number" />
            {mobileBgOptions(catalog, "f17").length ? (
              <Select label="Цвят" value={values.color} onChange={(v) => set("color", v)} options={mobileBgOptions(catalog, "f17")} extra={values.color} />
            ) : (
              <Text label="Цвят" value={values.color} onChange={(v) => set("color", v)} />
            )}
            {mobileBgOptions(catalog, "f18").length ? (
              <Select label="Намира се в *" value={values.region} onChange={(v) => set("region", v)} options={mobileBgOptions(catalog, "f18")} extra={values.region} />
            ) : (
              <Text label="Намира се в (област) *" value={values.region} onChange={(v) => set("region", v)} />
            )}
            <Text label="Населено място *" value={values.city} onChange={(v) => set("city", v)} />
            <Text label="VIN" value={values.vin} onChange={(v) => set("vin", v)} max={17} />
            <Text label="Телефон *" value={values.phone} onChange={(v) => set("phone", v.replace(/\D/g, ""))} />
            {battery && (
              <>
                <Text label="Пробег на ток WLTP, км *" value={values.rangeKm} onChange={(v) => set("rangeKm", v)} type="number" />
                <Text label="Капацитет на батерията, kWh *" value={values.batteryKwh} onChange={(v) => set("batteryKwh", v)} type="number" />
              </>
            )}
          </div>

          <fieldset className="mt-5 rounded-xl border border-line p-3">
            <legend className="px-1 text-sm font-bold">Екстри ({extras.size})</legend>
            <div className="space-y-4">
              {featureGroups.map((g) => (
                <div key={g.title}>
                  <h4 className="text-xs font-bold tracking-wide text-muted uppercase">{g.title}</h4>
                  <div className="mt-1.5 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {g.features.map((f) => (
                      <label key={f} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={extras.has(f)}
                          onChange={() =>
                            setExtras((s) => {
                              const next = new Set(s);
                              if (next.has(f)) next.delete(f);
                              else next.add(f);
                              return next;
                            })
                          }
                          className="mt-1 accent-accent"
                        />
                        {featureLabels[f]}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="mt-5">
            <label className="label" htmlFor="mbg-description">
              Допълнителна информация (от шаблона за mobile.bg)
            </label>
            <textarea
              id="mbg-description"
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
              rows={8}
              className="field text-sm!"
            />
            <p className={`mt-1 text-xs ${values.description.length > MOBILE_BG_TEXT_MAX ? "font-semibold text-warn" : "text-muted"}`}>
              {values.description.length} / {MOBILE_BG_TEXT_MAX} знака · емоджитата са махнати, mobile.bg не ги показва
            </p>
          </div>
        </Step>

        <Step n={2} title={`Снимки: ${ordered.length} от ${Math.min(MOBILE_BG_MAX_PHOTOS, car.images.length)} (макс. ${MOBILE_BG_MAX_PHOTOS})`}>
          <div className="mb-2 flex gap-1">
            <button type="button" className="btn-ghost px-2! py-0.5! text-xs!" onClick={() => setSelected(car.images.slice(0, MOBILE_BG_MAX_PHOTOS).map((i) => i.id))}>
              Първите {Math.min(MOBILE_BG_MAX_PHOTOS, car.images.length)}
            </button>
            <button type="button" className="btn-ghost px-2! py-0.5! text-xs!" onClick={() => setSelected([])}>
              Нито една
            </button>
          </div>
          <ul className="grid max-h-[24rem] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5 lg:grid-cols-6">
            {car.images.map((img) => {
              const n = ordered.findIndex((i) => i.id === img.id);
              const on = n >= 0;
              const disabled = !on && ordered.length >= MOBILE_BG_MAX_PHOTOS;
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
          <p className="mt-1 text-xs text-muted">
            Качват се в реда от галерията, първата е главната. Разширението ги качва на втората стъпка в mobile.bg.
          </p>
        </Step>

        <Step n={3} title="Промотиране (VIP, ТОП)">
          <p className="text-sm text-muted">Не се попълва оттук: изберете го в mobile.bg, ако искате.</p>
        </Step>

        <div className="mt-5 rounded-xl bg-paper p-3 text-sm">
          <p className="font-semibold">Как продължава</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted">
            <li>Отваря се mobile.bg в нов таб и стъпка 1 се попълва. Проверете и натиснете „ПРОДЪЛЖИ“.</li>
            <li>На стъпка 2 снимките се качват сами. „ПРОДЪЛЖИ“ там ПУБЛИКУВА обявата: натиснете го вие.</li>
            <li>Обявата се записва тук автоматично. Промотирането на стъпка 3 е по избор.</li>
          </ol>
        </div>

        {tried && missing.length > 0 && (
          <p className="mt-3 text-sm font-semibold text-warn">Попълнете: {missing.join(", ")}.</p>
        )}
        {!extensionReady && (
          <p className="mt-3 text-sm font-semibold text-warn">
            Разширението за mobile.bg не е инсталирано в този браузър (вижте „Разширението… не е инсталирано“ в карето mobile.bg).
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Откажи
          </button>
          <button type="button" onClick={start} disabled={!extensionReady || (tried && missing.length > 0)} className="btn-primary">
            Попълни в mobile.bg ({ordered.length} {ordered.length === 1 ? "снимка" : "снимки"})
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-xl border border-line p-4">
      <h3 className="mb-3 flex items-center gap-2 font-bold">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-paper">{n}</span>
        {title}
      </h3>
      {children}
    </section>
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

/** A select of mobile.bg's values; {@code extra} = the car's value when mobile.bg's list lacks it (shown, marked). */
function Select({
  label,
  value,
  onChange,
  options,
  extra,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  options: { value: string; text: string }[];
  extra?: string | null;
}) {
  const known = options.some((o) => o.value === value);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={`field py-2! ${value && !known ? "border-warn!" : ""}`}>
        <option value="">—</option>
        {value && !known && <option value={value}>{extra ?? value} (не е от списъка на mobile.bg)</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.text}
          </option>
        ))}
      </select>
    </label>
  );
}
