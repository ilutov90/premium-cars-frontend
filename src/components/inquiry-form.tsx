"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { PUBLIC_API_URL } from "@/lib/config";
import { heardFromLabels } from "@/lib/format";
import { trackEvent, visitAttribution } from "@/lib/marketing";
import { site, viberChatHref } from "@/lib/site";
import { ViberIcon } from "./icons";
import type { FilterOptions, HeardFrom, PostSettings } from "@/lib/types";

const heardFromOptions = Object.keys(heardFromLabels) as HeardFrom[];

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const thisYear = new Date().getFullYear();
const years = Array.from({ length: thisYear - 2009 }, (_, i) => thisYear - i);

/**
 * Inquiry about a specific car (carId) or a short "find me a car" request: make, model, year and a phone, plus a
 * button that opens a Viber chat with us. The make and model suggest the catalog's own, but any text goes.
 */
export function InquiryForm({ carId, carTitle }: { carId?: number; carTitle?: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [phone, setPhone] = useState(site.phone);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [make, setMake] = useState("");
  // two forms can be on one page (home page), so the ids must differ
  const id = useId();
  const general = carId == null;

  useEffect(() => {
    let cancelled = false;
    fetch(`${PUBLIC_API_URL}/api/public/contact`)
      .then((r) => (r.ok ? (r.json() as Promise<PostSettings>) : null))
      .then((c) => !cancelled && c?.phone && setPhone(c.phone))
      .catch(() => undefined);
    if (general) {
      fetch(`${PUBLIC_API_URL}/api/public/filters`)
        .then((r) => (r.ok ? (r.json() as Promise<FilterOptions>) : null))
        .then((o) => !cancelled && o && setOptions(o))
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [general]);

  const knownMake = options?.makes.find((m) => m.toLowerCase() === make.trim().toLowerCase());
  const models = knownMake ? (options?.models[knownMake] ?? []) : [];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState({ kind: "sending" });
    try {
      const res = await fetch(`${PUBLIC_API_URL}/api/public/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: carId ?? null,
          name: form.get("name") || null,
          phone: form.get("phone"),
          message: general ? wanted(form) : form.get("message"),
          website: form.get("website"), // honeypot
          privacyAccepted: form.get("privacy") === "on",
          heardFrom: form.get("heardFrom") || null,
          attribution: visitAttribution(),
        }),
      });
      if (res.status === 429) {
        throw new Error("Изпратихте няколко запитвания за кратко време. Опитайте отново след малко или ни се обадете.");
      }
      if (!res.ok) {
        const problem = await res.json().catch(() => null);
        throw new Error(problem?.detail ?? `Грешка ${res.status}`);
      }
      trackEvent("Lead", { content_name: carTitle ?? "Намери ми кола" });
      setState({ kind: "sent" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Неуспешно изпращане" });
    }
  }

  const viber = (
    <a
      href={viberChatHref(phone, carTitle ? `Здравейте, интересувам се от ${carTitle}.` : undefined)}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#7360f2] px-5 py-3 font-semibold text-white transition hover:bg-[#5e4bd8]"
    >
      <ViberIcon />
      Пишете ни във Viber
    </a>
  );

  if (state.kind === "sent") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-ok/30 bg-ok/5 p-5">
          <p className="font-bold text-ok">Благодарим! Запитването е изпратено.</p>
          <p className="mt-1 text-sm text-muted">Ще ви се обадим до 24 часа.</p>
        </div>
        {viber}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {general && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`${id}-make`}>
                Марка
              </label>
              <input
                id={`${id}-make`}
                name="make"
                list={`${id}-makes`}
                value={make}
                onChange={(e) => setMake(e.target.value)}
                maxLength={60}
                placeholder="напр. Kia"
                autoComplete="off"
                className="field"
              />
              <datalist id={`${id}-makes`}>
                {options?.makes.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div>
              <label className="label" htmlFor={`${id}-model`}>
                Модел
              </label>
              <input
                id={`${id}-model`}
                name="model"
                list={`${id}-models`}
                maxLength={60}
                placeholder="напр. Sportage"
                autoComplete="off"
                className="field"
              />
              <datalist id={`${id}-models`}>
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
          </div>
          <div>
            <label className="label" htmlFor={`${id}-year`}>
              Година
            </label>
            <select id={`${id}-year`} name="year" className="field" defaultValue="">
              <option value="">Без значение</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  от {y} г.
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${id}-phone`}>
            Телефон за контакт
          </label>
          <input
            id={`${id}-phone`}
            name="phone"
            type="tel"
            required
            minLength={6}
            maxLength={40}
            placeholder="08…"
            className="field"
            autoComplete="tel"
          />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-name`}>
            Име <span className="font-normal text-muted">(по желание)</span>
          </label>
          <input id={`${id}-name`} name="name" maxLength={100} className="field" autoComplete="name" />
        </div>
      </div>
      {!general && (
        <div>
          <label className="label" htmlFor={`${id}-message`}>
            Съобщение <span className="font-normal text-muted">(по желание)</span>
          </label>
          <textarea
            id={`${id}-message`}
            name="message"
            rows={3}
            maxLength={4000}
            className="field resize-y"
            defaultValue={`Здравейте, интересувам се от ${carTitle}.`}
          />
        </div>
      )}
      <div>
        <label className="label" htmlFor={`${id}-heard`}>
          Откъде научихте за нас?
        </label>
        <select id={`${id}-heard`} name="heardFrom" className="field" defaultValue="">
          <option value="">Изберете (по желание)</option>
          {heardFromOptions.map((h) => (
            <option key={h} value={h}>
              {heardFromLabels[h]}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-muted">
        <input name="privacy" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-accent" />
        <span>
          Запознах се с{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-ink underline underline-offset-2">
            Политиката за поверителност
          </Link>{" "}
          и съм съгласен данните ми да се използват, за да ми отговорите.
        </span>
      </label>
      {/* Honeypot: hidden from people, bots fill it in */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state.kind === "error" && <p className="text-sm font-medium text-accent-dark">{state.message}</p>}
      <button type="submit" className="btn-accent w-full" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Изпращане…" : general ? "Намерете ми кола" : "Изпрати запитване"}
      </button>
      <p className="text-center text-xs text-muted">или</p>
      {viber}
    </form>
  );
}

/** "Търся: Kia Sportage, от 2021 г." from the short form's choices. */
function wanted(form: FormData): string {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const car = [text("make"), text("model")].filter(Boolean).join(" ");
  const parts = [car, text("year") && `от ${text("year")} г.`].filter(Boolean);
  return parts.length ? `Търся: ${parts.join(", ")}` : "Търся кола (без избрани марка, модел и година).";
}
