// Business details shown on the site and in generated texts. Override with NEXT_PUBLIC_* variables.

export const site = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Premium Cars Import",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "0878131990",
  viberLink: process.env.NEXT_PUBLIC_VIBER_LINK ?? "https://tinyurl.com/4h6fhyd3",
  office: "София",
};

/** "0878131990" -> "tel:+359878131990" */
export function phoneHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits.startsWith("0") ? `+359${digits.slice(1)}` : digits}`;
}

/** "Why us" points used on car pages and in social posts (same wording as the posting script). */
export const whyUs: { icon: string; text: string }[] = [
  { icon: "🥇", text: "На всеки подбран от нас автомобил е направена пълна техническа инспекция на място." },
  { icon: "💯", text: "Всички автомобили са с реален пробег!" },
  {
    icon: "🥇",
    text: "Пълна прозрачност: постоянна комуникация и визуален контрол (снимки и видео) от натоварването до пристигането на Вашия автомобил",
  },
  { icon: "🥇", text: "Без посредници - работим директно с продавача като предлагаме ниски цени" },
  { icon: "🥇", text: "Включен технотест в цената! Без излишно чакане след пристигането в България" },
  { icon: "📄", text: "Съдействие за изваждане на транзитни номера." },
];
