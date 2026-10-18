// Car descriptions in the format of the Facebook/Instagram posts (port of build_post_text() and
// generate_hashtags() from autowini_poster_parallel.py). Texts are Bulgarian: they are shown to customers.
import hashtagTable from "./car-hashtags.json";
import { fuelLabels, hasTractionBattery, transmissionLabels } from "./format";
import { site, whyUs } from "./site";
import type { CarSpecs, Origin } from "./types";

export interface DescriptionLine {
  icon: string;
  label?: string;
  text: string;
}

const enNumber = new Intl.NumberFormat("en-US");

/** "BYD Han" — make + short model, the headline of a post. */
export function shortTitle(specs: CarSpecs): string {
  return [specs.make, specs.model].filter(Boolean).join(" ") || specs.title;
}

/** "Han EV Extended Range Premium" with the make in front, as the "Модел" line. */
export function fullModel(specs: CarSpecs): string {
  return [specs.make, specs.model, specs.trim].filter(Boolean).join(" ") || specs.title;
}

/** Engine/battery/range lines, the part that differs between combustion, hybrid and electric cars. */
export function powertrainLines(specs: CarSpecs, numbers: (n: number) => string = enNumber.format): DescriptionLine[] {
  const lines: DescriptionLine[] = [];
  const fuel = specs.fuelType;
  if (fuel === "ELECTRIC") {
    const hp = specs.powerHp ?? (specs.motorPowerKw != null ? Math.round(specs.motorPowerKw * 1.36) : null);
    lines.push({ icon: "🔹", label: "Двигател", text: `Електрически${hp ? ` ${hp} к.с.` : ""}` });
  } else {
    const parts = [specs.engineCc ? `${numbers(specs.engineCc)}cc` : specs.engine, fuel ? fuelLabels[fuel] : null];
    let text = parts.filter(Boolean).join(" ") || "—";
    if (hasTractionBattery(fuel) && specs.motorPowerKw) {
      text += ` (електромотор ${Math.round(specs.motorPowerKw * 1.36)} к.с.)`;
    }
    lines.push({ icon: "🔹", label: "Двигател", text });
  }
  if (specs.batteryKwh != null) {
    lines.push({ icon: "🔹", label: "Батерия", text: `${numbers(specs.batteryKwh)} kWh` });
  }
  if (specs.electricRangeKm != null) {
    const std = specs.rangeStandard ? ` (${specs.rangeStandard})` : "";
    lines.push({ icon: "🔹", label: "Пробег по каталог", text: `${numbers(specs.electricRangeKm)} км${std}` });
  }
  return lines;
}

export function locationLine(origin: Origin | null): string | null {
  if (origin === "CN") return "🇨🇳Автомобилът се намира в Китай. 🚢 Доставка до 3 месеца";
  if (origin === "KR") return "🇰🇷Автомобилът се намира в Южна Корея. 🚢 Доставка до 3 месеца";
  return null;
}

/**
 * The spec lines of a post: model, year, kilometres, powertrain, transmission.
 * Defaults match the posting script ("102,300 Km"); the site passes Bulgarian number formatting and "км".
 */
export function descriptionLines(
  specs: CarSpecs,
  numbers: (n: number) => string = enNumber.format,
  kmUnit = "Km",
): DescriptionLine[] {
  return [
    { icon: "🔹", label: "Модел", text: fullModel(specs) },
    { icon: "🔹", label: "Година", text: specs.year?.toString() ?? "—" },
    { icon: "🔹", label: "Километри", text: specs.mileageKm != null ? `${numbers(specs.mileageKm)} ${kmUnit}` : "—" },
    ...powertrainLines(specs, numbers),
    {
      icon: "🔹",
      label: "Трансмисия",
      text: specs.transmission ? transmissionLabels[specs.transmission] : "Автоматична",
    },
  ];
}

interface HashtagBrand {
  brand_tags: string;
  models: Record<string, string>;
}

const table = hashtagTable as Record<string, HashtagBrand>;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Same rules as generate_hashtags(): brand tags, then the longest matching model key. */
export function hashtags(make: string | null, model: string | null): string {
  const base = "#вноснаколи #cars #автомобили";
  const extra: string[] = [];
  const makeLower = (make ?? "").toLowerCase().replace(/-/g, " ").trim();
  const modelLower = (model ?? "").toLowerCase().trim();
  const fullText = `${makeLower} ${modelLower}`;

  let brand: HashtagBrand | undefined;
  if (makeLower) {
    for (const [key, data] of Object.entries(table)) {
      if (key.includes(makeLower) || makeLower.includes(key)) {
        brand = data;
        break;
      }
    }
  }
  if (!brand) {
    for (const [key, data] of Object.entries(table)) {
      if (new RegExp(`(?:^|\\s)${escapeRegex(key)}(?:\\s|$)`).test(fullText)) {
        brand = data;
        break;
      }
    }
  }
  if (brand) {
    extra.push(brand.brand_tags);
    const models = Object.entries(brand.models).sort((a, b) => b[0].length - a[0].length);
    for (const [key, tags] of models) {
      const pattern = new RegExp(`(?:^|[\\s(/])${escapeRegex(key)}(?:[\\s)/.,]|$)`);
      if (pattern.test(modelLower) || pattern.test(fullText)) {
        extra.push(tags);
        break;
      }
    }
  }
  return extra.length ? `${base} ${extra.join(" ")}` : base;
}

/** The full Facebook/Instagram post, line for line as the posting script writes it. */
export function socialPostText(
  specs: CarSpecs,
  origin: Origin | null,
  priceEur: number | null,
  listingId?: string | null,
): string {
  const modelForTags = [specs.model, specs.trim].filter(Boolean).join(" ");
  let tags = hashtags(specs.make, modelForTags || specs.title);
  if (listingId) tags += ` #${listingId}`;
  const lines = [
    ...carLines(specs, origin, priceEur),
    `❓ Защо ${site.brandName} 👑`,
    ...whyUs.map((w) => `${w.icon} ${w.text}`),
    `📞 За контакти: Офис ${site.office} - ${site.phone} или на Viber`,
    "💬 Влез във Viber канала ни от линка:",
    site.viberLink,
    "",
    tags,
  ];
  return lines.join("\n");
}

/** Title, final price, specs and location: the part of the post about the car itself. */
function carLines(specs: CarSpecs, origin: Origin | null, priceEur: number | null): string[] {
  const location = locationLine(origin);
  return [
    `🎯${shortTitle(specs)}`,
    priceEur != null
      ? `🔢Крайна цена: 💰 ${enNumber.format(Math.round(priceEur))} евро с включен транспорт и всички допълнителни разходи до България + Карго застраховка и Технотест‼️`
      : "🔢Крайна цена: при запитване",
    ...descriptionLines(specs).map((l) => `${l.icon}${l.label}: ${l.text}`),
    ...(location ? [location] : []),
  ];
}

/**
 * The shorter Viber channel post: the car part of {@link socialPostText} (title, price, specs, location) and the
 * listing id as a hashtag; no "why us", contacts or other hashtags (the channel already is the business's).
 */
export function viberPostText(
  specs: CarSpecs,
  origin: Origin | null,
  priceEur: number | null,
  listingId?: string | null,
): string {
  const lines = carLines(specs, origin, priceEur);
  return listingId ? `${lines.join("\n")}\n\n#${listingId}` : lines.join("\n");
}
