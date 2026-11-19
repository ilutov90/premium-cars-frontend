import type { Metadata } from "next";
import { NichePage } from "@/components/niche-page";
import type { Origin } from "@/lib/types";

/** The origins this page lists; add "US" here (and to the backend's Origin) when cars from America arrive. */
const ORIGINS: Origin[] = ["CA"];

// DRAFT for the owner: the texts of this page are a first draft, to be replaced with the owner's own wording.
export const metadata: Metadata = {
  title: "Коли от Канада и Америка",
  description:
    "Автомобили от Канада и Америка — богат избор, оборудване по северноамерикански стандарти, проверка на историята, доставка до България и ясна крайна цена.",
  alternates: { canonical: "/koli-ot-kanada-i-amerika" },
};

export default function NorthAmericaPage() {
  return (
    <NichePage
      kicker="Канада и Америка → България"
      title="Защо да изберете автомобил от Канада или Америка?"
      tagline="Богат избор, добре оборудвани модели и ясна крайна цена до България!"
      intro={[
        "Северноамериканският пазар предлага голямо разнообразие от автомобили – от практични семейни модели до мощни SUV и пикапи, често с богато оборудване в стандартната комплектация.",
        "Premium Cars Import ви съдейства при избора, проверката и доставката на автомобила до България.",
      ]}
      points={[
        ["Голям избор", "широка гама от марки и модели, много от които рядко се срещат на българския пазар."],
        ["Богато оборудване", "автомобилите често са с пълна комплектация и модерни системи за комфорт и безопасност."],
        ["Проверима история", "възможност за проверка на историята, пробега и регистрираните щети по номера на автомобила."],
        ["Ясна крайна цена", "цената включва транспорт, мито и ДДС, без скрити разходи."],
      ]}
      highlight="Попитайте ни за конкретен автомобил и ще изчислим крайната му цена до България!"
      closing="С Premium Cars Import получавате съдействие при избора, проверката и доставката на автомобила – с ясна крайна цена!"
      origin={ORIGINS[0]}
      searches={ORIGINS.map((origin) => ({ origin }))}
      catalogHref={`/cars?origin=${ORIGINS[0]}`}
      emptyText="В момента няма налични коли от Канада, но добавяме нови редовно."
      formTitle="Търсите кола от Канада или Америка?"
    />
  );
}
