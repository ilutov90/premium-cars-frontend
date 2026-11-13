import type { Metadata } from "next";
import Link from "next/link";
import { ImportSteps } from "@/components/import-steps";

export const metadata: Metadata = {
  title: "Как работи вносът",
  description:
    "Как внасяме автомобил от Южна Корея и Китай до България: избор, проверка, договор и плащане, транспорт, митница и регистрация – в шест ясни стъпки.",
  alternates: { canonical: "/kak-raboti-vnosat" },
};

export default function HowImportWorksPage() {
  return (
    <>
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-bold tracking-[0.25em] text-accent uppercase">Южна Корея · Китай → България</p>
          <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">
            Как работи вносът
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-paper/70">
            От избора на автомобил до регистрацията му в България – в шест ясни стъпки.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <ImportSteps />
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link href="/cars" className="btn-accent px-6! py-3! text-base!">
            Разгледай каталога с автомобили
          </Link>
          <Link href="/#contact" className="btn-ghost px-6! py-3! text-base!">
            Изпрати ни запитване
          </Link>
        </div>
      </section>
    </>
  );
}
