import type { CarStatus, FuelType, InquiryStatus, Origin, Transmission } from "./types";

export const fuelLabels: Record<FuelType, string> = {
  PETROL: "Бензин",
  DIESEL: "Дизел",
  HYBRID: "Хибрид",
  PLUGIN_HYBRID: "Плъгин хибрид",
  ELECTRIC: "Електрически",
  LPG: "Газ",
  OTHER: "Друго",
};

export const transmissionLabels: Record<Transmission, string> = {
  AUTOMATIC: "Автоматична",
  MANUAL: "Ръчна",
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

const eur = new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("bg-BG");

export function formatEur(value: number | null | undefined): string {
  return value == null ? "Цена при запитване" : eur.format(value);
}

export function formatKm(value: number | null | undefined): string {
  return value == null ? "—" : `${num.format(value)} км`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("bg-BG", { dateStyle: "medium", timeStyle: "short" });
}
