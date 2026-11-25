import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InquiryForm } from "@/components/inquiry-form";
import { getCar } from "@/lib/api";

export const metadata: Metadata = {
  title: "Запитване",
  description:
    "Изпратете ни запитване за кола от Южна Корея, Китай или Канада: марка, модел, година и телефон – ще ви се обадим с оферти с крайна цена в България.",
  alternates: { canonical: "/zapitvane" },
};

/**
 * The inquiry form's own page: every "Запитване" link leads here (the form is on no other page, so an in-app
 * browser cannot jump to it from a landing page). `?kola={slug}` asks about that car; `?make=` / `?model=` prefill
 * the general form (the landing pages).
 */
export default function InquiryPage({ searchParams }: PageProps<"/zapitvane">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <Suspense fallback={<InquiryBlock />}>
        <InquiryFromParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function InquiryFromParams({
  searchParams,
}: {
  searchParams: PageProps<"/zapitvane">["searchParams"];
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const slug = one(params.kola);
  const car = slug ? await getCar(slug).catch(() => null) : null;
  return (
    <InquiryBlock
      car={
        car ? { id: car.id, slug: car.slug, title: car.specs.title } : undefined
      }
      make={one(params.make)}
      model={one(params.model)}
    />
  );
}

function InquiryBlock({
  car,
  make,
  model,
}: {
  car?: { id: number; slug: string; title: string };
  make?: string;
  model?: string;
}) {
  return (
    <div className="grid gap-10 rounded-3xl bg-card p-6 ring-1 ring-line sm:p-10 md:grid-cols-2">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {car ? "Запитване за кола" : "Изпратете ни запитване"}
        </h1>
        {car ? (
          <p className="mt-3 leading-relaxed text-muted">
            <Link
              href={`/cars/${car.slug}`}
              className="font-semibold text-ink underline underline-offset-2"
            >
              {car.title}
            </Link>{" "}
            (Обява № {car.id}). Оставете телефон и въпроса си — ще ви се обадим.
            Или ни пишете направо във Viber.
          </p>
        ) : (
          <p className="mt-3 leading-relaxed text-muted">
            Изберете желания от вас автомобил и наш служител ще ви се обади с
            готови предложения!
          </p>
        )}
      </div>
      {car ? (
        <InquiryForm key={car.id} carId={car.id} carTitle={car.title} />
      ) : (
        <InquiryForm key={`${make}|${model}`} make={make} model={model} />
      )}
    </div>
  );
}
