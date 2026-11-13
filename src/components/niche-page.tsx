import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { CarCard } from "@/components/car-card";
import { InquiryForm } from "@/components/inquiry-form";
import { CardGridSkeleton, Notice } from "@/components/notice";
import { BasicSearchFields } from "@/components/search-fields";
import { getFilterOptions, searchCars, type CarSearch } from "@/lib/api";

/**
 * A landing page for one kind of car (ads and Google lead here): the pitch, a car search restricted to the page's
 * origin, the matching cars from the catalog and the inquiry form. Several searches are merged, newest first.
 */
export function NichePage({
  kicker,
  title,
  tagline,
  intro,
  points,
  highlight,
  closing,
  origin,
  searches,
  catalogHref,
  emptyText,
  formTitle,
}: {
  kicker: string;
  title: string;
  tagline: string;
  intro: string[];
  points: [string, string][];
  highlight: string;
  closing: string;
  origin: "KR" | "CN";
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
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-paper/70">{tagline}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <div className="max-w-3xl space-y-4 text-lg leading-relaxed">
          {intro.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {points.map(([t, text]) => (
            <li key={t} className="rounded-2xl border border-line bg-card p-5">
              <p className="font-bold">{t}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted first-letter:uppercase">{text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xl font-extrabold tracking-tight text-accent sm:text-2xl">{highlight}</p>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed">{closing}</p>
      </section>

      <section className="mx-auto max-w-xl px-4 pt-14 sm:px-6">
        <Suspense fallback={<div className="h-[470px] animate-pulse rounded-3xl bg-card" aria-hidden />}>
          <NicheSearch origin={origin} />
        </Suspense>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Последно добавени</h2>
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

/** The home page's quick search card, with the page's origin carried in the URL (QuickSearch itself has no such input). */
async function NicheSearch({ origin }: { origin: "KR" | "CN" }) {
  const options = await getFilterOptions().catch(() => null);
  if (!options) return null;
  return (
    <Form action="/cars" className="space-y-4 rounded-3xl bg-card p-5 text-ink shadow-xl ring-1 ring-line sm:p-6">
      <p className="text-xl font-extrabold tracking-tight">Бързо търсене</p>
      <input type="hidden" name="origin" value={origin} />
      <BasicSearchFields options={options} idPrefix="niche-qs" />
      <button type="submit" className="btn-accent w-full py-3! text-base!">
        Търсене →
      </button>
    </Form>
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
