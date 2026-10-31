// The admin panel's cars.bg module: cars.bg's fixed lists (ids of the "Публикувай обява" form), the warnings in
// Bulgarian, the description cleaned for cars.bg's rules, and the job for the browser extension (extension/mobile-bg,
// which also types into cars.bg; the admin presses cars.bg's "Публикувай").
import { withoutEmoji } from "./mobile-bg";
import type { CarsBgWarningCode } from "./types";

export const CARS_BG_MAX_PHOTOS = 15;
export const CARS_BG_ENGINE_MAX = 15;
export const CARS_BG_TEXT_MAX = 30000;

type Opt = { value: string; text: string };
const opts = (list: [number, string][]): Opt[] => list.map(([v, t]) => ({ value: String(v), text: t }));

export const carsBgOptions = {
  categoryId: opts([
    [1, "Седан"],
    [2, "Хечбек"],
    [4, "Комби"],
    [5, "Купе"],
    [6, "Кабрио"],
    [7, "Джип"],
    [8, "Пикап"],
    [9, "Ван"],
  ]),
  fuelId: opts([
    [1, "Бензин"],
    [2, "Дизел"],
    [3, "Газ/Бензин"],
    [4, "Метан/Бензин"],
    [6, "Хибрид"],
    [7, "Електричество"],
  ]),
  gearId: opts([
    [1, "Ръчна"],
    [2, "Автоматична"],
  ]),
  doorId: opts([
    [1, "2/3"],
    [2, "4/5"],
  ]),
  colorId: opts([
    [12, "Бежов"],
    [11, "Бордо"],
    [14, "Бронзов"],
    [1, "Бял"],
    [5, "Виолетов"],
    [2, "Жълт"],
    [7, "Зелен"],
    [15, "Златен"],
    [8, "Кафяв"],
    [16, "Лилав"],
    [3, "Оранжев"],
    [17, "Охра"],
    [18, "Перла"],
    [19, "Розов"],
    [25, "Светло зелен"],
    [24, "Светло сив"],
    [21, "Светло син"],
    [9, "Сив"],
    [6, "Син"],
    [13, "Сребърен"],
    [26, "Тъмно зелен"],
    [23, "Тъмно сив"],
    [22, "Тъмно син"],
    [20, "Хамелеон"],
    [4, "Червен"],
    [10, "Черен"],
  ]),
  euroId: [1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), text: `Евро ${n}` })),
  monthId: [
    "Януари",
    "Февруари",
    "Март",
    "Април",
    "Май",
    "Юни",
    "Юли",
    "Август",
    "Септември",
    "Октомври",
    "Ноември",
    "Декември",
  ].map((m, i) => ({ value: String(i + 1), text: m })),
  stateId: opts([
    [1, "Употребяван"],
    [2, "Нов"],
  ]),
  conditionId: opts([
    [1, "Без повреди"],
    [2, "Повреден/ударен"],
    [3, "За части"],
  ]),
  isInBg: opts([
    [2, "В чужбина"],
    [1, "В България"],
  ]),
} satisfies Record<string, Opt[]>;

/** cars.bg's extras (the e[] checkboxes) in its groups. */
export const carsBgExtras: { title: string; items: [number, string][] }[] = [
  {
    title: "Комфорт",
    items: [
      [1, "Климатик"],
      [2, "Климатроник"],
      [3, "Кожен салон"],
      [4, "Ел. стъкла"],
      [5, "Ел. огледала"],
      [6, "Ел. седалки"],
      [7, "Подгряване на седалки"],
      [8, "Шибедах"],
      [9, "Стерео уредба"],
      [10, "Алуминиеви джанти"],
      [34, "DVD/TV"],
      [35, "Мултифункционален волан"],
    ],
  },
  {
    title: "Сигурност",
    items: [
      [11, "4x4"],
      [12, "ABS"],
      [13, "ESP"],
      [14, "Airbag"],
      [15, "Ксенонови фарове"],
      [16, "Халогенни фарове"],
      [17, "ASR/Тракшън контрол"],
      [18, "Парктроник"],
      [19, "Аларма"],
      [20, "Имобилайзер"],
      [21, "Центр. заключване"],
      [22, "Застраховка"],
      [36, "Брониран"],
    ],
  },
  {
    title: "Друго",
    items: [
      [42, "Старт-Стоп система"],
      [43, "Безключово палене"],
      [23, "Типтроник/Мултитроник"],
      [24, "Автопилот"],
      [25, "Серво управление"],
      [26, "Бордови компютър"],
      [27, "Сервизна книжка"],
      [28, "Гаранция"],
      [30, "Навигационна система"],
      [31, "Десен волан"],
      [32, "Тунинг"],
      [33, "Панорамен покрив"],
      [37, "TAXI"],
      [38, "Ретро"],
      [39, "Теглич"],
      [40, "7 места (6+1)"],
      [41, "Хладилен"],
    ],
  },
];

