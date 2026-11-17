// The landing pages per make (/koli/{make}) and per make + model (/koli/{make}/{model}): addresses and the automatic
// texts written from the page's data (count, years, prices, origins, fuels). Pure functions: the public pages and the
// admin's editor (which shows the automatic text as the placeholder) use the same ones.
import { formatEur, fuelLabels } from "./format";
import type { FuelType, Origin } from "./types";

/**
 * The address part of a make or model name: lower case, accents stripped, every run of other characters one "-",
 * trimmed of "-"; "" when nothing is left. MUST stay equal to the backend's `SeoSlugs.of`: the backend finds the
 * page by it and the car page links to it.
 */
export function seoSlug(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const seoMakePath = (makeSlug: string) => `/koli/${makeSlug}`;
export const seoModelPath = (makeSlug: string, modelSlug: string) => `/koli/${makeSlug}/${modelSlug}`;

/** A make's / model's landing page address from the names as a car has them; null when a name gives no slug. */
export function seoPathOf(make: string | null | undefined, model?: string | null): string | null {
  const makeSlug = seoSlug(make);
  if (!makeSlug) return null;
  if (model === undefined) return seoMakePath(makeSlug);
  const modelSlug = seoSlug(model);
  return modelSlug ? seoModelPath(makeSlug, modelSlug) : null;
}

/** What the automatic texts are written from (a public page's data; the admin's editor fetches the same). */
export interface SeoFacts {
  make: string;
  model: string | null;
  count: number;
  minPriceEur: number | null;
  maxPriceEur: number | null;
  yearFrom: number | null;
  yearTo: number | null;
  origins: Origin[];
  fuels?: FuelType[];
  /** the make's models, the most cars first (make page only) */
  models?: { model: string; count: number }[];
}

/** "Hyundai Tucson"; a model name that already starts with the make is not doubled. */
export function seoName(make: string, model: string | null): string {
  if (!model) return make;
  return model.toLowerCase().startsWith(`${make.toLowerCase()} `) ? model : `${make} ${model}`;
}

/** " от Корея", " от Китай", " от Корея и Китай" (short, for titles); "" when unknown. */
function fromShort(origins: Origin[]): string {
  const kr = origins.includes("KR");
  const cn = origins.includes("CN");
  return kr && cn ? " от Корея и Китай" : kr ? " от Корея" : cn ? " от Китай" : "";
}

/** "от Южна Корея", "от Китай", "от Южна Корея и Китай" (the full name, for the text); "" when unknown. */
function fromLong(origins: Origin[]): string {
  const kr = origins.includes("KR");
  const cn = origins.includes("CN");
  return kr && cn ? "от Южна Корея и Китай" : kr ? "от Южна Корея" : cn ? "от Китай" : "";
}

const cars = (n: number) => (n === 1 ? "1 кола" : `${n} коли`);

/** "a, b и c" */
function joinAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} и ${items[items.length - 1]}`;
}

/** "2019–2023 г." / "2021 г." / "" */
function years(f: SeoFacts): string {
  const from = f.yearFrom ?? f.yearTo;
  const to = f.yearTo ?? f.yearFrom;
  if (from == null || to == null) return "";
  return from === to ? `${from} г.` : `${from}–${to} г.`;
}

/** "от 14 900 € до 31 200 €" / "18 900 €" / "" */
function prices(f: SeoFacts): string {
  const min = f.minPriceEur ?? f.maxPriceEur;
  const max = f.maxPriceEur ?? f.minPriceEur;
  if (min == null || max == null) return "";
  return Math.round(min) === Math.round(max) ? formatEur(min) : `от ${formatEur(min)} до ${formatEur(max)}`;
}

/** The fuel names in lower case, "Друго" left out. */
function fuelNames(f: SeoFacts): string[] {
  return (f.fuels ?? []).filter((x) => x !== "OTHER").map((x) => fuelLabels[x].toLowerCase());
}

/** <h1>: "Hyundai Tucson от Корея" (make page: "Hyundai от Корея"). Never replaced by an override. */
export function seoHeading(f: SeoFacts): string {
  return `${seoName(f.make, f.model)}${fromShort(f.origins)}`;
}

/**
 * <title> and the og title, without the site's name (the layout's title template appends it):
 * "Hyundai Tucson от Корея – 5 коли с крайна цена", make page "Hyundai от Корея – внос с крайна цена в България".
 */
export function seoAutoTitle(f: SeoFacts): string {
  const head = seoHeading(f);
  return f.model ? `${head} – ${cars(f.count)} с крайна цена` : `${head} – внос с крайна цена в България`;
}

/** The meta description (~150 characters): count, years, prices and what the price includes. */
export function seoAutoDescription(f: SeoFacts): string {
  const count =
    f.count === 1
      ? "1 налична кола"
      : f.model || !f.models || f.models.length < 2
        ? `${f.count} налични коли`
        : `${f.count} налични коли от ${f.models.length} модела`;
  const facts = [count, years(f), prices(f)].filter(Boolean).join(", ");
  const price = f.count === 1 ? "Крайна цена" : "Крайни цени";
  return `${seoHeading(f)}: ${facts}. ${price} в България с включени транспорт, мито и ДДС.`;
}

/** The intro paragraphs: the same facts in sentences, the fuels, what the price includes, the check before purchase. */
export function seoAutoText(f: SeoFacts): string[] {
  const name = seoName(f.make, f.model);
  const from = fromLong(f.origins);
  const forImport = from ? ` за внос ${from}` : "";
  const y = years(f);
  const p = prices(f);
  const facts: string[] = [];
  if (f.count === 1) {
    let s = `В каталога ни в момента има една кола ${name}${forImport}`;
    if (y) s += `, произведена през ${y}`;
    if (p) s += `, с крайна цена ${p}`;
    facts.push(`${s}.`);
  } else {
    let s = `В каталога ни в момента има ${f.count} коли ${name}${forImport}`;
    if (f.yearFrom != null && f.yearTo != null && f.yearFrom !== f.yearTo) {
      s += `, произведени между ${f.yearFrom} и ${f.yearTo} г.`;
    } else if (y) {
      s += `, произведени през ${y}`;
    } else {
      s += ".";
    }
    facts.push(s.endsWith(".") ? s : `${s}.`);
    if (p) facts.push(p.startsWith("от ") ? `Цените са ${p}.` : `Всички са на цена ${p}.`);
    const top = (f.models ?? []).slice(0, 3).map((m) => m.model);
    if (!f.model && top.length > 0) {
      const all = f.models?.length ?? 0;
      facts.push(
        all === 1
          ? `Моделът е ${top[0]}.`
          : all <= 3
            ? `Моделите са ${joinAnd(top)}.`
            : `Най-често срещаните модели са ${joinAnd(top)}, а общо моделите са ${all}.`,
      );
    }
  }
  const fuels = fuelNames(f);
  if (fuels.length > 0) facts.push(fuels.length === 1 ? `Гориво: ${fuels[0]}.` : `Видове гориво: ${joinAnd(fuels)}.`);
  return [
    facts.join(" "),
    `${f.count === 1 ? "Цената е крайна" : "Цените са крайни"} за България: в ${f.count === 1 ? "нея" : "тях"} са включени транспортът, митото и ДДС. Преди покупка проверяваме колата – пробега, историята и състоянието ѝ – и се грижим за документите до регистрацията.`,
  ];
}

/** An admin's text as paragraphs: blank lines separate them; plain text, never HTML. */
export function textParagraphs(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** The texts a page shows: the admins' overrides where set, the automatic ones otherwise. */
export function seoTexts(f: SeoFacts & { title: string | null; description: string | null; text: string | null }) {
  return {
    heading: seoHeading(f),
    title: f.title?.trim() || seoAutoTitle(f),
    description: f.description?.trim() || seoAutoDescription(f),
    paragraphs: f.text?.trim() ? textParagraphs(f.text) : seoAutoText(f),
  };
}

/** The limits of the admins' texts (backend SeoService). */
export const SEO_LIMITS = { title: 160, description: 320, text: 5000 } as const;
