"use client";

import { useEffect, useRef, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { formatDate } from "@/lib/format";
import {
  defaultTemplates,
  effectiveSettings,
  placeholders,
  renderTemplate,
  templateKinds,
  templateLabels,
  templateValues,
  unknownPlaceholders,
  type TemplateKind,
} from "@/lib/post-template";
import { site } from "@/lib/site";
import type { AdminCar, AdminCarSummary, PageResponse, PostSettings, PostTemplate } from "@/lib/types";

/** The post text templates (Facebook and Instagram share one, Viber has its own), filled in from a car when publishing. */
export default function AdminTemplatesPage() {
  const { adminFetch } = useAdmin();
  const [saved, setSaved] = useState<Partial<Record<TemplateKind, PostTemplate>>>({});
  const [drafts, setDrafts] = useState<Record<TemplateKind, string>>(defaultTemplates);
  const [network, setNetwork] = useState<TemplateKind>("FACEBOOK");
  const [cars, setCars] = useState<AdminCarSummary[]>([]);
  const [sampleId, setSampleId] = useState<number | null>(null);
  const [sample, setSample] = useState<AdminCar | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const [settings, setSettings] = useState<PostSettings | null>(null);

  useEffect(() => {
    adminFetch<PostTemplate[]>("/api/admin/post-templates")
      .then((list) => {
        const byKind: Partial<Record<TemplateKind, PostTemplate>> = {};
        for (const t of list) {
          if (t.network === "FACEBOOK" || t.network === "VIBER" || t.network === "MOBILE_BG") byKind[t.network] = t;
        }
        setSaved(byKind);
        setDrafts({
          FACEBOOK: byKind.FACEBOOK?.body ?? defaultTemplates.FACEBOOK,
          VIBER: byKind.VIBER?.body ?? defaultTemplates.VIBER,
          MOBILE_BG: byKind.MOBILE_BG?.body ?? defaultTemplates.MOBILE_BG,
        });
      })
      .catch((e: Error) => setMessage({ ok: false, text: e.message }));
    adminFetch<PostSettings>("/api/admin/post-settings").then(setSettings).catch(() => setSettings(null));
    adminFetch<PageResponse<AdminCarSummary>>("/api/admin/cars?size=30")
      .then((page) => {
        setCars(page.items);
        if (page.items.length) setSampleId(page.items[0].id);
      })
      .catch(() => setCars([]));
  }, [adminFetch]);

  useEffect(() => {
    if (sampleId == null) return;
    adminFetch<AdminCar>(`/api/admin/cars/${sampleId}`).then(setSample).catch(() => setSample(null));
  }, [adminFetch, sampleId]);

  const draft = drafts[network];
  const current = saved[network]?.body ?? defaultTemplates[network];
  const dirty = draft !== current;
  const isDefault = !saved[network];
  const unknown = unknownPlaceholders(draft);
  const origin = typeof window !== "undefined" ? window.location.origin : undefined;
  const preview = sample ? renderTemplate(draft, templateValues(sample, origin, settings, network)) : null;

  function setDraft(value: string) {
    setDrafts((d) => ({ ...d, [network]: value }));
  }

  /** Puts {{key}} at the cursor of the editor. */
  function insert(key: string) {
    const el = editor.current;
    const token = `{{${key}}}`;
    if (!el) return setDraft(draft + token);
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setDraft(draft.slice(0, start) + token + draft.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const t = await adminFetch<PostTemplate>(`/api/admin/post-templates/${network}`, {
        method: "PUT",
        body: JSON.stringify({ body: draft }),
      });
      setSaved((s) => ({ ...s, [network]: t }));
      setMessage({ ok: true, text: `Шаблонът за ${templateLabels[network]} е записан ✓` });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Грешка" });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!window.confirm(`Да върна шаблона за ${templateLabels[network]} по подразбиране?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await adminFetch<void>(`/api/admin/post-templates/${network}`, { method: "DELETE" });
      setSaved((s) => {
        const next = { ...s };
        delete next[network];
        return next;
      });
      setDraft(defaultTemplates[network]);
      setMessage({ ok: true, text: "Върнат е шаблонът по подразбиране ✓" });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Грешка" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-extrabold">Шаблони за публикации</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Facebook и Instagram ползват един общ шаблон, Viber — свой, а mobile.bg — свой за „Допълнителна информация“ (до 11 000 знака). Текстът се сглобява от шаблона при публикуване. Местата като <code>{"{{price}}"}</code> се
        заместват с данните на колата. Ред, в който някое място е празно за колата (например батерия при дизел или
        липсващ пробег), не се показва. Преди публикуване текстът винаги се вижда и може да се промени.
      </p>

      <SharedDetails saved={settings} onSaved={setSettings} />

      <LogoSettings />

      <div className="mt-6 flex flex-wrap gap-1.5">
        {templateKinds.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNetwork(n)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              network === n ? "bg-ink text-paper" : "bg-card ring-1 ring-line hover:ring-ink"
            }`}
          >
            {templateLabels[n]}
            {drafts[n] !== (saved[n]?.body ?? defaultTemplates[n]) && " •"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">{templateLabels[network]}</h2>
            <span className="text-xs text-muted">
              {isDefault ? "по подразбиране" : `променен ${formatDate(saved[network]!.updatedAt)}`}
              {dirty && " · незаписани промени"}
            </span>
          </div>
          <textarea
            ref={editor}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={22}
            className="field font-mono text-xs! leading-relaxed"
            aria-label={`Шаблон за ${templateLabels[network]}`}
          />
          {unknown.length > 0 && (
            <p className="mt-2 text-xs font-semibold text-warn">
              Непознати места: {unknown.map((k) => `{{${k}}}`).join(", ")} — ще останат като текст.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary px-4! py-2! text-sm!" disabled={busy || !dirty} onClick={save}>
              {busy ? "Записване…" : "Запиши"}
            </button>
            {dirty && (
              <button type="button" className="btn-ghost px-4! py-2! text-sm!" disabled={busy} onClick={() => setDraft(current)}>
                Откажи промените
              </button>
            )}
            {!isDefault && (
              <button type="button" className="btn-ghost ml-auto px-4! py-2! text-sm!" disabled={busy} onClick={reset}>
                По подразбиране
              </button>
            )}
          </div>
          {message && (
            <p className={`mt-3 text-sm font-semibold ${message.ok ? "text-ok" : "text-warn"}`}>{message.text}</p>
          )}

          <h3 className="mt-6 text-sm font-bold">Места за данни</h3>
          <p className="mt-1 text-xs text-muted">Клик — добавя мястото там, където е курсорът.</p>
          <ul className="mt-2 divide-y divide-line text-xs">
            {placeholders.map((p) => (
              <li key={p.key} className="flex items-start gap-3 py-1.5">
                <button
                  type="button"
                  onClick={() => insert(p.key)}
                  className="shrink-0 rounded-md bg-paper px-1.5 py-0.5 font-mono font-semibold ring-1 ring-line hover:ring-ink"
                >
                  {`{{${p.key}}}`}
                </button>
                <span className="min-w-0">
                  {p.description} <span className="text-muted">— напр. {p.example}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-card p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">Преглед</h2>
            {cars.length > 0 && (
              <select
                value={sampleId ?? ""}
                onChange={(e) => setSampleId(Number(e.target.value))}
                className="field w-auto! max-w-xs py-1.5! text-xs!"
                aria-label="Кола за прегледа"
              >
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} {c.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          {preview != null ? (
            <>
              <pre className="rounded-xl bg-paper p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{preview}</pre>
              <p className={`mt-1 text-xs ${network === "FACEBOOK" && preview.length > 2200 ? "font-semibold text-warn" : "text-muted"}`}>
                {preview.length} знака
                {network === "FACEBOOK" && " (Instagram приема до 2200 знака)"}
                {network === "MOBILE_BG" && " (mobile.bg приема до 11 000 знака; емоджитата се махат)"}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Няма коли за преглед.</p>
          )}
        </section>
      </div>
    </div>
  );
}

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX_BYTES = 10 * 1024 * 1024;

/** The site's logo: replaced from a file (raw request body), or reset to the built-in one. */
const LOGO_MAX_HEIGHT = 240; // the header shows it 40 px high: enough for any screen

/**
 * The logo no larger than the header needs, as PNG (keeps a transparent background); a file that is already small
 * goes as it is. The site must not load a photo-sized file on every page.
 */
async function shrinkLogo(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Файлът не се отваря като изображение.");
  }
  try {
    if (bitmap.height <= LOGO_MAX_HEIGHT && file.size <= 300 * 1024) return file;
    const scale = Math.min(1, LOGO_MAX_HEIGHT / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Браузърът не успя да смали изображението.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Браузърът не успя да смали изображението.");
    return blob;
  } finally {
    bitmap.close();
  }
}

function LogoSettings() {
  const { adminFetch } = useAdmin();
  const [url, setUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminFetch<{ url: string | null }>("/api/admin/logo")
      .then((r) => setUrl(r.url))
      .catch(() => setUrl(null));
  }, [adminFetch]);

  function choose(f: File | null) {
    setMessage(null);
    if (f && !LOGO_TYPES.includes(f.type)) {
      setFile(null);
      if (input.current) input.current.value = "";
      setMessage({ ok: false, text: "Файлът трябва да е PNG, JPG или WebP." });
      return;
    }
    if (f && f.size > LOGO_MAX_BYTES) {
      setFile(null);
      if (input.current) input.current.value = "";
      setMessage({ ok: false, text: "Файлът е над 10 MB." });
      return;
    }
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const image = await shrinkLogo(file);
      const r = await adminFetch<{ url: string | null }>("/api/admin/logo", {
        method: "PUT",
        body: image,
        headers: { "Content-Type": image.type },
      });
      setUrl(r.url);
      setFile(null);
      if (input.current) input.current.value = "";
      setMessage({ ok: true, text: "Логото е сменено ✓ (на сайта се вижда до минута)." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Грешка" });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!window.confirm("Да върна стандартното лого?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await adminFetch<{ url: string | null }>("/api/admin/logo", { method: "DELETE" });
      setUrl(r?.url ?? null);
      setMessage({ ok: true, text: "Върнато е стандартното лого ✓ (на сайта се вижда до минута)." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Грешка" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-line bg-card p-4">
      <h2 className="font-bold">Лого на сайта</h2>
      <div className="mt-3 flex min-h-16 items-center rounded-xl bg-paper px-4 py-2 ring-1 ring-line">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Текущо лого" className="max-h-12 w-auto" />
        ) : (
          <span className="text-sm text-muted">Използва се стандартното лого.</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Файл с лого"
          className="text-sm"
          disabled={busy}
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
        />
        <button type="button" className="btn-primary px-4! py-2! text-sm!" disabled={busy || !file} onClick={upload}>
          {busy ? "Качване…" : "Качи логото"}
        </button>
        {url && (
          <button type="button" className="btn-ghost px-4! py-2! text-sm!" disabled={busy} onClick={reset}>
            Върни стандартното лого
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        PNG, JPG или WebP до 10 MB (смалява се сам преди качването). Логото заменя целия знак и надписа „Premium Cars Import“ горе вляво; най-добре с
        прозрачен фон и височина поне 80 px.
      </p>
      {message && <p className={`mt-2 text-sm font-semibold ${message.ok ? "text-ok" : "text-warn"}`}>{message.text}</p>}
    </section>
  );
}

/** Phone, Viber channel link and office: the same for every car ({{phone}}, {{viber_link}}, {{office}}). */
function SharedDetails({ saved, onSaved }: { saved: PostSettings | null; onSaved: (s: PostSettings) => void }) {
  const { adminFetch } = useAdmin();
  const current = { ...effectiveSettings(saved), metaPixelId: saved?.metaPixelId ?? "" };
  const [form, setForm] = useState(current);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // show the saved values once they arrive
  const [loadedFrom, setLoadedFrom] = useState<PostSettings | null>(null);
  if (saved !== loadedFrom) {
    setLoadedFrom(saved);
    setForm({ ...effectiveSettings(saved), metaPixelId: saved?.metaPixelId ?? "" });
  }

  const dirty =
    form.phone !== current.phone ||
    form.viberLink !== current.viberLink ||
    form.office !== current.office ||
    form.metaPixelId.trim() !== current.metaPixelId;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      // a value equal to the built-in default is stored as "default", so changing site.ts still applies
      const body: PostSettings = {
        phone: form.phone.trim() === site.phone ? null : form.phone,
        viberLink: form.viberLink.trim() === site.viberLink ? null : form.viberLink,
        office: form.office.trim() === site.office ? null : form.office,
        metaPixelId: form.metaPixelId.trim() || null,
      };
      const next = await adminFetch<PostSettings>("/api/admin/post-settings", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      onSaved(next);
      setMessage({ ok: true, text: "Общите данни са записани ✓" });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Грешка" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-5 rounded-2xl border border-line bg-card p-4">
      <h2 className="font-bold">Общи данни</h2>
      <p className="mt-1 text-xs text-muted">
        Използват се в шаблоните като <code>{"{{phone}}"}</code>, <code>{"{{viber_link}}"}</code> и{" "}
        <code>{"{{office}}"}</code>. Празно поле = стойността по подразбиране.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_1fr]">
        <div>
          <label className="label" htmlFor="set-phone">
            Телефон
          </label>
          <input
            id="set-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={site.phone}
            maxLength={50}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="set-viber">
            Линк към Viber канала
          </label>
          <input
            id="set-viber"
            type="url"
            value={form.viberLink}
            onChange={(e) => setForm({ ...form, viberLink: e.target.value })}
            placeholder={site.viberLink}
            maxLength={300}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="set-office">
            Офис
          </label>
          <input
            id="set-office"
            value={form.office}
            onChange={(e) => setForm({ ...form, office: e.target.value })}
            placeholder={site.office}
            maxLength={100}
            className="field"
          />
        </div>
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <label className="label" htmlFor="set-pixel">
          Meta Pixel ID (за рекламите във Facebook и Instagram)
        </label>
        <input
          id="set-pixel"
          value={form.metaPixelId}
          onChange={(e) => setForm({ ...form, metaPixelId: e.target.value })}
          placeholder="напр. 123456789012345"
          inputMode="numeric"
          pattern="\s*\d{5,20}\s*"
          title="Само цифри — номерът на пиксела от Meta Events Manager"
          maxLength={25}
          className="field max-w-xs"
        />
        <p className="mt-1 text-xs text-muted">
          Номерът от Meta Events Manager → Data sources → вашият пиксел. Когато е попълнен, сайтът пита посетителите за
          бисквитки и зарежда пиксела само при „Приемам“; формата за запитване отчита „Lead“. Празно = без пиксел и
          без банер.
        </p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" className="btn-primary px-4! py-2! text-sm!" disabled={busy || !dirty}>
          {busy ? "Записване…" : "Запиши общите данни"}
        </button>
        {message && <span className={`text-sm font-semibold ${message.ok ? "text-ok" : "text-warn"}`}>{message.text}</span>}
      </div>
    </form>
  );
}
