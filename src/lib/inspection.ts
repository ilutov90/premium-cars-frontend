// The source's inspection report (backend Inspection: guazi's "reportDetailLite"), stored in English as imported.
// The car page shows it in Bulgarian: fixed names (checks, areas, positions, verdicts) are looked up here; the
// inspector's notes are short formulaic sentences ("Surface damage of the left front hub.") translated by patterns
// and a parts dictionary, with Bulgarian adjective agreement. A sentence that is not understood stays as the source
// wrote it: add the part or the pattern here when a car shows English.
import type { Inspection } from "./types";

const checks: Record<string, [string, string]> = {
  // title -> [passed, not passed]
  "no accident damage": ["Без следи от удар", "Има следи от удар"],
  "no water damage": ["Без следи от наводнение", "Има следи от наводнение"],
  "no fire damage": ["Без следи от пожар", "Има следи от пожар"],
};

const categories: Record<string, string> = {
  "exterior design": "Екстериор",
  exterior: "Екстериор",
  "interior trim": "Интериор",
  interior: "Интериор",
  "configuration features": "Оборудване",
  "structural components": "Носеща конструкция",
  "reinforcement parts": "Подсилващи елементи",
  "cockpit conditions": "Табло и уреди",
  "new energy": "Батерия и електрозадвижване",
  engine: "Двигател",
  "engine compartment": "Двигателен отсек",
  chassis: "Ходова част",
  electrical: "Електрическа система",
};

const items: Record<string, string> = {
  "directly ahead and downward": "Отпред, долна част",
  "directly ahead and upward": "Отпред, горна част",
  "directly behind and below": "Отзад, долна част",
  "directly behind and above": "Отзад, горна част",
  "right side": "Дясна страна",
  "left side": "Лява страна",
  "inside the car (front)": "Купе, отпред",
  "inside the car (rear)": "Купе, отзад",
};

const verdicts: Record<string, string> = {
  normal: "Без забележки",
  "minor defect": "Дребна забележка",
  "moderate defect": "Средна забележка",
  "major defect": "Сериозна забележка",
  "serious defect": "Сериозна забележка",
};

/** What the grades mean (guazi grades S best .. D). */
export const gradeMeaning: Record<string, string> = {
  S: "отлично състояние",
  A: "много добро състояние",
  B: "добро състояние",
  C: "задоволително състояние",
  D: "с повече забележки",
};

type Gender = "m" | "f" | "n";

/** English part (longest first when matching) -> Bulgarian noun and its gender. */
const parts: [string, string, Gender][] = [
  ["side rearview mirror", "странично огледало", "n"],
  ["rearview mirror", "огледало", "n"],
  ["exterior mirror", "огледало", "n"],
  ["mirror", "огледало", "n"],
  ["wheel hub", "джанта", "f"],
  ["hub", "джанта", "f"],
  ["rim", "джанта", "f"],
  ["wheel", "джанта", "f"],
  ["tire", "гума", "f"],
  ["tyre", "гума", "f"],
  ["fender", "калник", "m"],
  ["wing", "калник", "m"],
  ["quarter panel", "калник", "m"],
  ["door handle", "дръжка на врата", "f"],
  ["door", "врата", "f"],
  ["bumper", "броня", "f"],
  ["engine hood", "преден капак", "m"],
  ["hood", "преден капак", "m"],
  ["bonnet", "преден капак", "m"],
  ["trunk lid", "капак на багажника", "m"],
  ["tailgate", "капак на багажника", "m"],
  ["trunk", "багажник", "m"],
  ["headlight", "фар", "m"],
  ["headlamp", "фар", "m"],
  ["taillight", "стоп", "m"],
  ["tail light", "стоп", "m"],
  ["fog light", "халоген", "m"],
  ["windshield", "предно стъкло", "n"],
  ["windscreen", "предно стъкло", "n"],
  ["window glass", "стъкло", "n"],
  ["window", "стъкло", "n"],
  ["glass", "стъкло", "n"],
  ["roof", "покрив", "m"],
  ["rocker panel", "праг", "m"],
  ["side skirt", "праг", "m"],
  ["sill", "праг", "m"],
  ["pillar", "колона", "f"],
  ["grille", "решетка", "f"],
  ["license plate frame", "рамка на номера", "f"],
  ["steering wheel", "волан", "m"],
  ["seat", "седалка", "f"],
  ["dashboard", "табло", "n"],
  ["center console", "централна конзола", "f"],
  ["carpet", "мокет", "m"],
  ["headliner", "таван", "m"],
  ["spoiler", "спойлер", "m"],
  ["mudguard", "калобран", "m"],
  ["mud flap", "калобран", "m"],
];

