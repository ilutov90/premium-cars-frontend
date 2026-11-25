import Link from "next/link";

/** Where "Запитване" leads: the inquiry form's own page, about a car (its slug) or prefilled with a make / model. */
export function inquiryHref(q: { kola?: string; make?: string | null; model?: string | null } = {}): string {
  const p = new URLSearchParams();
  if (q.kola) p.set("kola", q.kola);
  if (q.make) p.set("make", q.make);
  if (q.model) p.set("model", q.model);
  const s = p.toString();
  return s ? `/zapitvane?${s}` : "/zapitvane";
}

/** The block that replaced the inquiry form on the pages: a pitch and a button to `/zapitvane`. */
export function InquiryCta({ id, title, text, href }: { id?: string; title: string; text: string; href: string }) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20 sm:px-6">
      <div className="flex flex-col gap-6 rounded-3xl bg-card p-6 ring-1 ring-line sm:p-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
          <p className="mt-3 leading-relaxed text-muted">{text}</p>
        </div>
        <Link href={href} className="btn-accent shrink-0 px-6! py-3! text-base!">
          Изпрати запитване
        </Link>
      </div>
    </section>
  );
}
