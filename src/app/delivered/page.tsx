import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DeliveredCarCards } from "@/components/delivered-cars";
import { CardGridSkeleton } from "@/components/notice";
import { getDeliveredCars } from "@/lib/api";

export const metadata: Metadata = {
  title: "Доставени коли",
  description: "Коли, които внесохме от Южна Корея и Китай и предадохме на клиенти в България — със снимки и отзиви.",
  alternates: { canonical: "/delivered" },
};

export default function DeliveredPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Доставени коли</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted">
        Коли, които внесохме и предадохме на клиенти в България. Снимките и думите са на самите клиенти,
        публикувани с тяхно съгласие.
      </p>
      <div className="mt-8">
        <Suspense fallback={<CardGridSkeleton count={3} />}>
          <AllDelivered />
        </Suspense>
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/cars" className="btn-accent">
          Разгледай наличните коли
        </Link>
        <Link href="/#contact" className="btn-ghost">
          Намери ми кола
        </Link>
      </div>
    </div>
  );
}

async function AllDelivered() {
  const items = await getDeliveredCars(50);
  if (items.length === 0) {
    return <p className="text-muted">Скоро тук ще покажем първите предадени коли.</p>;
  }
  return <DeliveredCarCards items={items} />;
}
