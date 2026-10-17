import Link from "next/link";

// Static footer: no current-year call here, because with Cache Components the shell is prerendered.
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-ink text-paper/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-paper">Premium Cars Import</p>
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
          {/* TODO: put your real phone, e-mail and Viber/WhatsApp links here */}
          <ul className="space-y-2">
            <li>Телефон: +359 000 000 000</li>
            <li>Имейл: office@example.bg</li>
            <li>София, България</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/10 py-5 text-center text-xs text-paper/50">
        Цените са ориентировъчни и се потвърждават преди покупка.
      </div>
    </footer>
  );
}
