"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { phoneHref, viberChatHref, type Contact } from "@/lib/site";
import { PhoneIcon, ViberIcon } from "./icons";

/** The site's pages, in the order of the menu. */
const pages: { href: string; label: string; desktop?: boolean }[] = [
  { href: "/", label: "Начало" },
  { href: "/cars", label: "Налични коли", desktop: true },
  { href: "/koli-na-gaz-ot-koreya", label: "Коли от Корея", desktop: true },
  { href: "/elektromobili-ot-kitay", label: "Коли от Китай", desktop: true },
  { href: "/delivered", label: "Доставени коли", desktop: true },
  { href: "/#how", label: "Как работи вносът" },
  { href: "/about", label: "За нас", desktop: true },
  { href: "/#contact", label: "Запитване" },
];

/** The header's links on a computer and the menu (☰) on a phone, with the phone number and Viber. */
export function SiteNav({ contact }: { contact: Contact }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <nav className="flex items-center gap-1 text-sm font-semibold">
        <div className="hidden items-center xl:flex">
          <Suspense fallback={<DesktopLinks active={null} />}>
            <DesktopLinksActive />
          </Suspense>
        </div>
        <a
          href={phoneHref(contact.phone)}
          className="hidden items-center gap-1.5 rounded-full px-3 py-2 hover:bg-ink/5 md:inline-flex"
        >
          <PhoneIcon className="h-4 w-4 text-accent" />
          {contact.phone}
        </a>
        <a
          href={phoneHref(contact.phone)}
          aria-label={`Обадете се: ${contact.phone}`}
          className="grid h-10 w-10 place-items-center rounded-full text-accent hover:bg-ink/5 md:hidden"
        >
          <PhoneIcon />
        </a>
        <a
          href={viberChatHref(contact.phone)}
          aria-label="Пишете ни във Viber"
          className="grid h-10 w-10 place-items-center rounded-full text-[#7360f2] hover:bg-ink/5"
        >
          <ViberIcon />
        </a>
        <Link href="/#contact" className="btn-primary ml-1 hidden px-4! py-2! sm:inline-flex">
          Запитване
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Затвори менюто" : "Отвори менюто"}
          className="ml-1 grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5 xl:hidden"
        >
          <span className="relative block h-4 w-6" aria-hidden>
            <span
              className={`absolute left-0 h-0.5 w-6 rounded bg-ink transition ${open ? "top-[7px] rotate-45" : "top-0"}`}
            />
            <span
              className={`absolute top-[7px] left-0 h-0.5 w-6 rounded bg-ink transition ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`absolute left-0 h-0.5 w-6 rounded bg-ink transition ${open ? "top-[7px] -rotate-45" : "top-[14px]"}`}
            />
          </span>
        </button>
      </nav>

      {/* in <body>: the header's backdrop blur would make it the box a fixed element is placed in */}
      {open &&
        createPortal(
          <div
            id="site-menu"
            className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-paper xl:hidden"
          >
            <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
              <Suspense fallback={<MenuLinks active={null} onPick={() => setOpen(false)} />}>
                <MenuLinksActive onPick={() => setOpen(false)} />
              </Suspense>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a href={phoneHref(contact.phone)} className="btn-accent gap-2 py-3! text-base!">
                  <PhoneIcon /> Обадете се: {contact.phone}
                </a>
                <a
                  href={viberChatHref(contact.phone)}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#7360f2] px-5 py-3 text-base font-semibold text-white hover:bg-[#5e4bd8]"
                >
                  <ViberIcon /> Пишете ни във Viber
                </a>
              </div>
              <p className="mt-5 text-center text-sm text-muted">Офис: {contact.office}</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** "/cars/x" belongs to "Налични коли"; "/#how" and "/#contact" are parts of the home page, never marked. */
function activeHref(pathname: string): string | null {
  const match = pages
    .filter((p) => !p.href.includes("#"))
    .filter((p) => (p.href === "/" ? pathname === "/" : pathname === p.href || pathname.startsWith(p.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href ?? null;
}

// usePathname may wait for the request on pages with dynamic params (Cache Components), hence the Suspense
// boundaries above with the same links unmarked as fallback.
function MenuLinksActive({ onPick }: { onPick: () => void }) {
  return <MenuLinks active={activeHref(usePathname())} onPick={onPick} />;
}

function DesktopLinksActive() {
  return <DesktopLinks active={activeHref(usePathname())} />;
}

function MenuLinks({ active, onPick }: { active: string | null; onPick: () => void }) {
  return (
    <ul className="divide-y divide-line">
      {pages.map((p) => (
        <li key={p.href}>
          <Link
            href={p.href}
            onClick={onPick}
            aria-current={p.href === active ? "page" : undefined}
            className={`block py-4 text-[15px] font-extrabold tracking-wide uppercase ${
              p.href === active ? "border-l-4 border-accent pl-4" : "hover:text-accent"
            }`}
          >
            {p.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DesktopLinks({ active }: { active: string | null }) {
  return (
    <>
      {pages
        .filter((p) => p.desktop)
        .map((p) => (
          <Link
            key={p.href}
            href={p.href}
            aria-current={p.href === active ? "page" : undefined}
            className={`rounded-full px-3 py-2 ${p.href === active ? "bg-ink/5 text-accent" : "hover:bg-ink/5"}`}
          >
            {p.label}
          </Link>
        ))}
    </>
  );
}
