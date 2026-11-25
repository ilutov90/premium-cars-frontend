import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getFilterOptions, SEARCH_KEYS, searchCars, toQuery, type CarSearch } from "@/lib/api";
import { CarCard } from "@/components/car-card";
import { ScrollToResults } from "@/components/scroll-to-results";
import { CatalogFilters } from "@/components/catalog-filters";
import { CardGridSkeleton, Notice } from "@/components/notice";
import { PageLinks } from "@/components/page-links";
import { seoPathOf } from "@/lib/seo-pages";

/**
 * Plain catalog: canonical /cars. Pagination of the unfiltered list keeps its own canonical (/cars?page=N, indexable).
 * Any filter or sort parameter: canonical /cars, noindex but links still followed, so filtered pages do not compete.
 * Only a make (and model): noindex too, canonical its landing page /koli/{make}[/{model}].
 */
export async function generateMetadata({ searchParams }: PageProps<"/cars">): Promise<Metadata> {
  const raw = await searchParams;
  const value = (key: string) => {
    const v = raw[key];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const filtered = SEARCH_KEYS.some((key) => key !== "page" && value(key) !== "");
  const page = /^\d{1,4}$/.test(value("page")) ? Number(value("page")) : 0;
  // only a make (and model) and nothing else: the make's / model's landing page is the page to index
  const onlyMake =
    value("make") !== "" && SEARCH_KEYS.every((key) => key === "make" || key === "model" || value(key) === "");
  const landing = onlyMake ? seoPathOf(value("make"), value("model") || undefined) : null;
  const canonical = landing ?? (!filtered && page > 0 ? `/cars?page=${page}` : "/cars");
  return {
    title: "Каталог",
    description: "Налични автомобили от Южна Корея и Китай с крайна цена в България.",
    alternates: { canonical },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

/** "" = the default: the cheapest first */
const sorts: [string, string][] = [
  ["", "Цена ↑"],
  ["newest", "Най-нови"],
  ["price_desc", "Цена ↓"],
  ["year_desc", "Година ↓"],
  ["mileage_asc", "Пробег ↑"],
];

export default function CatalogPage({ searchParams }: PageProps<"/cars">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Каталог автомобили</h1>
      <p className="mt-2 text-muted">
        Всички цени са крайни за България — с транспорт, мито и ДДС.{" "}
        <Link href="/koli" className="font-semibold text-accent hover:text-accent-dark">
          Всички марки
        </Link>
      </p>
      {/* searchParams is request data: everything that reads it streams in at request time */}
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Catalog({ searchParams }: { searchParams: PageProps<"/cars">["searchParams"] }) {
  const raw = await searchParams;
  const current: CarSearch = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );

  // the catalog shows the cheapest first unless another order is chosen
  const result = await Promise.all([searchCars({ ...current, sort: current.sort || "price_asc" }), getFilterOptions()]).then(
    ([page, options]) => ({ page, options, error: null }),
    (e: unknown) => ({ page: null, options: null, error: e instanceof Error ? e.message : "Грешка" }),
  );
  const { page, options } = result;

  let content: React.ReactNode;
  if (!page) {
    content = <Notice title="Каталогът временно не е достъпен">{result.error}</Notice>;
  } else if (page.items.length === 0) {
    content = (
      <Notice title="Няма коли по тези критерии">
        Променете филтрите или{" "}
        <Link href="/zapitvane" className="font-semibold text-accent">
          ни кажете какво търсите
        </Link>
        .
      </Notice>
    );
  } else {
    content = (
      <>
        <ResultsBar total={page.totalItems} current={current} />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {page.items.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
        <Pagination page={page.page} totalPages={page.totalPages} current={current} />
      </>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside>
        {options && <CatalogFilters options={options} current={current} key={toQuery(current)} />}
      </aside>
      <section>
        <ScrollToResults key={toQuery(current)} active={searched(current)} />
        {content}
      </section>
    </div>
  );
}

/** A search was made (filters, sort or page), not just the catalog opened ("more" only opens the extra filters). */
function searched(current: CarSearch): boolean {
  return Object.entries(current).some(([k, v]) => k !== "more" && v != null && v !== "");
}

function ResultsBar({ total, current }: { total: number; current: CarSearch }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        <span className="font-bold text-ink">{total}</span> {total === 1 ? "кола" : "коли"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sorts.map(([value, label]) => {
          const active = (current.sort ?? "") === value;
          return (
            <Link
              key={value}
              href={`/cars${toQuery({ ...current, sort: value || undefined, page: undefined })}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active ? "bg-ink text-paper" : "bg-card text-ink ring-1 ring-line hover:ring-ink"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, current }: { page: number; totalPages: number; current: CarSearch }) {
  const href = (p: number) => `/cars${toQuery({ ...current, page: p === 0 ? undefined : String(p) })}`;
  return <PageLinks page={page} totalPages={totalPages} href={href} />;
}

function CatalogSkeleton() {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
      <div className="hidden h-[560px] animate-pulse rounded-2xl bg-line/50 lg:block" />
      <CardGridSkeleton />
    </div>
  );
}
