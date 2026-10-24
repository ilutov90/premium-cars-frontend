import Link from "next/link";
import { CarImage } from "@/components/car-image";
import { formatDay } from "@/lib/format";
import type { PublicDeliveredCar } from "@/lib/types";

/** Cards of handed-over cars with the customer's words ("Доставени коли"). */
export function DeliveredCarCards({ items }: { items: PublicDeliveredCar[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <li key={d.id} className="overflow-hidden rounded-2xl border border-line bg-card">
          <CarImage
            src={d.photoUrl}
            alt={`${d.carTitle}, предадена на ${d.customerName}`}
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="p-5">
            <p className="font-bold">
              {d.carSlug ? (
                <Link href={`/cars/${d.carSlug}`} className="hover:text-accent">
                  {d.carTitle}
                </Link>
              ) : (
                d.carTitle
              )}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {d.customerName}
              {d.city ? `, ${d.city}` : ""}
              {d.deliveredOn ? ` · ${formatDay(d.deliveredOn)}` : ""}
            </p>
            {d.quote && (
              <blockquote className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink-soft">
                „{d.quote}“
              </blockquote>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
