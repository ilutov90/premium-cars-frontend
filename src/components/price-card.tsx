import { formatEur } from "@/lib/format";

/** The one price customers see: everything included, same number as in the Facebook/Instagram post. */
export function PriceCard({ priceEur }: { priceEur: number | null }) {
  if (priceEur == null) {
    return (
      <div className="rounded-2xl border border-line bg-card p-5">
        <p className="text-lg font-bold">Цена при запитване</p>
        <p className="mt-1 text-sm text-muted">Изпратете запитване и ще ви върнем точна оферта до 24 часа.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Крайна цена в България</p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight">{formatEur(priceEur)}</p>
      <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
        {["Цената на автомобила", "Транспорт до България", "Всички допълнителни разходи", "Карго застраховка и технотест"].map(
          (item) => (
            <li key={item} className="flex gap-2">
              <span className="font-bold text-ok">✓</span>
              {item}
            </li>
          ),
        )}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted">Без скрити такси. Цената се потвърждава в договора.</p>
    </div>
  );
}
