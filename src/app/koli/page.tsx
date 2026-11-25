import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Notice } from "@/components/notice";
import { fetchSeoMakes } from "@/lib/api";
import { formatEur, originLabels } from "@/lib/format";
import { breadcrumbJsonLd, itemListJsonLd, jsonLdScript } from "@/lib/seo";
import { seoMakePath, seoModelPath } from "@/lib/seo-pages";
import { site } from "@/lib/site";

const description =
  "Марките автомобили от Южна Корея и Китай в каталога ни: колко коли има от всяка и от каква крайна цена в България, с включени транспорт, мито и ДДС.";

export const metadata: Metadata = {
  title: "Марки автомобили",
  description,
  alternates: { canonical: "/koli" },
  openGraph: {
    type: "website",
    locale: "bg_BG",
    siteName: site.brandName,
    url: "/koli",
    title: "Марки автомобили",
    description,
    images: [{ url: "/og", width: 1200, height: 630, alt: site.brandName }],
  },
};

/** The models shown under a make; the make's page has all of them. */
const MODELS_SHOWN = 5;

export default function MakesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Марки автомобили</h1>
      <p className="mt-2 max-w-3xl text-muted">
        Всички марки в каталога ни с броя на наличните коли и най-ниската цена. Цените са крайни за България — с
        транспорт, мито и ДДС.
      </p>
      <Suspense fallback={<MakesSkeleton />}>
        <Makes />
      </Suspense>
    </div>
  );
}

async function Makes() {
  const result = await fetchSeoMakes().then(
    (makes) => ({ makes, error: null }),
    (e: unknown) => ({ makes: null, error: e instanceof Error ? e.message : "Грешка" }),
  );
  if (!result.makes) {
    return (
      <div className="mt-8">
        <Notice title="Каталогът временно не е достъпен">{result.error}</Notice>
      </div>
    );
  }
  const makes = result.makes;
  if (makes.length === 0) {
    return (
      <div className="mt-8">
        <Notice title="В момента няма налични коли">
          <Link href="/zapitvane" className="font-semibold text-accent">
            Кажете ни какво търсите
          </Link>
          .
        </Notice>
      </div>
    );
  }
  const breadcrumb = breadcrumbJsonLd([
    ["Начало", "/"],
    ["Марки автомобили", "/koli"],
  ]);
  const list = itemListJsonLd(makes.map((m) => ({ name: m.make, path: seoMakePath(m.slug) })));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(list) }} />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {makes.map((m) => (
          <li key={m.slug} className="rounded-2xl border border-line bg-card p-5">
            <Link href={seoMakePath(m.slug)} className="group block">
              <span className="text-xl font-extrabold tracking-tight group-hover:text-accent">{m.make}</span>
              <span className="mt-1 block text-sm text-muted">
                {m.count} {m.count === 1 ? "кола" : "коли"}
                {m.minPriceEur != null && (
                  <>
                    {" · "}
                    <span className="font-semibold text-ink">от {formatEur(m.minPriceEur)}</span>
                  </>
                )}
                {m.origins.length > 0 && ` · ${m.origins.map((o) => originLabels[o]).join(", ")}`}
              </span>
            </Link>
            {m.models.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {m.models.slice(0, MODELS_SHOWN).map((model) => (
                  <li key={model.slug}>
                    <Link href={seoModelPath(m.slug, model.slug)} className="text-ink-soft hover:text-accent">
                      {model.model} <span className="text-muted">({model.count})</span>
                    </Link>
                  </li>
                ))}
                {m.models.length > MODELS_SHOWN && (
                  <li>
                    <Link href={seoMakePath(m.slug)} className="font-semibold text-accent hover:text-accent-dark">
                      още {m.models.length - MODELS_SHOWN} →
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function MakesSkeleton() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-line/50" />
      ))}
    </div>
  );
}
