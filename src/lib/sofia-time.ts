/** Times in Bulgaria (Europe/Sofia), whatever the time zone of the computer: scheduled posts are planned in it. */

export const SOFIA = "Europe/Sofia";

const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: SOFIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function wall(d: Date): Record<string, string> {
  return Object.fromEntries(parts.formatToParts(d).map((p) => [p.type, p.value]));
}

/** "2026-11-13T15:37": the time in Sofia, the format of <input type="datetime-local">. */
export function toSofiaInput(d: Date): string {
  const p = wall(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** The moment that "2026-11-13T15:37" is in Sofia; null when the text is not such a time. */
export function fromSofiaInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Sofia is UTC+2 or +3: take its offset at the guess, then once more at the corrected time (around a DST change)
  let t = asUtc;
  for (let i = 0; i < 2; i++) {
    const p = wall(new Date(t));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    t = asUtc - (shown - t);
  }
  return new Date(t);
}
