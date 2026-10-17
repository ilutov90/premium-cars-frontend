import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCar } from "@/lib/api";
import {
  bodyTypeLabel,
  colorLabel,
  drivetrainLabels,
  formatKm,
  formatKwh,
  formatNumber,
  formatPower,
  formatRange,
  formatYearMonth,
  fuelLabels,
  hasTractionBattery,
  originLabels,
  transmissionLabels,
} from "@/lib/format";
import { CarGallery } from "@/components/car-gallery";
import { CarDescription } from "@/components/car-description";
import { InquiryForm } from "@/components/inquiry-form";
import { PriceBreakdownCard } from "@/components/price-breakdown";
import type { CarSpecs } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/cars/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const car = await getCar(slug).catch(() => null);
  if (!car) return { title: "Колата не е намерена" };
  const s = car.specs;
  return {
    title: s.title,
    description: `${s.title}${s.year ? `, ${s.year}` : ""} — внос от ${
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

/** Label/value pairs of the facts grid; empty values are left out. */
function facts(s: CarSpecs): [string, string | null][] {
  return [
    ["Година", s.year?.toString() ?? null],
    ["Първа регистрация", formatYearMonth(s.firstRegistration)],
    ["Пробег", s.mileageKm != null ? formatKm(s.mileageKm) : null],
    ["Гориво", s.fuelType ? fuelLabels[s.fuelType] : null],
    ["Скоростна кутия", s.transmission ? transmissionLabels[s.transmission] : null],
    ["Задвижване", s.drivetrain ? drivetrainLabels[s.drivetrain] : null],
    ["Двигател", s.engineCc ? `${formatNumber(s.engineCc)} см³` : s.engine],
    ["Мощност", formatPower(s.powerHp, s.fuelType === "ELECTRIC" ? s.motorPowerKw : null)],
    ["Купе", bodyTypeLabel(s.bodyType)],
    ["Места", s.seats?.toString() ?? null],
    ["Врати", s.doors?.toString() ?? null],
    ["Цвят", colorLabel(s.color)],
    ["Тегло", s.curbWeightKg ? `${formatNumber(s.curbWeightKg)} кг` : null],
    ["Размери (Д × Ш × В)", s.dimensions ? `${s.dimensions} мм` : null],
  ];
}

async function CarDetailView({ params }: { params: PageProps<"/cars/[slug]">["params"] }) {
  const { slug } = await params;
  const car = await getCar(slug);
  if (!car) notFound();
  const s = car.specs;
  const extra = Object.entries(s.extraSpecs ?? {});
  const electric = hasTractionBattery(s.fuelType);

  return (
    <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        <CarGallery images={car.imageUrls} title={s.title} />

        <div className="mt-8">
          {car.status === "RESERVED" && (
            <span className="rounded-full bg-warn px-3 py-1 text-xs font-bold text-white uppercase">Резервирана</span>
          )}
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{s.title}</h1>
        </div>

        {electric && (s.batteryKwh != null || s.electricRangeKm != null || s.motorPowerKw != null) && (
          <div className="mt-6 grid gap-px overflow-hidden rounded-2xl bg-ink sm:grid-cols-3">
            <EvStat label="Батерия" value={s.batteryKwh != null ? formatKwh(s.batteryKwh) : null} />
            <EvStat label="Пробег на ток" value={formatRange(s.electricRangeKm, s.rangeStandard)} />
            <EvStat
              label={s.fuelType === "ELECTRIC" ? "Мощност" : "Електромотор"}
              value={formatPower(s.fuelType === "ELECTRIC" ? s.powerHp : null, s.motorPowerKw)}
            />
          </div>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {facts(s)
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="bg-card p-4">
                <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</dt>
                <dd className="mt-1 font-bold">{value}</dd>
              </div>
            ))}
        </dl>

        <CarDescription specs={s} origin={car.origin} priceEur={car.price?.totalEur ?? null} />

        {extra.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-extrabold">Допълнителни характеристики</h2>
            <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
              {extra.map(([k, v]) => (
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
          <InquiryForm carId={car.id} carTitle={s.title} />
        </div>
      </aside>
    </div>
  );
}

function EvStat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-ink p-4 text-paper">
      <p className="text-[11px] font-semibold tracking-wide text-paper/60 uppercase">⚡ {label}</p>
      <p className="mt-1 text-lg font-extrabold">{value ?? "—"}</p>
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
