"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminApiError, useAdmin } from "./admin-context";
import { OrderCandidates } from "./order-candidates";
import { OrderContacts } from "./order-contacts";
import { OrderDocuments } from "./order-documents";
import { OrderStatusChip } from "./order-status-chip";
import { StatusBadge } from "./status-badge";
import { CarImage } from "@/components/car-image";
import { formatDate, formatEur, formatKm, heardFromLabels, lostReasonLabels, orderStatusLabels, sourceLabels } from "@/lib/format";
import { phoneHref, viberChatHref } from "@/lib/site";
import { fromSofiaInput, toSofiaInput } from "@/lib/sofia-time";
import type { AdminOrder, LostReason, OrderCarLookup, OrderCustomer, OrderRequest, OrderStatus } from "@/lib/types";

interface Form {
  customer: Record<keyof OrderCustomer, string>;
  vin: string;
  agreedPriceEur: string;
  depositEur: string;
  status: OrderStatus;
  containerNumber: string;
  contractDate: string;
  notes: string;
  /** Sofia wall time "YYYY-MM-DDTHH:mm" or "" */
  nextContactAt: string;
  lostReason: LostReason | "";
}

const emptyForm: Form = {
  customer: { name: "", phone: "", email: "", address: "", idNumber: "", companyName: "", companyEik: "" },
  vin: "",
  agreedPriceEur: "",
  depositEur: "",
  status: "CONTRACT_SIGNED",
  containerNumber: "",
  contractDate: "",
  notes: "",
  nextContactAt: "",
  lostReason: "",
};

const customerFields: [keyof OrderCustomer, string][] = [
  ["name", "Имена"],
  ["phone", "Телефон"],
  ["email", "Имейл"],
  ["address", "Адрес"],
  ["idNumber", "ЕГН/ЛНЧ"],
  ["companyName", "Фирма"],
  ["companyEik", "ЕИК"],
];

function toForm(o: AdminOrder): Form {
  const customer = { ...emptyForm.customer };
  for (const [k] of customerFields) customer[k] = o.customer[k] ?? "";
  return {
    customer,
    vin: o.vin ?? "",
    agreedPriceEur: o.agreedPriceEur == null ? "" : String(o.agreedPriceEur),
    depositEur: o.depositEur == null ? "" : String(o.depositEur),
    status: o.status,
    containerNumber: o.containerNumber ?? "",
    contractDate: o.contractDate ?? "",
    notes: o.notes ?? "",
    nextContactAt: o.nextContactAt ? toSofiaInput(new Date(o.nextContactAt)) : "",
    lostReason: o.lostReason ?? "",
  };
}

const text = (v: string) => (v.trim() === "" ? null : v.trim());
const amount = (v: string) => (v.trim() === "" || Number.isNaN(Number(v.replace(",", "."))) ? null : Number(v.replace(",", ".")));

function toRequest(f: Form, carId: number | null): OrderRequest {
  const c = f.customer;
  return {
    carId,
    customer: {
      name: text(c.name),
      phone: text(c.phone),
      email: text(c.email),
      address: text(c.address),
      idNumber: text(c.idNumber),
      companyName: text(c.companyName),
      companyEik: text(c.companyEik),
    },
    vin: text(f.vin),
    agreedPriceEur: amount(f.agreedPriceEur),
    depositEur: amount(f.depositEur),
    status: f.status,
    containerNumber: text(f.containerNumber),
    contractDate: f.contractDate || null,
    notes: text(f.notes),
    nextContactAt: fromSofiaInput(f.nextContactAt)?.toISOString() ?? null,
    lostReason: f.status === "CANCELLED" && f.lostReason ? f.lostReason : null,
  };
}

