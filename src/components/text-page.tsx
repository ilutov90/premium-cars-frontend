import type { ReactNode } from "react";

/** Text pages ("За нас", privacy policy): a readable column with styled headings, lists and links. */
export function TextPage({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {lead && <p className="mt-3 text-lg leading-relaxed text-muted">{lead}</p>}
      <div className="mt-8 space-y-4 leading-relaxed text-ink-soft [&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-ink [&_li]:pl-1 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">
        {children}
      </div>
    </article>
  );
}

/** Label / value rows, e.g. the company details. */
export function DetailsCard({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <dl className="divide-y divide-line rounded-2xl border border-line bg-card">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5 px-4 py-3 text-sm sm:flex-row sm:justify-between sm:gap-6">
          <dt className="text-muted">{label}</dt>
          <dd className="font-semibold text-ink sm:text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
