import { statusLabels } from "@/lib/format";
import type { CarStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: CarStatus }) {
  const tone: Record<CarStatus, string> = {
    DRAFT: "bg-line text-ink",
    PUBLISHED: "bg-ok/15 text-ok",
    RESERVED: "bg-warn/15 text-warn",
    SOLD: "bg-ink text-paper",
    ARCHIVED: "bg-line/60 text-muted",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${tone[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