/** Create / edit an order: the car, the customer, the deal, and (once saved) the documents. */
export function OrderEditor({ orderId, initialCarId }: { orderId: number | null; initialCarId: number | null }) {
  const { adminFetch } = useAdmin();
  const router = useRouter();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({ ...emptyForm, status: initialCarId != null ? "CONTRACT_SIGNED" : "LEAD" });
  const [lookup, setLookup] = useState<OrderCarLookup | null>(null);
  const [carQuery, setCarQuery] = useState(initialCarId != null ? String(initialCarId) : "");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (orderId == null) return;
    adminFetch<AdminOrder>(`/api/admin/orders/${orderId}`)
      .then((o) => {
        setOrder(o);
        setForm(toForm(o));
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [adminFetch, orderId]);

  async function findCar(q: string) {
    setLookupError(null);
    setLookup(null);
    if (!q.trim()) return;
    try {
      setLookup(await adminFetch<OrderCarLookup>(`/api/admin/orders/car-lookup?q=${encodeURIComponent(q.trim())}`));
    } catch (e) {
      setLookupError(e instanceof AdminApiError && e.status === 404 ? "Не намерих такава кола." : (e as Error).message);
    }
  }

  useEffect(() => {
    if (orderId != null || initialCarId == null) return;
    adminFetch<OrderCarLookup>(`/api/admin/orders/car-lookup?q=${initialCarId}`)
      .then(setLookup)
      .catch((e: Error) => setLookupError(e instanceof AdminApiError && e.status === 404 ? "Не намерих такава кола." : e.message));
  }, [adminFetch, orderId, initialCarId]);

  function setField<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const creating = orderId == null;
    if (creating && !lookup && form.status !== "LEAD") {
      setMessage({ ok: false, text: "Изберете кола: въведете „Обява №“ или линк." });
      return;
    }
    setBusy(true);
    try {
      const body = toRequest(form, creating ? (lookup?.id ?? null) : order?.carId ?? null);
      if (creating) {
        const saved = await adminFetch<AdminOrder>("/api/admin/orders", { method: "POST", body: JSON.stringify(body) });
        router.replace(`/admin/orders/${saved.id}`);
      } else {
        const saved = await adminFetch<AdminOrder>(`/api/admin/orders/${orderId}`, { method: "PUT", body: JSON.stringify(body) });
        setOrder(saved);
        setForm(toForm(saved));
        setMessage({ ok: true, text: "Запазено." });
      }
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function onCandidates(saved: AdminOrder, chosen: boolean) {
    if (chosen) {
      setOrder(saved);
      setForm((f) => ({
        ...f,
        status: saved.status,
        agreedPriceEur: f.agreedPriceEur === "" && saved.agreedPriceEur != null ? String(saved.agreedPriceEur) : f.agreedPriceEur,
        contractDate: f.contractDate === "" && saved.contractDate ? saved.contractDate : f.contractDate,
      }));
    } else {
      setOrder((o) => (o ? { ...o, candidates: saved.candidates } : saved));
    }
  }

  function onContacts(saved: AdminOrder) {
    setOrder((o) => (o ? { ...o, contacts: saved.contacts } : saved));
  }

  async function remove() {
    if (!order) return;
    if (!window.confirm(`Да изтрия ли поръчка № ${order.id} (${order.car.title ?? "потенциална"}) и всички нейни документи? Колата остава.`)) return;
    setBusy(true);
    try {
      await adminFetch<void>(`/api/admin/orders/${order.id}`, { method: "DELETE" });
      router.replace("/admin/orders");
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
      setBusy(false);
    }
  }

  if (orderId != null && !order) {
    return loadError ? (
      <p className="text-sm font-medium text-accent-dark">{loadError}</p>
    ) : (
      <p className="text-sm text-muted">Зареждане…</p>
    );
  }

  const snap = order?.car;
  const hasCar = order != null && (order.carId != null || order.car.title != null);
  const isLead = form.status === "LEAD";
  const phone = form.customer.phone.trim();
  const carLink = order?.carId != null && order.carStatus && (order.carStatus === "PUBLISHED" || order.carStatus === "RESERVED") && snap?.slug ? `/cars/${snap.slug}` : null;

  return (
    <div className="pb-10">
      <Link href="/admin/orders" className="text-sm font-semibold text-muted hover:text-ink">
        ← Всички поръчки
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{order ? `Поръчка № ${order.id}` : "Нова поръчка"}</h1>
        {order && <OrderStatusChip status={order.status} />}
      </div>

      {order?.inquiry && (
        <section className="mb-6 rounded-2xl border border-line bg-card p-5 text-sm">
          <h2 className="mb-2 text-sm font-bold">Запитване № {order.inquiry.id}</h2>
          <p className="text-xs text-muted">{formatDate(order.inquiry.createdAt)}</p>
          {order.inquiry.message && <p className="mt-2 whitespace-pre-line">{order.inquiry.message}</p>}
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {order.inquiry.carId != null && (
              <Link href={`/admin/cars/${order.inquiry.carId}`} className="font-semibold text-accent hover:underline">
                {order.inquiry.carTitle ?? `Обява № ${order.inquiry.carId}`}
              </Link>
            )}
            {order.inquiry.heardFrom && <span>Откъде: {heardFromLabels[order.inquiry.heardFrom]}</span>}
            {(order.inquiry.attribution?.utmSource || order.inquiry.attribution?.utmCampaign) && (
              <span>
                линк: {[order.inquiry.attribution.utmSource, order.inquiry.attribution.utmCampaign].filter(Boolean).join(" / ")}
              </span>
            )}
          </p>
        </section>
      )}

      <form onSubmit={save} className="space-y-6">
        <fieldset className="rounded-2xl border border-line bg-card p-5">
          <legend className="px-1 text-sm font-bold">Кола</legend>
          {order && !hasCar ? (
            <p className="text-sm text-muted">
              {isLead
                ? "Потенциална поръчка: още няма избрана кола. Клиентът избира от предложените по-долу."
                : "Поръчката няма кола. Върнете статуса на „Потенциална“ и изберете от предложените."}
            </p>
          ) : order && snap ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-start gap-4">
                <CarImage src={order.coverUrl} alt={snap.title ?? "Кола"} className="h-24 w-36 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="text-base font-bold">{snap.title ?? "Кола"}</p>
                  <p className="mt-1 text-muted">
                    {[snap.year, snap.mileageKm != null ? formatKm(snap.mileageKm) : null, snap.source ? sourceLabels[snap.source] : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-1">Цена в сайта тогава: {formatEur(snap.priceEur)}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                    {order.carStatus && <StatusBadge status={order.carStatus} />}
                    {order.carId != null ? (
                      <>
                        <Link href={`/admin/cars/${order.carId}`} className="underline underline-offset-2">
                          Редактор на колата
                        </Link>
                        {carLink && (
                          <Link href={carLink} target="_blank" className="underline underline-offset-2">
                            виж в сайта ↗
                          </Link>
                        )}
                      </>
                    ) : (
                      <span className="text-muted">колата е изтрита от каталога</span>
                    )}
                    {snap.sourceUrl && (
                      <a href={snap.sourceUrl} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2">
                        обява при източника ↗
                      </a>
                    )}
                  </p>
                </div>
              </div>
              {order.carPhotos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {order.carPhotos.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="shrink-0">
                      <CarImage src={u} alt="Снимка на колата" className="h-16 w-24 rounded-md object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <input
                  value={carQuery}
                  onChange={(e) => setCarQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void findCar(carQuery);
                    }
                  }}
                  placeholder="Обява № или линк към колата в сайта"
                  aria-label="Кола"
                  className="field min-w-64 flex-1"
                />
                <button type="button" className="btn-ghost" onClick={() => void findCar(carQuery)}>
                  Намери
                </button>
              </div>
              {lookupError && <p className="text-sm font-medium text-accent-dark">{lookupError}</p>}
              {lookup && (
                <div className="flex items-center gap-4 rounded-xl bg-ink/5 p-3">
                  <CarImage src={lookup.coverUrl} alt={lookup.title} className="h-16 w-24 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 text-sm">
                    <p className="font-bold">
                      {lookup.title} <span className="font-normal text-muted">№ {lookup.id}</span>
                    </p>
                    <p className="mt-1 flex items-center gap-2">
                      <StatusBadge status={lookup.status} />
                      <span>{formatEur(lookup.priceEur)}</span>
                    </p>
                  </div>
                </div>
              )}
              {lookup?.activeOrderId != null && (
                <p className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
                  Тази кола вече има активна поръчка:{" "}
                  <Link href={`/admin/orders/${lookup.activeOrderId}`} className="font-semibold underline">
                    № {lookup.activeOrderId}
                  </Link>
                  . Нова поръчка не може да се създаде.
                </p>
              )}
              <p className="text-xs text-muted">
                {isLead
                  ? "Потенциална поръчка: колата не е задължителна; ако е избрана, става първата предложена и остава в сайта."
                  : "При запис колата се маркира като „Продадена“ и се скрива от сайта."}
              </p>
            </div>
          )}
        </fieldset>

        {order && (isLead || order.candidates.length > 0) && (
          <OrderCandidates orderId={order.id} candidates={order.candidates} editable={order.status === "LEAD"} onOrder={onCandidates} />
        )}

        <fieldset className="rounded-2xl border border-line bg-card p-5">
          <legend className="px-1 text-sm font-bold">Клиент</legend>
          {order && phone && (
            <p className="mb-3 flex flex-wrap gap-2">
              <a href={phoneHref(phone)} className="btn-ghost px-3! py-1.5! text-sm">
                Обади се
              </a>
              <a href={viberChatHref(phone)} className="btn-ghost px-3! py-1.5! text-sm">
                Viber
              </a>
            </p>
          )}
          {order && (order.otherOrderIds.length > 0 || order.otherInquiryIds.length > 0) && (
            <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold">Познат клиент:</span>
              {order.otherOrderIds.map((id) => (
                <Link key={`o${id}`} href={`/admin/orders/${id}`} className="font-semibold text-accent hover:underline">
                  Поръчка #{id}
                </Link>
              ))}
              {order.otherInquiryIds.map((id) => (
                <span key={`i${id}`} className="text-muted">
                  Запитване #{id}
                </span>
              ))}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {customerFields.map(([key, label]) => (
              <div key={key} className={key === "address" ? "sm:col-span-2" : ""}>
                <label className="label" htmlFor={`o-${key}`}>
                  {label}
                </label>
                <input
                  id={`o-${key}`}
                  value={form.customer[key]}
                  onChange={(e) => setForm((f) => ({ ...f, customer: { ...f.customer, [key]: e.target.value } }))}
                  className="field"
                  type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-line bg-card p-5">
          <legend className="px-1 text-sm font-bold">Поръчка</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="o-vin">
                VIN
              </label>
              <input id="o-vin" value={form.vin} onChange={(e) => setField("vin", e.target.value)} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="o-status">
                Статус
              </label>
              <select id="o-status" value={form.status} onChange={(e) => setField("status", e.target.value as OrderStatus)} className="field">
                {Object.entries(orderStatusLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="o-price">
                Договорена цена €
              </label>
              <input id="o-price" inputMode="decimal" value={form.agreedPriceEur} onChange={(e) => setField("agreedPriceEur", e.target.value)} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="o-deposit">
                Капаро €
              </label>
              <input id="o-deposit" inputMode="decimal" value={form.depositEur} onChange={(e) => setField("depositEur", e.target.value)} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="o-container">
                № на контейнер
              </label>
              <input id="o-container" value={form.containerNumber} onChange={(e) => setField("containerNumber", e.target.value)} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="o-date">
                Дата на договора
              </label>
              <input id="o-date" type="date" value={form.contractDate} onChange={(e) => setField("contractDate", e.target.value)} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="o-next">
                Следващ контакт (българско време)
              </label>
              <span className="flex gap-2">
                <input id="o-next" type="datetime-local" value={form.nextContactAt} onChange={(e) => setField("nextContactAt", e.target.value)} className="field" />
                <button type="button" className="btn-ghost" onClick={() => setField("nextContactAt", "")}>
                  Изчисти
                </button>
              </span>
            </div>
            {form.status === "CANCELLED" && (
              <div>
                <label className="label" htmlFor="o-lost">
                  Причина за отказ
                </label>
                <select id="o-lost" value={form.lostReason} onChange={(e) => setField("lostReason", e.target.value as LostReason | "")} className="field">
                  <option value="">Без причина</option>
                  {Object.entries(lostReasonLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="o-notes">
                Бележки
              </label>
              <textarea id="o-notes" rows={4} value={form.notes} onChange={(e) => setField("notes", e.target.value)} className="field" />
            </div>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy || (orderId == null && lookup?.activeOrderId != null)}>
            {busy ? "Запис…" : orderId == null ? "Създай поръчка" : "Запази"}
          </button>
          {order && (
            <button type="button" onClick={remove} disabled={busy} className="btn-ghost text-accent-dark">
              Изтрий поръчката
            </button>
          )}
          {message && <span className={`text-sm font-medium ${message.ok ? "text-ok" : "text-accent-dark"}`}>{message.text}</span>}
          {order && (
            <span className="ml-auto text-xs text-muted">
              Създадена {formatDate(order.createdAt)}
              {order.createdBy ? ` от ${order.createdBy}` : ""}
            </span>
          )}
        </div>
      </form>

      {order && <OrderContacts orderId={order.id} contacts={order.contacts} onOrder={onContacts} />}

      {order ? (
        <OrderDocuments orderId={order.id} documents={order.documents} onChange={(documents) => setOrder({ ...order, documents })} />
      ) : (
        <p className="mt-6 text-sm text-muted">Документите се качват след като поръчката е създадена.</p>
      )}
    </div>
  );
}
