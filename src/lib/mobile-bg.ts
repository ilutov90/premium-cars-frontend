"use client";

// The admin panel's mobile.bg module: mobile.bg's fixed lists (used until the extension has sent mobile.bg's own),
// the warnings in Bulgarian, and the messages to the browser extension (extension/mobile-bg, also for cars.bg:
// see cars-bg.ts), which types the form into the site in the admin's own browser.
import { useCallback, useEffect, useState } from "react";
import type { CarsBgCatalog, MobileBgCatalog, MobileBgDraft, MobileBgWarningCode } from "./types";

export const MOBILE_BG_MAX_PHOTOS = 17;
export const MOBILE_BG_TEXT_MAX = 11000;
export const EXTENSION_ZIP = "/downloads/premium-cars-mobile-bg.zip";

type Opt = { value: string; text: string };
const same = (list: string[]): Opt[] => list.map((v) => ({ value: v, text: v }));

/** mobile.bg's selects as seen in its form (field names f8, f25 …); the catalog's own lists win when present. */
const fallback: Record<string, Opt[]> = {
  f8: same(["Бензинов", "Дизелов", "Електрически", "Хибриден", "Plug-in хибрид", "Газ", "Водород"]),
  f25: [
    { value: "0", text: "Употребяван" },
    { value: "1", text: "Нов" },
    { value: "3", text: "Повреден/ударен" },
    { value: "2", text: "За части" },
  ],
  f29: [1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), text: `Евро ${n}` })),
  f10: same(["Ръчна", "Автоматична", "Полуавтоматична"]),
  f11: same(["Ван", "Джип", "Кабрио", "Комби", "Купе", "Миниван", "Пикап", "Седан", "Стреч лимузина", "Хечбек"]),
  f31: [
    { value: "1", text: "Частно лице / освободена от ДДС" },
    { value: "2", text: "Цената е с включен ДДС" },
    { value: "3", text: "Цената е без ДДС" },
  ],
  f13: same(["EUR", "USD"]),
  f14: same(["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"]),
};

/** The options of a mobile.bg select: mobile.bg's own (from the extension) or the fixed list above. */
export function mobileBgOptions(catalog: MobileBgCatalog | null, field: string): Opt[] {
  const own = catalog?.selects?.[field];
  return own && own.length ? own : (fallback[field] ?? []);
}

export const warningText = (code: MobileBgWarningCode, value: string | null): string => {
  switch (code) {
    case "CATALOG_MISSING":
      return "Списъците на mobile.bg (марки, модели, цветове) още не са заредени: марката и моделът са както при нас. Отворете веднъж „Добави обява“ в mobile.bg с разширението и те ще се заредят.";
    case "BRAND_NOT_FOUND":
      return `Марката „${value ?? ""}“ я няма в mobile.bg: изберете най-близката.`;
    case "MODEL_NOT_FOUND":
      return `Моделът „${value ?? ""}“ го няма в mobile.bg: изберете най-близкия (може „Друг“) или го съпоставете в „Съпоставяне на модели“.`;
    case "MODEL_SUGGESTED":
      return `Моделът е предположен („${value ?? ""}“): проверете го. Потвърдете го в „Съпоставяне на модели“, за да не излиза това.`;
    case "MODEL_UNAVAILABLE":
      return "Отбелязано е, че mobile.bg няма този модел: изберете марка и модел ръчно.";
    case "RANGE_EXTENDER":
      return "mobile.bg няма „разширител на пробега“: колата е като „Plug-in хибрид“.";
    case "CATEGORY_UNKNOWN":
      return `Категорията не е разпозната${value ? ` („${value}“)` : ""}: изберете я.`;
    case "COLOR_UNKNOWN":
      return `Цветът „${value ?? ""}“ не е разпознат: изберете го.`;
    case "RANGE_NOT_WLTP":
      return `Пробегът на ток е по ${value ?? "друг стандарт"}, а mobile.bg иска WLTP: проверете числото.`;
    case "PRODUCTION_MONTH_UNKNOWN":
      return "Месецът на производство/регистрация не е известен: изберете го.";
    case "NO_PRICE":
      return "Колата няма цена.";
  }
};

/** mobile.bg wants only digits, starting with the area or operator code: "+359 888 123 456" -> "0888123456". */
export function mobileBgPhone(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00359")) d = d.slice(5);
  else if (d.startsWith("359")) d = d.slice(3);
  return d.startsWith("0") ? d : `0${d}`;
}

/** mobile.bg removes emoji: dropped here, so the admin sees the text mobile.bg will show. */
export const withoutEmoji = (text: string) =>
  text
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/^[ \t]+/gm, "")
    .trim();

/** What the extension gets: the edited form, the extras as mobile.bg's checkbox values, the photos' addresses. */
export interface MobileBgJob {
  carId: number;
  title: string;
  values: Omit<MobileBgDraft, "extras" | "price" | "powerHp" | "engineCc" | "mileageKm" | "year" | "rangeKm" | "batteryKwh" | "euroStandard"> & {
    price: string;
    powerHp: string;
    engineCc: string;
    mileageKm: string;
    year: string;
    rangeKm: string;
    batteryKwh: string;
    euroStandard: string;
    vin: string;
    description: string;
    phone: string;
  };
  extras: string[];
  photos: string[];
}

export interface ListingReport {
  carId: number;
  listingId: string | null;
  url: string | null;
  at: string;
}

/** An offer the extension saw published on cars.bg. */
export interface CarsBgReport {
  carId: number;
  offerId: string | null;
  url: string | null;
  at: string;
}

export type ExtMessage =
  | { type: "ready"; version: string }
  | { type: "started"; site?: "MOBILE_BG" | "CARS_BG"; ok: boolean; error?: string }
  | { type: "refreshing"; ok: boolean; sites: string[]; error?: string }
  | { type: "catalog"; catalog: MobileBgCatalog | null }
  | { type: "carsBgCatalog"; catalog: CarsBgCatalog | null }
  | { type: "reports"; reports: Record<string, ListingReport> }
  | { type: "carsBgReports"; reports: Record<string, CarsBgReport> }
  | { type: "error"; error: string };

/** The extension's first version that knows cars.bg and reading the lists again. */
export const CARS_BG_EXTENSION = "1.1.0";

/** "1.0.1" < "1.1.0" */
export function versionAtLeast(version: string | null, min: string): boolean {
  if (!version) return false;
  const a = version.split(".").map(Number);
  const b = min.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return true;
}

const post = (msg: Record<string, unknown>) =>
  window.postMessage({ source: "pci-page", ...msg }, window.location.origin);

/**
 * The browser extension on this page: its version (null = not installed) and its messages. The extension's
 * content script marks the page (data-pci-mobile-bg) and answers "hello".
 */
export function useMobileBgExtension(onMessage: (msg: ExtMessage) => void) {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg || msg.source !== "pci-ext") return;
      if (msg.type === "ready") setVersion(msg.version);
      onMessage(msg as ExtMessage);
    };
    window.addEventListener("message", listener);
    const marked = document.documentElement.dataset.pciMobileBg;
    const timer = window.setTimeout(() => {
      if (marked) setVersion(marked);
      post({ type: "hello" });
    }, 0);
    return () => {
      window.removeEventListener("message", listener);
      window.clearTimeout(timer);
    };
  }, [onMessage]);

  const send = useCallback((msg: Record<string, unknown>) => post(msg), []);
  return { version, send };
}
