"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { PUBLIC_API_URL } from "@/lib/config";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

/** Inquiry about a specific car (carId) or a general "find me a car" request. */
export function InquiryForm({ carId, carTitle }: { carId?: number; carTitle?: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  // two forms can be on one page (home page), so the ids must differ
  const id = useId();

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
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email") || null,
          message: form.get("message"),
          website: form.get("website"), // honeypot
          privacyAccepted: form.get("privacy") === "on",
        }),
      });
      if (res.status === 429) {
        throw new Error("Изпратихте няколко запитвания за кратко време. Опитайте отново след малко или ни се обадете.");
      }
      if (!res.ok) {
        const problem = await res.json().catch(() => null);
        throw new Error(problem?.detail ?? `Грешка ${res.status}`);
      }
      setState({ kind: "sent" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Неуспешно изпращане" });
    }
  }

  if (state.kind === "sent") {
    return (
      <div className="rounded-2xl border border-ok/30 bg-ok/5 p-5">
        <p className="font-bold text-ok">Благодарим! Запитването е изпратено.</p>
        <p className="mt-1 text-sm text-muted">Ще се свържем с вас до 24 часа.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label" htmlFor={`${id}-name`}>
          Име
        </label>
        <input id={`${id}-name`} name="name" required maxLength={100} className="field" autoComplete="name" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${id}-phone`}>
            Телефон
          </label>
          <input id={`${id}-phone`} name="phone" type="tel" maxLength={40} className="field" autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor={`${id}-email`}>
            Имейл
          </label>
          <input id={`${id}-email`} name="email" type="email" maxLength={200} className="field" autoComplete="email" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`${id}-message`}>
          Съобщение
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={4}
          maxLength={4000}
          className="field resize-y"
          defaultValue={carTitle ? `Здравейте, интересувам се от ${carTitle}.` : ""}
          placeholder={carTitle ? undefined : "Марка, модел, година, бюджет…"}
        />
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
        {state.kind === "sending" ? "Изпращане…" : "Изпрати запитване"}
      </button>
      <p className="text-xs text-muted">Попълнете телефон или имейл, за да можем да ви отговорим.</p>
    </form>
  );
}
