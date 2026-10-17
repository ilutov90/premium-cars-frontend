import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-sm font-extrabold text-paper">
            PC
          </span>
          <span className="text-[15px] leading-tight font-bold tracking-tight">
            Premium Cars
            <span className="block text-[11px] font-medium tracking-[0.18em] text-muted uppercase">Import</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
          <Link href="/cars" className="rounded-full px-3 py-2 hover:bg-ink/5">
            Каталог
          </Link>
          <Link href="/#how" className="hidden rounded-full px-3 py-2 hover:bg-ink/5 sm:inline-flex">
            Как работи
          </Link>
          <Link href="/#contact" className="btn-primary ml-1 px-4! py-2!">
            Запитване
          </Link>
        </nav>
      </div>
    </header>
  );
}
