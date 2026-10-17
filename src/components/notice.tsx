/** Friendly message for empty results or an unreachable backend. */
export function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card/60 p-8 text-center">
      <p className="font-bold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-card">
          <div className="aspect-[4/3] animate-pulse bg-line/60" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-line/70" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-line/60" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-line/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
