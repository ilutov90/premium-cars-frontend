import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getFilterOptions, searchCars, toQuery, type CarSearch } from "@/lib/api";
import { CarCard } from "@/components/car-card";
import { CatalogFilters } from "@/components/catalog-filters";
import { CardGridSkeleton, Notice } from "@/components/notice";

export const metadata: Metadata = {
  title: "Каталог",
  description: "Налични автомобили от Южна Корея и Китай с крайна цена в България.",
};

const sorts: [string, string][] = [
  ["", "Най-нови"],
  ["price_asc", "Цена ↑"],
  ["price_desc", "Цена ↓"],
  ["year_desc", "Година ↓"],
  ["mileage_asc", "Пробег ↑"],
];

export default function CatalogPage({ searchParams }: PageProps<"/cars">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Налични коли</h1>
      <p className="mt-2 text-muted">Всички цени са крайни за България — с транспорт, мито и ДДС.</p>
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

  const result = await Promise.all([searchCars(current), getFilterOptions()]).then(
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
        <Link href="/#contact" className="font-semibold text-accent">
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
      <section>{content}</section>
    </div>
  );
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
  if (totalPages <= 1) return null;
  const href = (p: number) => `/cars${toQuery({ ...current, page: p === 0 ? undefined : String(p) })}`;
  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Страници">
      {page > 0 && (
        <Link href={href(page - 1)} className="btn-ghost">
          ← Назад
        </Link>
      )}
      <span className="px-3 text-sm text-muted">
        Страница {page + 1} от {totalPages}
      </span>
      {page + 1 < totalPages && (
        <Link href={href(page + 1)} className="btn-ghost">
          Напред →
        </Link>
      )}
    </nav>
  );
}

function CatalogSkeleton() {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
      <div className="hidden h-[560px] animate-pulse rounded-2xl bg-line/50 lg:block" />
      <CardGridSkeleton />
    </div>
  );
}
