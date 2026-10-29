import Link from "next/link";
import { Suspense } from "react";
import { CarCard } from "@/components/car-card";
import { InquiryForm } from "@/components/inquiry-form";
import { CardGridSkeleton, Notice } from "@/components/notice";
import { searchCars, type CarSearch } from "@/lib/api";

/**
 * A landing page for one kind of car (ads and Google lead here): what we offer, the matching cars from the catalog
 * and the inquiry form. Several searches are merged (e.g. electric + plug-in hybrid), newest first.
 */
export function NichePage({
  kicker,
  title,
  lead,
  points,
  searches,
  catalogHref,
  emptyText,
  formTitle,
}: {
  kicker: string;
  title: string;
  lead: string;
  points: [string, string][];
  searches: CarSearch[];
  catalogHref: string;
  emptyText: string;
  formTitle: string;
}) {
  return (
    <>
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-bold tracking-[0.25em] text-accent uppercase">{kicker}</p>
          <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-paper/70">{lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={catalogHref} className="btn-accent px-6! py-3! text-base!">
              Виж всички в каталога
            </Link>
            <Link href="#niche-contact" className="btn border border-paper/25 px-6! py-3! text-base! text-paper hover:border-paper">
              Намери ми такава кола
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {points.map(([t, text]) => (
            <li key={t} className="rounded-2xl border border-line bg-card p-5">
              <p className="font-bold">{t}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Налични сега</h2>
          <Link href={catalogHref} className="text-sm font-semibold text-accent hover:text-accent-dark">
            Всички →
          </Link>
        </div>
        <Suspense fallback={<CardGridSkeleton count={3} />}>
          <NicheCars searches={searches} emptyText={emptyText} />
        </Suspense>
      </section>

      <section id="niche-contact" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20 sm:px-6">
        <div className="grid gap-10 rounded-3xl bg-card p-6 ring-1 ring-line sm:p-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{formTitle}</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Изберете марка, модел и година и оставете телефон — ще ви се обадим с подходящи коли с крайна цена в
              България. Или ни пишете направо във Viber.
            </p>
          </div>
          <InquiryForm />
        </div>
      </section>
    </>
  );
}

async function NicheCars({ searches, emptyText }: { searches: CarSearch[]; emptyText: string }) {
  const result = await Promise.all(searches.map((s) => searchCars(s, 12))).then(
    (pages) => ({
      cars: pages
        .flatMap((p) => p.items)
        .sort((a, b) => b.id - a.id)
        .slice(0, 12),
      error: null,
    }),
    (e: unknown) => ({ cars: [], error: e instanceof Error ? e.message : "Грешка" }),
  );
  if (result.error) {
    return <Notice title="Каталогът временно не е достъпен">{result.error}</Notice>;
  }
  if (result.cars.length === 0) {
    return (
      <Notice title="В момента няма налични">
        {emptyText}{" "}
        <Link href="#niche-contact" className="font-semibold text-accent">
          Пишете ни
        </Link>
        .
      </Notice>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {result.cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  );
}
