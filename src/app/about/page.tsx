import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getContact } from "@/lib/api";
import { company, contactDetails, phoneHref, site, whyUs, type Contact } from "@/lib/site";
import { DetailsCard, TextPage } from "@/components/text-page";

export const metadata: Metadata = {
  title: "За нас",
  description: `${site.brandName} — внос на автомобили от Южна Корея и Китай до България. ${company.name}, ЕИК ${company.eik}.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <TextPage
      title="За нас"
      lead={`${site.brandName} внася автомобили от Южна Корея и Китай до България — с проверка на място, транспорт, митница и документи, на ясна крайна цена.`}
    >
      <h2>Какво правим</h2>
      <p>
        Подбираме коли от най-големите платформи в Южна Корея и Китай, проверяваме ги на място и ги докарваме до
        България. Цената, която виждате в сайта, е крайна: включва транспорта, митото, ДДС, карго застраховката и
        технотеста. Можете да изберете кола от <Link href="/cars">каталога</Link> или да ни кажете какво търсите
        и ние ще я намерим.
      </p>

      <h2>Защо да ни се доверите</h2>
      <ul>
        {whyUs.map((w) => (
          <li key={w.text}>{w.text}</li>
        ))}
      </ul>

      <h2>Фирмени данни</h2>
      <DetailsCard
        rows={[
          ["Фирма", company.name],
          ["ЕИК", company.eik],
          ["Седалище и адрес на управление", `${company.country}, ${company.address}`],
          ["Имейл", <a key="email" href={`mailto:${company.email}`}>{company.email}</a>],
        ]}
      />

      <h2>Контакти</h2>
      <Suspense fallback={<ContactRows contact={contactDetails(null)} />}>
        <SavedContact />
      </Suspense>
      <p>
        Или ни пишете през <Link href="/#contact">формата за запитване</Link>. Как използваме данните ви, е описано в{" "}
        <Link href="/privacy">Политиката за поверителност</Link>.
      </p>
    </TextPage>
  );
}

async function SavedContact() {
  return <ContactRows contact={contactDetails(await getContact())} />;
}

function ContactRows({ contact }: { contact: Contact }) {
  return (
    <DetailsCard
      rows={[
        ["Телефон (и Viber)", <a key="phone" href={phoneHref(contact.phone)}>{contact.phone}</a>],
        ["Офис", contact.office],
        [
          "Viber канал",
          <a key="viber" href={contact.viberLink} target="_blank" rel="noreferrer">
            Последвайте ни →
          </a>,
        ],
      ]}
    />
  );
}