export const carsBgWarningText = (code: CarsBgWarningCode, value: string | null): string => {
  switch (code) {
    case "CATALOG_MISSING":
      return "Списъците на cars.bg (марки и модели) още не са прочетени: обновете ги от „Съпоставяне на модели“.";
    case "BRAND_NOT_FOUND":
      return `Марката „${value ?? ""}“ я няма в cars.bg: колата не може да се качи там.`;
    case "MODEL_NOT_FOUND":
      return `Моделът „${value ?? ""}“ го няма в cars.bg: изберете модел тук или в „Съпоставяне на модели“.`;
    case "MODEL_SUGGESTED":
      return `Моделът е предположен („${value ?? ""}“): проверете го. Потвърдете го в „Съпоставяне на модели“, за да не излиза това.`;
    case "MODEL_UNAVAILABLE":
      return "Отбелязано е, че cars.bg няма този модел.";
    case "CATEGORY_UNKNOWN":
      return `Категорията не е разпозната${value ? ` („${value}“)` : ""}: изберете я.`;
    case "CATEGORY_MPV":
      return "cars.bg няма „Миниван“: избрано е „Ван“. Сменете го, ако има по-подходящо.";
    case "COLOR_UNKNOWN":
      return `Цветът „${value ?? ""}“ не е разпознат: изберете го.`;
    case "DOORS_UNKNOWN":
      return "Броят врати не е известен: изберете го.";
    case "YEAR_ADJUSTED":
      return `Годината на колата е ${value ?? ""}, а cars.bg стига до тази година: избрана е тази година. Моделната година е в описанието.`;
    case "PRODUCTION_MONTH_UNKNOWN":
      return "Месецът на производство/регистрация не е известен: изберете го.";
    case "NO_PRICE":
      return "Колата няма цена.";
  }
};

const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+(?:\.[\w-]+)*\.(?:bg|com|eu|net|org|cn|kr)\b(?:\/\S*)?/gi;
const PHONE_RE = /(?:\+359|00359|\b0)[\s\-/]?\d(?:[\s\-/]?\d){7,9}\b/g;

/**
 * The description for cars.bg, whose rules forbid links, phone numbers and emoji in the text (the phone is the
 * dealer profile's): those are removed with the lines left empty by it, and the car's full name comes first.
 */
export function carsBgDescription(text: string, fullName: string | null): string {
  const lines = withoutEmoji(text)
    .split("\n")
    .map((line) => {
      const cleaned = line.replace(URL_RE, "").replace(PHONE_RE, "").replace(/[ \t]{2,}/g, " ").trim();
      if (cleaned === line.trim()) return line.trimEnd();
      // a line that held only the link or the phone ("Телефон: …", "Viber:") goes
      return /[\p{L}\p{N}]{2,}.*[\p{L}\p{N}]/u.test(cleaned.replace(/^[^:]{0,20}:\s*$/u, "")) ? cleaned : null;
    })
    .filter((l): l is string => l !== null);
  let out = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (fullName && !out.toLowerCase().startsWith(fullName.toLowerCase())) out = `${fullName}\n\n${out}`;
  return out.slice(0, CARS_BG_TEXT_MAX);
}

/** What the extension gets: the edited form in cars.bg's ids (strings), the extras' ids, the photos' addresses. */
export interface CarsBgJob {
  site: "CARS_BG";
  carId: number;
  title: string;
  values: {
    brandId: string | null;
    brandName: string | null;
    modelId: string | null;
    modelName: string | null;
    engine: string;
    categoryId: string;
    fuelId: string;
    gearId: string;
    power: string;
    cubature: string;
    productionYear: string;
    monthId: string;
    run: string;
    doorId: string;
    colorId: string;
    metallic: boolean;
    euroId: string;
    price: string;
    currencyId: string;
    stateId: string;
    conditionId: string;
    isInBg: string;
    usageId: string;
    leasing: boolean;
    barter: boolean;
    notes: string;
  };
  extras: string[];
  photos: string[];
}
