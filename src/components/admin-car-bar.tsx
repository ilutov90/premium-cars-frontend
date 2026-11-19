"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sourceLabels } from "@/lib/format";
import type { AdminCar } from "@/lib/types";

/** Set by the admin panel while an admin is logged in on this browser; only saves customers a request. */
export const ADMIN_HINT_KEY = "pc-admin";

export function setAdminHint(on: boolean) {
  try {
    if (on) localStorage.setItem(ADMIN_HINT_KEY, "1");
    else localStorage.removeItem(ADMIN_HINT_KEY);
  } catch {
    // storage blocked: the bar just does not show
  }
}

function hasAdminHint(): boolean {
  try {
    return localStorage.getItem(ADMIN_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * The car's source listing and its editor, for a logged-in admin only. The page's HTML never has the source link:
 * it comes from the admin API with the admin's session; customers (no session) get nothing and the bar renders
 * nothing, so the page's layout is unchanged for them.
 */
export function AdminCarBar({ carId }: { carId: number }) {
  const [car, setCar] = useState<AdminCar | null>(null);

  useEffect(() => {
    if (!hasAdminHint()) return;
    let cancelled = false;
    fetch(`/api/admin/cars/${carId}`, { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(async (res) => {
        if (res.status === 401) setAdminHint(false);
        if (!res.ok) return;
        const data = (await res.json()) as AdminCar;
        if (!cancelled) setCar(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [carId]);

  if (!car) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-dashed border-accent/60 bg-accent/5 px-3 py-2 text-xs">
      <span className="font-bold text-accent">Само за администратори</span>
      {car.sourceUrl ? (
        <a
          href={car.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 break-all font-semibold underline underline-offset-2"
        >
          Обявата в {sourceLabels[car.source]} ↗
        </a>
      ) : (
        <span className="text-muted">Без линк към източник ({sourceLabels[car.source]})</span>
      )}
      <Link href={`/admin/cars/${car.id}`} className="font-semibold underline underline-offset-2">
        Редактирай
      </Link>
    </div>
  );
}
