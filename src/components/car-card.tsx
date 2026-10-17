import Link from "next/link";
import type { CarSummary } from "@/lib/types";
import { formatEur, formatKm, formatKwh, fuelShortLabels, originLabels, transmissionLabels } from "@/lib/format";
import { CarImage } from "./car-image";

export function CarCard({ car }: { car: CarSummary }) {
  const facts = [
    car.year?.toString(),
    car.mileageKm != null ? formatKm(car.mileageKm) : null,
    car.fuelType ? fuelShortLabels[car.fuelType] : null,
    car.transmission ? transmissionLabels[car.transmission] : null,
  ].filter(Boolean);
  const ev = [
    car.electricRangeKm != null ? `${car.electricRangeKm} км пробег` : null,
    car.batteryKwh != null ? formatKwh(car.batteryKwh) : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/cars/${car.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(18,19,22,0.45)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-line/50">
        <CarImage
          src={car.coverImageUrl}
          alt={car.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {car.origin && (
            <span className="rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase backdrop-blur">
              {originLabels[car.origin]}
            </span>
          )}
          {car.status === "RESERVED" && (
            <span className="rounded-full bg-warn px-2.5 py-1 text-[11px] font-bold tracking-wide text-white uppercase">
              Резервирана
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-bold">{car.title}</h3>
        <p className="mt-1.5 text-[13px] text-muted">{facts.join(" · ")}</p>
        {ev.length > 0 && <p className="mt-1 text-[13px] font-semibold text-ok">⚡ {ev.join(" · ")}</p>}
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Крайна цена в БГ</p>
            <p className="text-xl font-extrabold tracking-tight">{formatEur(car.totalPriceEur)}</p>
          </div>
          <span className="text-sm font-semibold text-accent transition group-hover:translate-x-0.5">Виж →</span>
        </div>
      </div>
    </Link>
  );
}
