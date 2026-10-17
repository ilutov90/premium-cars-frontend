"use client";

import { useState } from "react";
import { socialPostText } from "@/lib/description";
import type { AdminCar, Origin } from "@/lib/types";

const originOf = (car: AdminCar): Origin | null =>
  car.source === "AUTOHOME" ? "CN" : car.source === "AUTOWINI" ? "KR" : null;

/** The Facebook/Instagram post for this car, in the posting script's format, ready to copy. */
export function SocialPostPanel({ car }: { car: AdminCar }) {
  const [copied, setCopied] = useState(false);
  const listingId = car.sourceRef ? (car.source === "AUTOHOME" ? `AH${car.sourceRef}` : car.sourceRef) : null;
  const text = socialPostText(car.specs, originOf(car), car.price?.totalEur ?? null, listingId);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold">Текст за Facebook / Instagram</h2>
        <button type="button" onClick={copy} className="btn-ghost px-3! py-1.5! text-xs!">
          {copied ? "Копирано ✓" : "Копирай"}
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        rows={12}
        className="field font-mono text-xs! leading-relaxed"
        aria-label="Текст за публикация"
      />
      <p className="mt-2 text-xs text-muted">Обновява се след „Запиши“. Цената е крайната цена от сайта.</p>
    </section>
  );
}