const position: Record<string, Record<Gender, string>> = {
  front: { m: "преден", f: "предна", n: "предно" },
  rear: { m: "заден", f: "задна", n: "задно" },
  left: { m: "ляв", f: "лява", n: "ляво" },
  right: { m: "десен", f: "дясна", n: "дясно" },
};

/** "the left front hub" -> "предна лява джанта"; null when the part is not known. */
function part(text: string): string | null {
  let words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["the", "of", "side", "a", "an"].includes(w));
  const where = (["front", "rear", "left", "right"] as const).filter((p) => words.includes(p));
  words = words.filter((w) => !(where as readonly string[]).includes(w));
  const rest = words.join(" ");
  const found = parts.find(([en]) => rest === en || rest === `${en}s`);
  if (!found) return null;
  const [, noun, gender] = found;
  // the noun may already say front ("предно стъкло", "преден капак")
  const adjectives = where.filter((p) => !(p === "front" && /^пред/.test(noun))).map((p) => position[p][gender]);
  return [...adjectives, noun].join(" ");
}

const defects: [RegExp, string][] = [
  // "Surface damage of the X", "Damage to the surface of the X", "X surface damage"
  [/^(?:surface damage|damage to the surface|paint damage) (?:of|on|to) (.+)$/, "повърхностна повреда"],
  [/^(.+?) (?:surface damage|paint damage)$/, "повърхностна повреда"],
  [/^(?:scratch(?:es)?|scuff(?:s)?) (?:of|on|to) (.+)$/, "драскотина"],
  [/^(.+?) (?:scratch(?:es)?|scratched|scuffed)$/, "драскотина"],
  [/^(?:dent(?:s)?|deformation) (?:of|on|in|to) (.+)$/, "вдлъбнатина"],
  [/^(.+?) (?:dent(?:s)?|dented|deformed|deformation)$/, "вдлъбнатина"],
  [/^(?:crack(?:s)?) (?:of|on|in|to) (.+)$/, "пукнатина"],
  [/^(.+?) (?:crack(?:s)?|cracked)$/, "пукнатина"],
  [/^(?:repaint(?:ing)?|paint repair|sheet metal repair) (?:of|on|to) (.+)$/, "пребоядисване"],
  [/^(.+?) (?:repainted|paint repair|sheet metal repair)$/, "пребоядисване"],
  [/^(?:wear|abrasion) (?:of|on|to) (.+)$/, "износване"],
  [/^(.+?) (?:wear|worn|abrasion)$/, "износване"],
  [/^(?:stain(?:s)?|dirt) (?:of|on|to) (.+)$/, "петно"],
  [/^(.+?) (?:stain(?:s)?|stained|dirty)$/, "петно"],
  [/^(?:replacement|replaced) (?:of|on) (.+)$/, "сменен елемент"],
  [/^(.+?) (?:replaced|replacement)$/, "сменен елемент"],
];

/** One sentence of the inspector's note in Bulgarian, or null when it is not understood. */
function sentence(text: string): string | null {
  const s = text
    .trim()
    .replace(/\.$/, "")
    .toLowerCase()
    .replace(/^(?:slight|slightly|minor|light|small|obvious|severe)\s+/, "");
  for (const [re, what] of defects) {
    const m = s.match(re);
    if (m) {
      const p = part(m[1]);
      if (p) return `${p[0].toUpperCase()}${p.slice(1)}: ${what}`;
    }
  }
  return null;
}

/** The note sentence by sentence: Bulgarian where understood, the source's English otherwise. */
export function translateNote(note: string | null): { text: string; translated: boolean }[] {
  if (!note) return [];
  return note
    .split(/(?<=\.)\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const bg = sentence(x);
      return bg ? { text: bg, translated: true } : { text: x, translated: false };
    });
}

const lookup = (table: Record<string, string>, text: string | null) =>
  text ? (table[text.trim().toLowerCase()] ?? text) : "";

export const categoryLabel = (name: string | null) => lookup(categories, name);
export const itemLabel = (name: string | null) => lookup(items, name);
export const verdictLabel = (name: string | null) => lookup(verdicts, name);

export function checkLabel(title: string, passed: boolean): string {
  const known = checks[title.trim().toLowerCase()];
  return known ? known[passed ? 0 : 1] : title;
}

/** Areas with their counts, the ones with remarks first. */
export function sortedCategories(inspection: Inspection) {
  return [...inspection.categories].sort((a, b) => b.abnormal - a.abnormal);
}
