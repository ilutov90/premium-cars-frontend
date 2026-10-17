import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCar } from "@/lib/api";
import { formatKm, fuelLabels, originLabels, transmissionLabels } from "@/lib/format";
import { CarGallery } from "@/components/car-gallery";
import { InquiryForm } from "@/components/inquiry-form";
import { PriceBreakdownCard } from "@/components/price-breakdown";

export async function generateMetadata({ params }: PageProps<"/cars/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const car = await getCar(slug).catch(() => null);
  if (!car) return { title: "Колата не е намерена" };
  return {
    title: car.title,
    description: `${car.title}${car.year ? `, ${car.year}` : ""} — внос от ${
      car.origin ? originLabels[car.origin] : "Азия"
    } с крайна цена в България.`,
    openGraph: { images: car.imageUrls.slice(0, 1) },
  };
}

export default function CarPage({ params }: PageProps<"/cars/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <Link href="/cars" className="text-sm font-semibold text-muted hover:text-ink">
        ← Към каталога
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <CarDetailView params={params} />
      </Suspense>
    </div>
  );
}

async function CarDetailView({ params }: { params: PageProps<"/cars/[slug]">["params"] }) {
  const { slug } = await params;
  const car = await getCar(slug);
  if (!car) notFound();

  const facts: [string, string | null][] = [
    ["Година", car.year?.toString() ?? null],
    ["Пробег", car.mileageKm != null ? formatKm(car.mileageKm) : null],
    ["Гориво", car.fuelType ? fuelLabels[car.fuelType] : null],
    ["Скоростна кутия", car.transmission ? transmissionLabels[car.transmission] : null],
    ["Двигател", car.engine],
    ["Мощност", car.powerHp ? `${car.powerHp} к.с.` : null],
    ["Купе", car.bodyType],
    ["Цвят", car.color],
    ["Произход", car.origin ? originLabels[car.origin] : null],
  ];
  const specs = Object.entries(car.specs ?? {});

  return (
    <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        <CarGallery images={car.imageUrls} title={car.title} />

        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            {car.status === "RESERVED" && (
              <span className="rounded-full bg-warn px-3 py-1 text-xs font-bold text-white uppercase">Резервирана</span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{car.title}</h1>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {facts
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="bg-card p-4">
                <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</dt>
                <dd className="mt-1 font-bold">{value}</dd>
              </div>
            ))}
        </dl>

        {car.description && (
          <section className="mt-10">
            <h2 className="text-xl font-extrabold">Описание</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-soft">{car.description}</p>
          </section>
        )}

        {specs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-extrabold">Характеристики</h2>
            <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
              {specs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 px-4 py-3 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <PriceBreakdownCard price={car.price} />
        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="mb-4 text-lg font-bold">Интересувате се?</p>
          <InquiryForm carId={car.id} carTitle={car.title} />
        </div>
      </aside>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="aspect-[4/3] animate-pulse rounded-2xl bg-line/60" />
      <div className="h-80 animate-pulse rounded-2xl bg-line/50" />
    </div>
  );
}
