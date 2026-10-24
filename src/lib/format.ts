import type {
  CarFeature,
  CarSource,
  CarStatus,
  Drivetrain,
  FuelType,
  InquiryStatus,
  Origin,
  PriceProfile,
  ScheduledPostStatus,
  Transmission,
} from "./types";

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

/** Where a car was imported from (admin only). */
export const sourceLabels: Record<CarSource, string> = {
  AUTOHOME: "autohome",
  AUTOWINI: "autowini",
  OTHER: "друг сайт",
  MANUAL: "ръчно",
};

/** The source listing's id as the posting script writes it (autohome ids get an "AH" prefix). */
export function listingId(source: CarSource, sourceRef: string | null | undefined): string | null {
  if (!sourceRef) return null;
  return source === "AUTOHOME" ? `AH${sourceRef}` : sourceRef;
}

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

export const scheduledStatusLabels: Record<ScheduledPostStatus, string> = {
  SCHEDULED: "Насрочена",
  PUBLISHING: "Публикува се",
  PUBLISHED: "Публикувана",
  FAILED: "Неуспешна",
  CANCELLED: "Отменена",
};

export const priceProfileLabels: Record<PriceProfile, string> = {
  AUTOHOME: "Autohome (Китай)",
  AUTOWINI: "Autowini (Южна Корея)",
};

/**
 * Car extras grouped as in mobile.bg's "Добави обява" form, in its order. The labels are mobile.bg's own words
 * ("\\" written as " / "), so what the admins tick here is what gets ticked there.
 */
export const featureGroups: { title: string; features: CarFeature[] }[] = [
  {
    title: "Безопасност",
    features: [
      "GPS_TRACKING",
      "ADAPTIVE_HEADLIGHTS",
      "ABS",
      "AIRBAGS_REAR",
      "AIRBAGS_FRONT",
      "AIRBAGS_SIDE",
      "EBD",
      "ESP",
      "TIRE_PRESSURE_MONITORING",
      "PARKING_SENSORS",
      "ISOFIX",
      "DYNAMIC_STABILITY",
      "TRACTION_CONTROL",
      "DISTANCE_CONTROL",
      "HILL_DESCENT_CONTROL",
    ],
  },
  {
    title: "Комфорт",
    features: [
      "CAMERA",
      "CARPLAY_ANDROID_AUTO",
      "START_STOP",
      "BLUETOOTH",
      "DVD_TV",
      "HEAD_UP_DISPLAY",
      "MANUAL_SHIFT_MODE",
      "USB_AUX",
      "POWER_TAILGATE",
      "AIR_SUSPENSION",
      "KEYLESS_START",
      "DIFFERENTIAL_LOCK",
      "TRIP_COMPUTER",
      "LOW_RANGE",
      "VENTILATED_SEATS",
      "LIGHT_SENSOR",
      "POWER_MIRRORS",
      "POWER_WINDOWS",
      "POWER_SEATS",
      "ELECTRIC_POWER_STEERING",
      "AIR_CONDITIONING",
      "CLIMATE_CONTROL",
      "MULTIFUNCTION_STEERING_WHEEL",
      "NAVIGATION",
      "HEATED_STEERING_WHEEL",
      "HEATER",
      "HEATED_WINDSHIELD",
      "HEATED_SEATS",
      "STEERING_WHEEL_ADJUSTMENT",
      "RAIN_SENSOR",
      "POWER_STEERING",
      "HEADLIGHT_WASHERS",
      "CRUISE_CONTROL",
      "HEAT_PUMP",
      "COOLED_GLOVEBOX",
    ],
  },
  {
    title: "Други",
    features: [
      "FOUR_BY_FOUR",
      "SEVEN_SEATS",
      "BUY_BACK",
      "BARTER",
      "LPG",
      "LONG_WHEELBASE",
      "RESERVED_OR_SOLD",
      "CRASHED",
      "SHORT_WHEELBASE",
      "LEASING",
      "CNG",
      "FOR_PARTS",
      "FULLY_SERVICED",
      "NEW_IMPORT",
      "REGISTERED",
      "SERVICE_BOOK",
      "TUNING",
    ],
  },
  {
    title: "Екстериор",
    features: [
      "DOORS_2_3",
      "DOORS_4_5",
      "LED_HEADLIGHTS",
      "XENON_HEADLIGHTS",
      "ALLOY_WHEELS",
      "METALLIC_PAINT",
      "PANORAMIC_ROOF",
      "ROOF_RAILS",
      "SPOILERS",
      "TOW_BAR",
      "HALOGEN_HEADLIGHTS",
      "SUNROOF",
    ],
  },
  {
    title: "Защита",
    features: [
      "OFFROAD_PACKAGE",
      "ALARM",
      "ARMORED",
      "CASCO",
      "WINCH",
      "CENTRAL_LOCKING",
    ],
  },
  {
    title: "Интериор",
    features: [
      "VELOUR_INTERIOR",
      "RIGHT_HAND_DRIVE",
      "LEATHER_INTERIOR",
      "LIGHT_INTERIOR",
    ],
  },
  {
    title: "Специализирани",
    features: [
      "TAXI",
      "DISABLED_ACCESS",
      "HEARSE",
      "AMBULANCE",
      "DRIVING_SCHOOL",
      "REFRIGERATED",
      "N1_HOMOLOGATION",
    ],
  },
];

