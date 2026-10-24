"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "./admin-context";

const links: [string, string][] = [
  ["/admin", "Коли и импорт"],
  ["/admin/pricing", "Цени"],
  ["/admin/templates", "Шаблони"],
  ["/admin/scheduled", "Насрочени"],
  ["/admin/inquiries", "Запитвания"],
  ["/admin/reports", "Отчет"],
  ["/admin/delivered", "Доставени"],
  ["/admin/users", "Потребители"],
  ["/admin/account", "Профил"],
];

export function AdminNav() {
  const { username, logout } = useAdmin();
  const pathname = usePathname();
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
