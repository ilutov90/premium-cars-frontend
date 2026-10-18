// Post text templates for Facebook, Instagram and Viber. The admin edits them under "Шаблони" (stored by the
// backend, post_template); without a saved one the defaults below apply. Publishing fills in the placeholders from
// the car and leaves out every line whose placeholder is empty for that car (e.g. the battery of a diesel).
import { fullModel, hashtags, locationLine, powertrainLines, shortTitle } from "./description";
import {
  bodyTypeLabel,
  colorLabel,
  drivetrainLabels,
  formatYearMonth,
  fuelLabels,
  listingId,
  originLabels,
  transmissionLabels,
} from "./format";
import { site, whyUs } from "./site";
import type { AdminCar, Origin, SocialNetwork } from "./types";

const enNumber = new Intl.NumberFormat("en-US");

export const networkLabels: Record<SocialNetwork, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  VIBER: "Viber",
};

/** Every placeholder, with what it becomes (shown in the templates page). Values use the posting script's format. */
export const placeholders: { key: string; description: string; example: string }[] = [
  { key: "title", description: "Марка и модел (заглавие на поста)", example: "Kia Sportage" },
  { key: "price", description: "Крайна цена в евро", example: "22,300" },
  { key: "model", description: "Марка, модел и версия", example: "Kia Sportage Diesel 2.0 2WD Prestige" },
  { key: "year", description: "Година", example: "2024" },
  { key: "first_registration", description: "Първа регистрация", example: "03.2024" },
  { key: "mileage", description: "Километри", example: "43,213 Km" },
  { key: "engine", description: "Двигател (кубатура и гориво; за електрически — мощност)", example: "1,998cc Дизел" },
  { key: "fuel", description: "Гориво", example: "Дизел" },
  { key: "power", description: "Мощност", example: "186 к.с." },
  { key: "transmission", description: "Скоростна кутия", example: "Автоматична" },
  { key: "drivetrain", description: "Задвижване", example: "4x4 (AWD)" },
  { key: "battery", description: "Батерия (електрически и хибриди)", example: "77.4 kWh" },
  { key: "range", description: "Пробег на ток по каталог", example: "530 км (CLTC)" },
  { key: "motor", description: "Електромотор(и)", example: "160 kW" },
  { key: "body", description: "Купе", example: "SUV" },
  { key: "color", description: "Цвят", example: "Бял" },
  { key: "seats", description: "Места", example: "5" },
  { key: "country", description: "Държава", example: "Южна Корея" },
  { key: "location", description: "Ред за местоположението и доставката", example: "🇰🇷Автомобилът се намира в Южна Корея. 🚢 Доставка до 3 месеца" },
  { key: "listing_id", description: "Номер на обявата при източника", example: "IC5548563" },
  { key: "hashtags", description: "Хаштагове (марка, модел и номер на обявата)", example: "#вноснаколи #cars #автомобили #kia #киа #sportage #kiasportage #IC5548563" },
  { key: "link", description: "Линк към колата в сайта (само за публикувани коли)", example: "https://…/cars/kia-sportage-2024-7" },
];

const KNOWN = new Set(placeholders.map((p) => p.key));
const PLACEHOLDER = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g;

const carPart = [
  "🎯{{title}}",
  "🔢Крайна цена: 💰 {{price}} евро с включен транспорт и всички допълнителни разходи до България + Карго застраховка и Технотест‼️",
  "🔹Модел: {{model}}",
  "🔹Година: {{year}}",
  "🔹Километри: {{mileage}}",
  "🔹Двигател: {{engine}}",
  "🔹Батерия: {{battery}}",
  "🔹Пробег по каталог: {{range}}",
  "🔹Трансмисия: {{transmission}}",
  "{{location}}",
];

const fullPost = [
  ...carPart,
  `❓ Защо ${site.brandName} 👑`,
  ...whyUs.map((w) => `${w.icon} ${w.text}`),
  `📞 За контакти: Офис ${site.office} - ${site.phone} или на Viber`,
  "💬 Влез във Viber канала ни от линка:",
  site.viberLink,
  "",
  "{{hashtags}}",
].join("\n");

