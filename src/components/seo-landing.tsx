import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CarCard } from "@/components/car-card";
import { NicheContact } from "@/components/niche-page";
import { CardGridSkeleton, Notice } from "@/components/notice";
import { PageLinks } from "@/components/page-links";
import { getSeoPage, searchCars } from "@/lib/api";
import { formatEur } from "@/lib/format";
import { breadcrumbJsonLd, itemListJsonLd, jsonLdScript } from "@/lib/seo";
import { seoMakePath, seoModelPath, seoName, seoTexts } from "@/lib/seo-pages";
import { site } from "@/lib/site";
import type { SeoPage } from "@/lib/types";

/** Cars per page of a landing page. */
const PAGE_SIZE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
/** The route's slugs: /koli/[make] and /koli/[make]/[model]. */
type LandingParams = Promise<{ make: string; model?: string }>;

/** The 1-based page from `?page=`; anything else is page 1. */
function pageNumber(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && /^\d{1,4}$/.test(v) && Number(v) >= 1 ? Number(v) : 1;
}

const pathOf = (makeSlug: string, modelSlug?: string | null) =>
  modelSlug ? seoModelPath(makeSlug, modelSlug) : seoMakePath(makeSlug);

const withPage = (path: string, n: number) => (n > 1 ? `${path}?page=${n}` : path);

/**
 * Metadata of /koli/{make} and /koli/{make}/{model}: the admins' title / description or the automatic ones, a self
 * canonical (page 1 without `?page`, later pages with theirs) and the site's default preview image.
 */
export async function landingMetadata(params: LandingParams, searchParams: SearchParams): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug = null } = await params;
  const n = pageNumber((await searchParams).page);
  const canonical = withPage(pathOf(makeSlug, modelSlug), n);
  const page = await getSeoPage(makeSlug, modelSlug).catch(() => undefined);
  if (page === null) return { title: "Страницата не е намерена", robots: { index: false } };
  // backend down: the page shows a notice; the layout's title, no noindex (it is not gone)
  if (!page) return { alternates: { canonical } };
  const texts = seoTexts(page);
  const title = n > 1 ? `${texts.title}, страница ${n}` : texts.title;
  return {
    title,
    description: texts.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "bg_BG",
      siteName: site.brandName,
      url: canonical,
      title,
      description: texts.description,
      images: [{ url: "/og", width: 1200, height: 630, alt: site.brandName }],
    },
  };
}

/** A make's or model's landing page: heading, intro, the make's models, the cars (the cheapest first), the form. */
export function SeoLanding({ params, searchParams }: { params: LandingParams; searchParams: SearchParams }) {
  return (
    <Suspense fallback={<LandingSkeleton />}>
      <Landing params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Landing({ params, searchParams }: { params: LandingParams; searchParams: SearchParams }) {
  const { make: makeSlug, model: modelSlug = null } = await params;
  const n = pageNumber((await searchParams).page);
  const result = await getSeoPage(makeSlug, modelSlug).then(
    (page) => ({ page, error: null }),
    (e: unknown) => ({ page: undefined, error: e instanceof Error ? e.message : "Грешка" }),
  );
  if (result.page === null) notFound();
  const page = result.page;
  if (!page) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <Notice title="Страницата временно не е достъпна">{result.error}</Notice>
      </div>
    );
  }

  const texts = seoTexts(page);
  const name = seoName(page.make, page.model);
  const makePath = seoMakePath(page.makeSlug);
  const trail: [string, string][] = [
    ["Начало", "/"],
    ["Марки автомобили", "/koli"],
    [page.make, makePath],
  ];
  if (page.model && page.modelSlug) trail.push([page.model, seoModelPath(page.makeSlug, page.modelSlug)]);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(trail)) }} />
        <nav aria-label="Навигация" className="text-sm text-muted">
          {trail.slice(1, -1).map(([label, href]) => (
            <span key={href}>
              <Link href={href} className="hover:text-ink">
                {label}
              </Link>
              <span aria-hidden className="px-1.5">
                ›
              </span>
            </span>
          ))}
          <span className="text-ink">{trail[trail.length - 1][0]}</span>
        </nav>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{texts.heading}</h1>
        <div className="mt-4 max-w-3xl space-y-3 leading-relaxed text-ink-soft">
          {texts.paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>

        {page.models.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-extrabold">Модели {page.make}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {page.models.map((m) => (
                <li key={m.slug}>
                  <Link
                    href={seoModelPath(page.makeSlug, m.slug)}
                    className="inline-flex items-baseline gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-sm ring-1 ring-line hover:ring-ink"
                  >
                    <span className="font-semibold">{m.model}</span>
                    <span className="text-muted">
                      {m.count}
                      {m.minPriceEur != null && ` · от ${formatEur(m.minPriceEur)}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight">
              Налични {name}{" "}
              <span className="text-base font-semibold text-muted">
                ({page.count} {page.count === 1 ? "кола" : "коли"})
              </span>
            </h2>
            {page.model && (
              <Link href={makePath} className="text-sm font-semibold text-accent hover:text-accent-dark">
                Всички коли {page.make} →
              </Link>
            )}
          </div>
          <Suspense fallback={<CardGridSkeleton count={6} />}>
            <LandingCars page={page} n={n} />
          </Suspense>
        </section>
      </div>
      <NicheContact title={`Търсите ${name}?`} make={page.make} model={page.model ?? undefined} />
    </>
  );
}

async function LandingCars({ page, n }: { page: SeoPage; n: number }) {
  const repeated: Record<string, string[]> = { make: page.makeNames.length ? page.makeNames : [page.make] };
  if (page.model) repeated.model = page.modelNames.length ? page.modelNames : [page.model];
  const path = pathOf(page.makeSlug, page.modelSlug);
  const result = await searchCars({ sort: "price_asc", page: String(n - 1) }, PAGE_SIZE, repeated).then(
    (cars) => ({ cars, error: null }),
    (e: unknown) => ({ cars: null, error: e instanceof Error ? e.message : "Грешка" }),
  );
  if (!result.cars) return <Notice title="Каталогът временно не е достъпен">{result.error}</Notice>;
  const cars = result.cars;
  if (cars.items.length === 0) {
    return (
      <Notice title="Няма коли на тази страница">
        <Link href={path} className="font-semibold text-accent">
          Към първата страница
        </Link>
      </Notice>
    );
  }
  const list = itemListJsonLd(
    cars.items.map((c) => ({ name: c.title, path: `/cars/${c.slug}` })),
    cars.page * cars.size + 1,
  );
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(list) }} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cars.items.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
      <PageLinks page={cars.page} totalPages={cars.totalPages} href={(p) => withPage(path, p + 1)} />
    </>
  );
}

function LandingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="h-4 w-40 animate-pulse rounded bg-line/60" />
      <div className="mt-4 h-10 w-2/3 animate-pulse rounded bg-line/70" />
      <div className="mt-5 h-20 max-w-3xl animate-pulse rounded bg-line/50" />
      <div className="mt-10">
        <CardGridSkeleton count={6} />
      </div>
    </div>
  );
}
