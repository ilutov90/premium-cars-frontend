import Link from "next/link";

/** "← Назад · Страница 2 от 5 · Напред →" for a public list; `href(p)` gives the address of the 0-based page p. */
export function PageLinks({ page, totalPages, href }: { page: number; totalPages: number; href: (p: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Страници">
      {page > 0 && (
        <Link href={href(page - 1)} className="btn-ghost">
          ← Назад
        </Link>
      )}
      <span className="px-3 text-sm text-muted">
        Страница {page + 1} от {totalPages}
      </span>
      {page + 1 < totalPages && (
        <Link href={href(page + 1)} className="btn-ghost">
          Напред →
        </Link>
      )}
    </nav>
  );
}
