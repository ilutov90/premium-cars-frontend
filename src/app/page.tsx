import Link from "next/link";
import { Suspense } from "react";
import { getContact, getDeliveredCars, getFilterOptions, searchCars } from "@/lib/api";
import { contactDetails, phoneHref, viberChatHref, type Contact } from "@/lib/site";
import { PhoneIcon, ViberIcon } from "@/components/icons";
import { DeliveredCarCards } from "@/components/delivered-cars";
import { CarCard } from "@/components/car-card";
import { CardGridSkeleton, Notice } from "@/components/notice";
import { ImportStepsCompact } from "@/components/import-steps";
import { InquiryForm } from "@/components/inquiry-form";
import { QuickSearch, QuickSearchSkeleton } from "@/components/quick-search";

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
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_400px]">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-accent uppercase">Южна Корея · Китай → България</p>
            <h1 className="mt-4 max-w-3xl text-3xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">
              Твоят следващ автомобил с до 40% по-добра цена – директно от Азия!
            </h1>
            <p className="mt-3 text-lg font-bold sm:text-xl">Внос на автомобили от Южна Корея и Китай.</p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-paper/70 sm:text-lg">
              Избери автомобил от Южна Корея или Китай и виж крайната му цена до България – с включени транспорт, мито и
              ДДС.
            </p>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-paper/70 sm:text-lg">
              Ние организираме проверката, покупката, транспорта и документите, както и осигуряваме технотест. Без
              излишни усложнения и с ясни условия още преди поръчката. Получаваш готов автомобил за регистрация в
              България.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/cars" className="btn-accent px-6! py-3! text-base!">
                Разгледай каталога с автомобили
              </Link>
              <Link
                href="/#contact"
                className="btn border border-paper/25 px-6! py-3! text-base! text-paper hover:border-paper"
              >
                Изпрати ни запитване
              </Link>
            </div>
          </div>
          <Suspense fallback={<QuickSearchSkeleton />}>
            <HomeSearch />
          </Suspense>
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
        <Suspense fallback={<ContactButtons contact={contactDetails(null)} />}>
          <SavedContactButtons />
        </Suspense>
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
        <div className="mt-8">
          <ImportStepsCompact />
        </div>
        <p className="mt-6">
          <Link href="/kak-raboti-vnosat" className="text-sm font-semibold text-accent hover:text-accent-dark">
            Виж подробно всяка стъпка →
          </Link>
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-24 sm:px-6">
        <div className="grid gap-10 rounded-3xl bg-card p-6 ring-1 ring-line sm:p-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Не намирате вашата кола?</h2>
            <p className="mt-3 leading-relaxed text-muted">
              Изберете марка, модел и година и оставете телефон — ще намерим подходящи коли в Корея и Китай и ще ви
              се обадим с оферти с крайна цена. Или ни пишете направо във Viber.
            </p>
          </div>
          <InquiryForm />
        </div>
      </section>
    </>
  );
}

async function SavedContactButtons() {
  const saved = await getContact();
  return <ContactButtons contact={contactDetails(saved)} />;
}

function ContactButtons({ contact }: { contact: Contact }) {
  return (
    <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
      <a href={phoneHref(contact.phone)} className="btn-accent justify-center gap-2 px-6! py-3! text-base!">
        <PhoneIcon /> Свържи се с нас: {contact.phone}
      </a>
      <a
        href={viberChatHref(contact.phone)}
        className="btn justify-center gap-2 bg-[#7360f2] px-6! py-3! text-base! text-white hover:bg-[#5e4bd8]"
      >
        <ViberIcon /> Пиши ни във Viber
      </a>
    </div>
  );
}

async function HomeSearch() {
  const options = await getFilterOptions().catch(() => null);
  return options ? <QuickSearch options={options} /> : null;
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
