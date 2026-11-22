"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdmin } from "./admin-context";

const links: [string, string][] = [
  ["/admin", "Коли и импорт"],
  ["/admin/auto-import", "Автоматичен импорт"],
  ["/admin/orders", "Поръчки"],
  ["/admin/pricing", "Цени"],
  ["/admin/templates", "Шаблони"],
  ["/admin/marketplace", "Модели в обявите"],
  ["/admin/scheduled", "Насрочени"],
  ["/admin/inquiries", "Запитвания"],
  ["/admin/reports", "Отчет"],
  ["/admin/removed", "Изчезнали обяви"],
  ["/admin/seo", "SEO страници"],
  ["/admin/delivered", "Доставени"],
  ["/admin/users", "Потребители"],
  ["/admin/account", "Профил"],
];

export function AdminNav() {
  const { username, logout, adminFetch } = useAdmin();
  const pathname = usePathname();
  const [due, setDue] = useState(0);

  useEffect(() => {
    adminFetch<{ due: number }>("/api/admin/orders/follow-ups")
      .then((r) => setDue(r.due))
      .catch(() => {});
  }, [adminFetch]);
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
      <nav className="flex flex-wrap gap-1">
        {links.map(([href, label]) => {
          const active = href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/cars") : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-ink text-paper" : "hover:bg-ink/5"}`}
            >
              {label}
              {href === "/admin/orders" && due > 0 && (
                <span
                  className="ml-1.5 inline-block min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] leading-5 font-bold text-paper"
                  title="Поръчки за контакт днес или просрочени"
                >
                  {due}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted">{username}</span>
        <button type="button" onClick={logout} className="btn-ghost px-4! py-1.5!">
          Изход
        </button>
      </div>
    </div>
  );
}
