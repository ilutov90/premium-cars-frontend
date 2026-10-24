import Link from "next/link";
import { Suspense } from "react";
import { getDeliveredCars, searchCars } from "@/lib/api";
import { DeliveredCarCards } from "@/components/delivered-cars";
import { CarCard } from "@/components/car-card";
import { CardGridSkeleton, Notice } from "@/components/notice";
import { InquiryForm } from "@/components/inquiry-form";

const steps = [
  ["Избор", "Избирате кола от каталога или ни казвате какво търсите."],
  ["Проверка", "Проверяваме историята, състоянието и документите преди покупка."],
  ["Договор и плащане", "Подписваме договор с ясна крайна цена и срокове."],
  ["Транспорт", "Колата пътува с кораб до Варна или Бургас."],
  ["Митница", "Обработваме митническите документи, мито и ДДС."],
  ["Регистрация", "Предаваме ви колата, готова за регистрация в България."],
];

const promises = [
  ["Крайна цена", "Виждате цената в България с транспорт, мито и ДДС — не само цената на място."],
  ["Проверени коли", "Работим с големите платформи в Корея и Китай и проверяваме всяка кола."],
  ["Един контакт", "Един човек води поръчката ви от избора до ключовете."],
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-accent/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-xs font-bold tracking-[0.25em] text-accent uppercase">Южна Корея · Китай → България</p>
          <h1 className="mt-5 max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
            Коли от Азия с ясна крайна цена.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/70">
            Избирате, ние проверяваме, купуваме, транспортираме и обработваме документите. Виждате колко ще платите в
            България още преди да ни се обадите.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/cars" className="btn-accent px-6! py-3! text-base!">
              Разгледай наличните коли
            </Link>
            <Link href="/#contact" className="btn border border-paper/25 px-6! py-3! text-base! text-paper hover:border-paper">
              Намери ми кола
            </Link>
          </div>
        </div>
      </section>

      {/* Promises */}
      <section className="mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
        <div className="relative grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {promises.map(([title, text]) => (
            <div key={title} className="bg-card p-6">
              <p className="font-bold">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest cars */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Последно добавени</h2>
          <Link href="/cars" className="text-sm font-semibold text-accent hover:text-accent-dark">
            Всички коли →
          </Link>
        </div>
        <Suspense fallback={<CardGridSkeleton count={3} />}>
          <LatestCars />
        </Suspense>
      </section>

      {/* Delivered cars: only once there are published ones */}
      <Suspense fallback={null}>
        <LatestDelivered />
      </Suspense>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-24 sm:px-6">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Как работи вносът</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-line bg-card p-5">
              <span className="text-sm font-extrabold text-accent">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-2 font-bold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-24 sm:px-6">
        <div className="grid gap-10 rounded-3xl bg-card p-6 ring-1 ring-line sm:p-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Не намирате вашата кола?</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Опишете какво търсите — марка, модел, година и бюджет. Ще намерим подходящи коли в Корея и Китай и ще
              ви изпратим оферти с крайна цена.
            </p>
          </div>
          <InquiryForm />
        </div>
      </section>
    </>
  );
}

async function LatestCars() {
  const result = await searchCars({}, 6).then(
    (page) => ({ cars: page.items, error: null }),
    (e: unknown) => ({ cars: [], error: e instanceof Error ? e.message : "Грешка" }),
  );
  if (result.error) {
    return <Notice title="Каталогът временно не е достъпен">{result.error}</Notice>;
  }
  if (result.cars.length === 0) {
    return <Notice title="Все още няма публикувани коли">Добавете първата от админ панела.</Notice>;
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {result.cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  );
}

async function LatestDelivered() {
  const items = await getDeliveredCars(3);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Доставени на клиенти</h2>
        <Link href="/delivered" className="text-sm font-semibold text-accent hover:text-accent-dark">
          Всички доставени →
        </Link>
      </div>
      <DeliveredCarCards items={items} />
    </section>
  );
}
