"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { CarImage } from "@/components/car-image";
import { formatDay } from "@/lib/format";
import type { AdminCarSummary, AdminDeliveredCar, DeliveredCarRequest, PageResponse } from "@/lib/types";

const empty: DeliveredCarRequest = {
  carId: null,
  carTitle: "",
  customerName: "",
  city: "",
  quote: "",
  deliveredOn: null,
  consent: false,
  published: false,
};

const toForm = (d: AdminDeliveredCar): DeliveredCarRequest => ({
  carId: d.carId,
  carTitle: d.carTitle,
  customerName: d.customerName,
  city: d.city ?? "",
  quote: d.quote ?? "",
  deliveredOn: d.deliveredOn,
  consent: d.consent,
  published: d.published,
});

/** Shrinks a phone photo to at most 1600 px (JPEG) before the upload: smaller, faster, no EXIF location. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Снимката не може да се обработи"))), "image/jpeg", 0.85),
  );
}

/** "Доставени коли": handed-over cars with the customer's words and a photo, shown on the site once published. */
export default function AdminDeliveredPage() {
  const { adminFetch } = useAdmin();
  const [items, setItems] = useState<AdminDeliveredCar[] | null>(null);
  const [cars, setCars] = useState<AdminCarSummary[]>([]);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<AdminDeliveredCar[]>("/api/admin/delivered-cars")
      .then(setItems)
      .catch((e: Error) => setError(e.message));
    adminFetch<PageResponse<AdminCarSummary>>("/api/admin/cars?size=48")
      .then((p) => setCars(p.items))
      .catch(() => setCars([]));
  }, [adminFetch]);

  function replace(saved: AdminDeliveredCar) {
    setItems((list) => {
      const rest = (list ?? []).filter((d) => d.id !== saved.id);
      return [saved, ...rest].sort(
        (a, b) => (b.deliveredOn ?? "").localeCompare(a.deliveredOn ?? "") || b.id - a.id,
      );
    });
  }

  async function remove(d: AdminDeliveredCar) {
    if (!window.confirm(`Да изтрия „${d.carTitle} — ${d.customerName}“? Снимката също се изтрива.`)) return;
    try {
      await adminFetch<void>(`/api/admin/delivered-cars/${d.id}`, { method: "DELETE" });
      setItems((list) => (list ?? []).filter((x) => x.id !== d.id));
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Доставени коли</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Коли, предадени на клиенти, със снимка и думите на клиента. Публикуваните се виждат на сайта (
            <Link href="/delivered" target="_blank" className="font-semibold text-accent hover:underline">
              /delivered
            </Link>{" "}
            и на началната страница). Публикувайте само с изричното съгласие на клиента (стига писмено съобщение във
            Viber, запазете го) и само истински отзиви.
          </p>
        </div>
        {editing !== "new" && (
          <button type="button" className="btn-primary px-4! py-2! text-sm!" onClick={() => setEditing("new")}>
            + Добави
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-accent-dark">{error}</p>}

      {editing === "new" && (
        <Editor
          cars={cars}
          onSaved={(d) => {
            replace(d);
            setEditing(d.id);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {items?.length === 0 && editing !== "new" && (
        <p className="text-sm text-muted">Още няма добавени. След първото предаване на кола натиснете „+ Добави“.</p>
      )}

      <ul className="mt-4 space-y-3">
        {items?.map((d) =>
          editing === d.id ? (
            <li key={d.id}>
              <Editor
                cars={cars}
                existing={d}
                onSaved={replace}
                onCancel={() => setEditing(null)}
                onDelete={() => remove(d)}
              />
            </li>
          ) : (
            <li key={d.id} className="flex gap-4 rounded-2xl border border-line bg-card p-4">
              <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-paper">
                {d.photoUrl && <CarImage src={d.photoUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {d.carTitle} <span className="font-normal text-muted">— {d.customerName}{d.city ? `, ${d.city}` : ""}</span>
                </p>
                <p className="text-xs text-muted">
                  {d.deliveredOn ? `Предадена ${formatDay(d.deliveredOn)} · ` : ""}
                  {d.published ? <span className="font-semibold text-ok">На сайта</span> : "Скрита"}
                  {!d.consent && " · няма съгласие"}
                </p>
                {d.quote && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">„{d.quote}“</p>}
              </div>
              <button type="button" className="btn-ghost self-start px-4! py-1.5! text-sm!" onClick={() => setEditing(d.id)}>
                Промени
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function Editor({
  cars,
  existing,
  onSaved,
  onCancel,
  onDelete,
}: {
  cars: AdminCarSummary[];
  existing?: AdminDeliveredCar;
  onSaved: (d: AdminDeliveredCar) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { adminFetch } = useAdmin();
  const [form, setForm] = useState<DeliveredCarRequest>(existing ? toForm(existing) : empty);
  const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof DeliveredCarRequest>(key: K, value: DeliveredCarRequest[K]) =>
    setForm((f) => ({ ...f, [key]: value, ...(key === "consent" && !value ? { published: false } : {}) }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const saved = await adminFetch<AdminDeliveredCar>(
        existing ? `/api/admin/delivered-cars/${existing.id}` : "/api/admin/delivered-cars",
        { method: existing ? "PUT" : "POST", body: JSON.stringify(form) },
      );
      onSaved(saved);
      setForm(toForm(saved));
      setMessage({ ok: true, text: existing ? "Записано ✓" : "Добавено ✓ Сега може да качите снимка." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Грешка" });
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    if (!existing) return;
    setBusy(true);
    setMessage(null);
    try {
      const body = await shrink(file);
      const saved = await adminFetch<AdminDeliveredCar>(`/api/admin/delivered-cars/${existing.id}/photo`, {
        method: "PUT",
        body,
        headers: { "Content-Type": "image/jpeg" },
      });
      setPhotoUrl(saved.photoUrl);
      onSaved(saved);
      setMessage({ ok: true, text: "Снимката е качена ✓" });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Грешка" });
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!existing) return;
    setBusy(true);
    try {
      const saved = await adminFetch<AdminDeliveredCar>(`/api/admin/delivered-cars/${existing.id}/photo`, {
        method: "DELETE",
      });
      setPhotoUrl(null);
      onSaved(saved);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Грешка" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-2xl border border-ink/20 bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="dc-car">
            Кола от каталога (по желание)
          </label>
          <select
            id="dc-car"
            className="field"
            value={form.carId ?? ""}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              const car = cars.find((c) => c.id === id);
              setForm((f) => ({ ...f, carId: id, carTitle: car && !f.carTitle ? car.title : f.carTitle }));
            }}
          >
            <option value="">— не е свързана —</option>
            {form.carId != null && !cars.some((c) => c.id === form.carId) && (
              <option value={form.carId}>#{form.carId}</option>
            )}
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.id} {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="dc-title">
            Кола (както да се вижда)
          </label>
          <input
            id="dc-title"
            className="field"
            maxLength={200}
            value={form.carTitle}
            onChange={(e) => set("carTitle", e.target.value)}
            placeholder="Kia K5 2.0 LPI 2022"
            required={form.carId == null}
          />
        </div>
        <div>
          <label className="label" htmlFor="dc-name">
            Клиент (име, както да се вижда)
          </label>
          <input
            id="dc-name"
            className="field"
            maxLength={100}
            required
            value={form.customerName}
            onChange={(e) => set("customerName", e.target.value)}
            placeholder="Георги"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="dc-city">
              Град
            </label>
            <input id="dc-city" className="field" maxLength={100} value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="dc-date">
              Предадена на
            </label>
            <input
              id="dc-date"
              type="date"
              className="field"
              value={form.deliveredOn ?? ""}
              onChange={(e) => set("deliveredOn", e.target.value || null)}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="dc-quote">
            Думите на клиента
          </label>
          <textarea
            id="dc-quote"
            className="field resize-y"
            rows={3}
            maxLength={2000}
            value={form.quote}
            onChange={(e) => set("quote", e.target.value)}
            placeholder="Както ги е казал/написал клиентът, без измислени части."
          />
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-accent"
            checked={form.consent}
            onChange={(e) => set("consent", e.target.checked)}
          />
          <span>Клиентът се е съгласил името, снимката и думите му да се покажат на сайта</span>
        </label>
        <label className={`flex items-start gap-2.5 ${form.consent ? "" : "opacity-50"}`}>
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-accent"
            checked={form.published}
            disabled={!form.consent}
            onChange={(e) => set("published", e.target.checked)}
          />
          <span>Покажи на сайта</span>
        </label>
      </div>

      {existing && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="h-24 w-36 overflow-hidden rounded-xl bg-paper">
            {photoUrl && <CarImage src={photoUrl} alt="" className="h-full w-full object-cover" />}
          </div>
          <label className="btn-ghost cursor-pointer px-4! py-2! text-sm!">
            {photoUrl ? "Смени снимката" : "Качи снимка"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f);
              }}
            />
          </label>
          {photoUrl && (
            <button type="button" className="text-sm font-semibold text-muted hover:text-ink" disabled={busy} onClick={removePhoto}>
              Махни снимката
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" className="btn-primary px-4! py-2! text-sm!" disabled={busy}>
          {busy ? "Записване…" : existing ? "Запиши" : "Добави"}
        </button>
        <button type="button" className="btn-ghost px-4! py-2! text-sm!" disabled={busy} onClick={onCancel}>
          Затвори
        </button>
        {onDelete && (
          <button type="button" className="ml-auto text-sm font-semibold text-accent-dark hover:underline" onClick={onDelete}>
            Изтрий
          </button>
        )}
        {message && (
          <span className={`w-full text-sm font-semibold ${message.ok ? "text-ok" : "text-warn"}`}>{message.text}</span>
        )}
      </div>
    </form>
  );
}
