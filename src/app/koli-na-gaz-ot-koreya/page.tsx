import type { Metadata } from "next";
import { NichePage } from "@/components/niche-page";

export const metadata: Metadata = {
  title: "Коли на газ (LPG) от Южна Корея",
  description:
    "Kia K5, Kia K8, Hyundai Sonata и Grandeur с фабрична газова система от Южна Корея — с проверка на място и крайна цена в България.",
  alternates: { canonical: "/koli-na-gaz-ot-koreya" },
};

export default function KoreaLpgPage() {
  return (
    <NichePage
      kicker="Южна Корея → България"
      title="Коли на газ (LPG) от Южна Корея"
      lead="В Корея седаните с фабрична газова система (LPI) са масови — Kia K5, Kia K8, Hyundai Sonata, Hyundai Grandeur. Внасяме ги до България с ясна крайна цена."
      points={[
        ["Фабрична газ", "Газовата система е заложена от производителя, а не монтирана допълнително след това."],
        ["Реален пробег", "Проверяваме пробега, историята и състоянието на колата на място преди покупка."],
        ["Крайна цена", "Транспорт, мито, ДДС, карго застраховка и технотест са включени в цената, която виждате."],
        ["Снимки и видео", "Получавате снимки и видео от натоварването до пристигането на колата в България."],
      ]}
      searches={[{ origin: "KR", fuelType: "LPG" }]}
      catalogHref="/cars?origin=KR&fuelType=LPG"
      emptyText="Всички коли на газ от последната партида са продадени, но намираме нови всяка седмица."
      formTitle="Търсите кола на газ?"
    />
  );
}
