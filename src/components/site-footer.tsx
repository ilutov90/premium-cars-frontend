import Link from "next/link";
import { Suspense } from "react";
import { getContact } from "@/lib/api";
import { contactDetails, phoneHref, site, type Contact } from "@/lib/site";

// The shell is prerendered (Cache Components): the contact details saved in the admin panel stream in, and the
// defaults from site.ts show until then (or when the backend is down).
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-ink text-paper/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-paper">{site.brandName}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed">
            Внос на автомобили от Южна Корея и Китай до България — с проверка, транспорт и документи.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-paper">Навигация</p>
          <ul className="space-y-2">
            <li>
              <Link href="/cars" className="hover:text-paper">
                Каталог
              </Link>
            </li>
            <li>
              <Link href="/#how" className="hover:text-paper">
                Как работи вносът
              </Link>
            </li>
            <li>
              <Link href="/#contact" className="hover:text-paper">
                Намери ми кола
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-paper">Контакти</p>
          <Suspense fallback={<ContactList contact={contactDetails(null)} />}>
            <SavedContact />
          </Suspense>
        </div>
      </div>
      <div className="border-t border-paper/10 py-5 text-center text-xs text-paper/50">
        Цените са крайни: включват транспорта и всички разходи до България.
      </div>
    </footer>
  );
}

async function SavedContact() {
  return <ContactList contact={contactDetails(await getContact())} />;
}

function ContactList({ contact }: { contact: Contact }) {
  return (
    <ul className="space-y-2">
      <li>
        Телефон:{" "}
        <a href={phoneHref(contact.phone)} className="hover:text-paper">
          {contact.phone}
        </a>{" "}
        (и Viber)
      </li>
      <li>
        <a href={contact.viberLink} target="_blank" rel="noreferrer" className="hover:text-paper">
          Viber канал →
        </a>
      </li>
      <li>Офис {contact.office}, България</li>
    </ul>
  );
}
