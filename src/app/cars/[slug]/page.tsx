import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCar } from "@/lib/api";
import { carJsonLd, jsonLdScript } from "@/lib/seo";
import { site } from "@/lib/site";
import {
  bodyTypeLabel,
  colorLabel,
  drivetrainLabels,
  formatKm,
  formatKwh,
  formatNumber,
  formatPower,
  formatRange,
  formatEur,
  formatYearMonth,
  fuelLabels,
  hasTractionBattery,
  originLabels,
  transmissionLabels,
} from "@/lib/format";
import { CarGallery } from "@/components/car-gallery";
import { ShareButtons } from "@/components/share-buttons";
import { InquiryForm } from "@/components/inquiry-form";
import { PriceCard } from "@/components/price-card";
import type { CarSpecs, Origin } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/cars/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const car = await getCar(slug).catch(() => null);
  if (!car) return { title: "Колата не е намерена", robots: { index: false } };
  const s = car.specs;
  const title = s.year && !s.title.includes(String(s.year)) ? `${s.title}, ${s.year}` : s.title;
  const facts = [
    s.mileageKm != null ? formatKm(s.mileageKm) : null,
    s.fuelType ? fuelLabels[s.fuelType] : null,
    s.transmission ? transmissionLabels[s.transmission] : null,
  ].filter(Boolean);
  const description = [
    car.priceEur != null ? `Крайна цена ${formatEur(car.priceEur)} с доставка до България.` : null,
    facts.length ? `${facts.join(" · ")}.` : null,
    `Внос от ${car.origin ? originLabels[car.origin] : "Азия"} с проверка, транспорт и документи.`,
  ]
    .filter(Boolean)
    .join(" ");
  const url = `/cars/${car.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // the first photos become the preview when the link is shared (absolute through metadataBase)
    openGraph: {
      type: "website",
      locale: "bg_BG",
      siteName: site.brandName,
      url,
      title,
      description,
      images: car.imageUrls.slice(0, 4).map((src) => ({ url: src, alt: s.title })),
    },
    twitter: { card: "summary_large_image" },
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

type Fact = [label: string, value: string | null | undefined];

/** The car's data in groups; empty values (and groups left empty) are not shown. */
function factGroups(s: CarSpecs, origin: Origin | null): { title: string; facts: Fact[] }[] {
  const electric = hasTractionBattery(s.fuelType);
  return [
    {
      title: "Основни данни",
      facts: [
        ["Година", s.year?.toString()],
        ["Първа регистрация", formatYearMonth(s.firstRegistration)],
        ["Пробег", s.mileageKm != null ? formatKm(s.mileageKm) : null],
        ["Произход", origin ? originLabels[origin] : null],
        ["Купе", bodyTypeLabel(s.bodyType)],
        ["Цвят", colorLabel(s.color)],
        ["Места", s.seats?.toString()],
        ["Врати", s.doors?.toString()],
      ],
    },
    {
      title: "Двигател и задвижване",
      facts: [
        ["Гориво", s.fuelType ? fuelLabels[s.fuelType] : null],
        ["Двигател", s.engineCc ? `${formatNumber(s.engineCc)} см³` : s.engine],
        ["Мощност", formatPower(s.powerHp, s.fuelType === "ELECTRIC" ? s.motorPowerKw : null)],
        ["Скоростна кутия", s.transmission ? transmissionLabels[s.transmission] : null],
        ["Задвижване", s.drivetrain ? drivetrainLabels[s.drivetrain] : null],
      ],
    },
    {
      title: "Електрическо задвижване",
      facts: [
        ["Батерия", s.batteryKwh != null ? formatKwh(s.batteryKwh) : null],
        ["Пробег на ток", formatRange(s.electricRangeKm, s.rangeStandard)],
        [
          "Електромотор(и)",
          electric && s.motorPowerKw != null && s.fuelType !== "ELECTRIC"
            ? `${formatNumber(s.motorPowerKw)} kW (${formatNumber(Math.round(s.motorPowerKw * 1.36))} к.с.)`
            : null,
        ],
      ],
    },
    {
      title: "Размери и тегло",
      facts: [
        ["Размери (Д × Ш × В)", s.dimensions ? `${s.dimensions} мм` : null],
        ["Тегло", s.curbWeightKg ? `${formatNumber(s.curbWeightKg)} кг` : null],
      ],
    },
  ]
    .map((g) => ({ ...g, facts: g.facts.filter(([, v]) => v) as Fact[] }))
    .filter((g) => g.facts.length > 0);
}

async function CarDetailView({ params }: { params: PageProps<"/cars/[slug]">["params"] }) {
  const { slug } = await params;
  const car = await getCar(slug);
  if (!car) notFound();
  const s = car.specs;
  const extra = Object.entries(s.extraSpecs ?? {});
  const evStats = hasTractionBattery(s.fuelType)
    ? ([
        ["Батерия", s.batteryKwh != null ? formatKwh(s.batteryKwh) : null],
        ["Пробег на ток", formatRange(s.electricRangeKm, s.rangeStandard)],
        [
          s.fuelType === "ELECTRIC" ? "Мощност" : "Електромотор",
          formatPower(s.fuelType === "ELECTRIC" ? s.powerHp : null, s.motorPowerKw),
        ],
      ].filter(([, v]) => v) as [string, string][])
    : [];

  return (
    <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_380px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(carJsonLd(car)) }} />
      <div className="min-w-0">
        <CarGallery images={car.imageUrls} title={s.title} />

        <div className="mt-8">
          {car.status === "RESERVED" && (
            <span className="rounded-full bg-warn px-3 py-1 text-xs font-bold text-white uppercase">Резервирана</span>
          )}
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{s.title}</h1>
          <div className="mt-4">
            <ShareButtons title={s.title} />
          </div>
        </div>

        {evStats.length > 0 && (
          <div
            className={`mt-6 grid gap-px overflow-hidden rounded-2xl bg-paper/10 ${
              evStats.length === 3 ? "sm:grid-cols-3" : evStats.length === 2 ? "sm:grid-cols-2" : ""
            }`}
          >
            {evStats.map(([label, value]) => (
              <div key={label} className="bg-ink p-4 text-paper">
                <p className="text-[11px] font-semibold tracking-wide text-paper/60 uppercase">⚡ {label}</p>
                <p className="mt-1 text-lg font-extrabold">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 space-y-8">
          {factGroups(s, car.origin).map((group) => (
            <section key={group.title}>
              <h2 className="text-lg font-extrabold">{group.title}</h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-card">
                {/* -mb-px hides the bottom border of the last row under the rounded frame */}
                <dl className="-mb-px grid sm:grid-cols-2">
                  {group.facts.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-4 border-b border-line px-4 py-3 text-sm sm:odd:border-r"
                    >
                      <dt className="text-muted">{label}</dt>
                      <dd className="text-right font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          ))}

          {extra.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold">Допълнителни характеристики</h2>
              <dl className="mt-3 divide-y divide-line rounded-2xl border border-line bg-card">
                {extra.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 px-4 py-3 text-sm">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {s.description && (
            <section>
              <h2 className="text-lg font-extrabold">Бележки</h2>
              <p className="mt-3 rounded-2xl border border-line bg-card p-4 leading-relaxed whitespace-pre-line text-ink-soft">
                {s.description}
              </p>
            </section>
          )}
        </div>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <PriceCard priceEur={car.priceEur} />
        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="mb-4 text-lg font-bold">Интересувате се?</p>
          <InquiryForm carId={car.id} carTitle={s.title} />
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
