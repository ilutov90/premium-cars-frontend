import type { PublicPrice } from "@/lib/types";
import { formatEur } from "@/lib/format";

export function PriceBreakdownCard({ price }: { price: PublicPrice | null }) {
  if (!price) {
    return (
      <div className="rounded-2xl border border-line bg-card p-5">
        <p className="text-lg font-bold">Цена при запитване</p>
        <p className="mt-1 text-sm text-muted">Изпратете запитване и ще ви върнем точна оферта до 24 часа.</p>
      </div>
    );
  }

  const rows: [string, number][] = [
    ["Цена на автомобила", price.carPriceEur],
    ["Транспорт до България", price.shippingEur],
    ["Мито", price.customsDutyEur],
    ["ДДС", price.vatEur],
    ["Обслужване, документи и регистрация", price.serviceEur],
  ];

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Крайна цена в България</p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight">{formatEur(price.totalEur)}</p>
      <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted">{label}</dt>
            <dd className="font-semibold">{formatEur(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Ориентировъчна сметка по текущия валутен курс. Окончателната цена се потвърждава в договора.
      </p>
    </div>
  );
}
