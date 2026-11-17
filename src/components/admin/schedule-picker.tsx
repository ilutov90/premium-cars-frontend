"use client";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

/**
 * Date, hour and minute (quarter hours only) of a Bulgarian-time moment. The value is "YYYY-MM-DDTHH:mm" in Sofia
 * time (see `sofia-time.ts`); `minDate` is "YYYY-MM-DD".
 */
export function SchedulePicker({
  value,
  minDate,
  onChange,
}: {
  value: string;
  minDate: string;
  onChange: (value: string) => void;
}) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  const date = m?.[1] ?? "";
  const hour = m?.[2] ?? "00";
  const minute = m && MINUTES.includes(m[3]) ? m[3] : "00";

  function change(d: string, h: string, mi: string) {
    onChange(d ? `${d}T${h}:${mi}` : "");
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={date}
        min={minDate}
        onChange={(e) => change(e.target.value, hour, minute)}
        className="field w-auto! py-1.5!"
        aria-label="Дата на публикуване"
      />
      <span className="flex items-center gap-1">
        <select
          value={hour}
          onChange={(e) => change(date, e.target.value, minute)}
          className="field w-auto! py-1.5!"
          aria-label="Час"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span aria-hidden="true">:</span>
        <select
          value={minute}
          onChange={(e) => change(date, hour, e.target.value)}
          className="field w-auto! py-1.5!"
          aria-label="Минути"
        >
          {MINUTES.map((mi) => (
            <option key={mi} value={mi}>
              {mi}
            </option>
          ))}
        </select>
      </span>
    </span>
  );
}
