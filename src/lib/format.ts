import type { CarStatus, Drivetrain, FuelType, InquiryStatus, Origin, PriceProfile, StepMode, Transmission } from "./types";

// Bulgarian labels for everything the API returns as codes or English source text.

export const fuelLabels: Record<FuelType, string> = {
  PETROL: "Бензин",
  DIESEL: "Дизел",
  HYBRID: "Хибрид",
  PLUGIN_HYBRID: "Плъгин хибрид",
  RANGE_EXTENDER: "Електрически с разширител на пробега",
  ELECTRIC: "Електрически",
  LPG: "Газ (LPG)",
  OTHER: "Друго",
};

/** Short form for cards and filters. */
export const fuelShortLabels: Record<FuelType, string> = { ...fuelLabels, RANGE_EXTENDER: "EREV (разширител)" };

export const transmissionLabels: Record<Transmission, string> = {
  AUTOMATIC: "Автоматична",
  MANUAL: "Ръчна",
};

export const drivetrainLabels: Record<Drivetrain, string> = {
  FWD: "Предно",
  RWD: "Задно",
  AWD: "4x4 (AWD)",
};

export const originLabels: Record<Origin, string> = {
  KR: "Южна Корея",
  CN: "Китай",
};

export const statusLabels: Record<CarStatus, string> = {
  DRAFT: "Чернова",
  PUBLISHED: "Публикувана",
  RESERVED: "Резервирана",
  SOLD: "Продадена",
  ARCHIVED: "Архив",
};

export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  NEW: "Ново",
  CONTACTED: "Свързахме се",
  CLOSED: "Приключено",
};

/** Body types as the source sites write them (English). Unknown values are shown as they are. */
const bodyTypes: Record<string, string> = {
  sedan: "Седан",
  suv: "SUV",
  hatchback: "Хечбек",
  wagon: "Комби",
  "station wagon": "Комби",
  estate: "Комби",
  mpv: "Ван (MPV)",
  minivan: "Ван (MPV)",
  van: "Ван",
  coupe: "Купе",
  "hardtop coupe": "Купе",
  fastback: "Фастбек",
  convertible: "Кабрио",
  cabriolet: "Кабрио",
  pickup: "Пикап",
  truck: "Камион",
  bus: "Бус",
};

const colors: Record<string, string> = {
  white: "Бял",
  "pearl white": "Перлено бял",
  black: "Черен",
  silver: "Сребрист",
  grey: "Сив",
  gray: "Сив",
  charcoal: "Тъмносив",
  red: "Червен",
  blue: "Син",
  "dark blue": "Тъмносин",
  green: "Зелен",
  yellow: "Жълт",
  orange: "Оранжев",
  brown: "Кафяв",
  beige: "Бежов",
  gold: "Златист",
  purple: "Лилав",
  pink: "Розов",
};

function translate(table: Record<string, string>, value: string | null | undefined): string | null {
  if (!value) return null;
  return table[value.trim().toLowerCase()] ?? value;
}

export const bodyTypeLabel = (v: string | null | undefined) => translate(bodyTypes, v);
export const colorLabel = (v: string | null | undefined) => translate(colors, v);

/** True for cars whose traction battery is worth describing. */
export function hasTractionBattery(fuel: FuelType | null | undefined): boolean {
  return fuel === "ELECTRIC" || fuel === "PLUGIN_HYBRID" || fuel === "RANGE_EXTENDER";
}

const eur = new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("bg-BG");
const dec = new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 1 });

export function formatEur(value: number | null | undefined): string {
  return value == null ? "Цена при запитване" : eur.format(value);
}

export function formatKm(value: number | null | undefined): string {
  return value == null ? "—" : `${num.format(value)} км`;
}

export const formatNumber = (value: number) => num.format(value);
export const formatKwh = (value: number) => `${dec.format(value)} kWh`;

export function formatRange(km: number | null | undefined, standard?: string | null): string | null {
  if (km == null) return null;
  return `${num.format(km)} км${standard ? ` (${standard})` : ""}`;
}

/** Power as "222 к.с. (163 kW)" from whatever is known. */
export function formatPower(hp: number | null | undefined, kw?: number | null): string | null {
  if (hp == null && kw == null) return null;
  const h = hp ?? Math.round((kw as number) * 1.36);
  return kw != null ? `${num.format(h)} к.с. (${num.format(kw)} kW)` : `${num.format(h)} к.с.`;
}

/** "2020-10" -> "10.2020" */
export function formatYearMonth(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  return m ? `${m[2]}.${m[1]}` : value;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("bg-BG", { dateStyle: "medium", timeStyle: "short" });
}

export const priceProfileLabels: Record<PriceProfile, string> = {
  AUTOHOME: "Autohome (Китай)",
  AUTOWINI: "Autowini (Южна Корея)",
};

export const stepModeLabels: Record<StepMode, string> = {
  STARTED: "за всеки започнати",
  FULL: "само за пълни",
  PROPORTIONAL: "пропорционално",
};