export const featureLabels: Record<CarFeature, string> = {
  GPS_TRACKING: "GPS система за проследяване",
  ADAPTIVE_HEADLIGHTS: "Адаптивни предни светлини",
  ABS: "Антиблокираща система",
  AIRBAGS_REAR: "Въздушни възглавници - Задни",
  AIRBAGS_FRONT: "Въздушни възглавници - Предни",
  AIRBAGS_SIDE: "Въздушни възглавници - Странични",
  EBD: "Ел. разпределяне на спирачното усилие",
  ESP: "Електронна програма за стабилизиране",
  TIRE_PRESSURE_MONITORING: "Контрол на налягането на гумите",
  PARKING_SENSORS: "Парктроник",
  ISOFIX: "Система ISOFIX",
  DYNAMIC_STABILITY: "Система за динамична устойчивост",
  TRACTION_CONTROL: "Система за защита от пробуксуване",
  DISTANCE_CONTROL: "Система за контрол на дистанцията",
  HILL_DESCENT_CONTROL: "Система за контрол на спускането",
  CAMERA: "360 camera / Задна камера",
  CARPLAY_ANDROID_AUTO: "Apple CarPlay / Android Auto",
  START_STOP: "Auto Start Stop function",
  BLUETOOTH: "Bluetooth / handsfree система",
  DVD_TV: "DVD, TV",
  HEAD_UP_DISPLAY: "Head up display",
  MANUAL_SHIFT_MODE: "Steptronic, Tiptronic",
  USB_AUX: "USB, audio / video, IN / AUX изводи",
  POWER_TAILGATE: "Автоматично затваряне на багажника",
  AIR_SUSPENSION: "Адаптивно въздушно окачване",
  KEYLESS_START: "Безключово палене",
  DIFFERENTIAL_LOCK: "Блокаж на диференциала",
  TRIP_COMPUTER: "Бордкомпютър",
  LOW_RANGE: "Бързи / бавни скорости",
  VENTILATED_SEATS: "Вентилация на седалките",
  LIGHT_SENSOR: "Датчик за светлина",
  POWER_MIRRORS: "Ел. Огледала",
  POWER_WINDOWS: "Ел. Стъкла",
  POWER_SEATS: "Ел. регулиране на седалките",
  ELECTRIC_POWER_STEERING: "Ел. усилвател на волана",
  AIR_CONDITIONING: "Климатик",
  CLIMATE_CONTROL: "Климатроник",
  MULTIFUNCTION_STEERING_WHEEL: "Мултифункционален волан",
  NAVIGATION: "Навигация",
  HEATED_STEERING_WHEEL: "Отопление на волана",
  HEATER: "Печка",
  HEATED_WINDSHIELD: "Подгряване на предното стъкло",
  HEATED_SEATS: "Подгряване на седалките",
  STEERING_WHEEL_ADJUSTMENT: "Регулиране на волана",
  RAIN_SENSOR: "Сензор за дъжд",
  POWER_STEERING: "Серво усилвател на волана",
  HEADLIGHT_WASHERS: "Система за измиване на фаровете",
  CRUISE_CONTROL: "Система за контрол на скоростта (автопилот)",
  HEAT_PUMP: "Термопомпа",
  COOLED_GLOVEBOX: "Хладилна жабка",
  FOUR_BY_FOUR: "4x4",
  SEVEN_SEATS: "7 места",
  BUY_BACK: "Buy back",
  BARTER: "Бартер",
  LPG: "Газова уредба",
  LONG_WHEELBASE: "Дълга база",
  RESERVED_OR_SOLD: "Капариран / Продаден",
  CRASHED: "Катастрофирал",
  SHORT_WHEELBASE: "Къса база",
  LEASING: "Лизинг",
  CNG: "Метанова уредба",
  FOR_PARTS: "На части",
  FULLY_SERVICED: "Напълно обслужен",
  NEW_IMPORT: "Нов внос",
  REGISTERED: "С регистрация",
  SERVICE_BOOK: "Сервизна книжка",
  TUNING: "Тунинг",
  DOORS_2_3: "2(3) Врати",
  DOORS_4_5: "4(5) Врати",
  LED_HEADLIGHTS: "LED фарове",
  XENON_HEADLIGHTS: "Ксенонови фарове",
  ALLOY_WHEELS: "Лети джанти",
  METALLIC_PAINT: "Металик",
  PANORAMIC_ROOF: "Панорамен люк",
  ROOF_RAILS: "Рейлинг на покрива",
  SPOILERS: "Спойлери",
  TOW_BAR: "Теглич",
  HALOGEN_HEADLIGHTS: "Халогенни фарове",
  SUNROOF: "Шибедах",
  OFFROAD_PACKAGE: "OFFROAD пакет",
  ALARM: "Аларма",
  ARMORED: "Брониран",
  CASCO: "Каско",
  WINCH: "Лебедка",
  CENTRAL_LOCKING: "Централно заключване",
  VELOUR_INTERIOR: "Велурен салон",
  RIGHT_HAND_DRIVE: "Десен волан",
  LEATHER_INTERIOR: "Кожен салон",
  LIGHT_INTERIOR: "Светъл салон",
  TAXI: "TAXI",
  DISABLED_ACCESS: "За хора с увреждания",
  HEARSE: "Катафалка",
  AMBULANCE: "Линейка",
  DRIVING_SCHOOL: "Учебен",
  REFRIGERATED: "Хладилен",
  N1_HOMOLOGATION: "Хомологация N1",
};

/** Euro emission classes for the editor and the car page. */
export const euroStandards = [1, 2, 3, 4, 5, 6] as const;