/** The templates used until the admin saves their own (same text as the posting script). */
export const defaultTemplates: Record<SocialNetwork, string> = {
  FACEBOOK: fullPost,
  INSTAGRAM: fullPost,
  VIBER: [...carPart, "{{hashtags}}"].join("\n"),
};

const originOf = (car: AdminCar): Origin | null =>
  car.source === "AUTOHOME" ? "CN" : car.source === "AUTOWINI" ? "KR" : null;

/**
 * The placeholder values of a car; "" = unknown (lines using it are left out).
 *
 * @param siteOrigin the site's address for {{link}} (e.g. window.location.origin)
 */
export function templateValues(car: AdminCar, siteOrigin?: string): Record<string, string> {
  const s = car.specs;
  const origin = originOf(car);
  const id = listingId(car.source, car.sourceRef);
  const engineLine = powertrainLines(s).find((l) => l.label === "Двигател")?.text;
  const modelForTags = [s.model, s.trim].filter(Boolean).join(" ");
  let tags = hashtags(s.make, modelForTags || s.title);
  if (id) tags += ` #${id}`;
  const publicCar = car.status === "PUBLISHED" || car.status === "RESERVED";
  const price = car.price?.totalEur;
  return {
    title: shortTitle(s),
    price: price != null ? enNumber.format(Math.round(price)) : "",
    model: fullModel(s),
    year: s.year?.toString() ?? "",
    first_registration: formatYearMonth(s.firstRegistration) ?? "",
    mileage: s.mileageKm != null ? `${enNumber.format(s.mileageKm)} Km` : "",
    engine: engineLine && engineLine !== "—" ? engineLine : "",
    fuel: s.fuelType ? fuelLabels[s.fuelType] : "",
    power: s.powerHp != null ? `${s.powerHp} к.с.` : "",
    // the posting script assumes an automatic when the listing does not say
    transmission: s.transmission ? transmissionLabels[s.transmission] : "Автоматична",
    drivetrain: s.drivetrain ? drivetrainLabels[s.drivetrain] : "",
    battery: s.batteryKwh != null ? `${enNumber.format(s.batteryKwh)} kWh` : "",
    range:
      s.electricRangeKm != null
        ? `${enNumber.format(s.electricRangeKm)} км${s.rangeStandard ? ` (${s.rangeStandard})` : ""}`
        : "",
    motor: s.motorPowerKw != null ? `${enNumber.format(s.motorPowerKw)} kW` : "",
    body: bodyTypeLabel(s.bodyType) ?? "",
    color: colorLabel(s.color) ?? "",
    seats: s.seats?.toString() ?? "",
    country: origin ? originLabels[origin] : "",
    location: locationLine(origin) ?? "",
    listing_id: id ?? "",
    hashtags: tags,
    link: publicCar && siteOrigin ? `${siteOrigin}/cars/${car.slug}` : "",
  };
}

/**
 * Fills in the placeholders. A line with a known placeholder that is empty for this car is left out; unknown
 * placeholders stay as they are (the templates page warns about them).
 */
export function renderTemplate(template: string, values: Record<string, string>): string {
  const out: string[] = [];
  for (const line of template.replace(/\r\n/g, "\n").split("\n")) {
    let missing = false;
    const filled = line.replace(PLACEHOLDER, (match, key: string) => {
      if (!KNOWN.has(key)) return match;
      const value = values[key]?.trim() ?? "";
      if (!value) missing = true;
      return value;
    });
    if (!missing) out.push(filled);
  }
  return out.join("\n").replace(/\n+$/, "");
}

/** Placeholders in a template that do not exist (typos). */
export function unknownPlaceholders(template: string): string[] {
  const found = new Set<string>();
  for (const m of template.matchAll(PLACEHOLDER)) {
    if (!KNOWN.has(m[1])) found.add(m[1]);
  }
  return [...found];
}
