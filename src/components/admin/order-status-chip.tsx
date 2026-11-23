import { orderStatusLabels } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

const tone: Record<OrderStatus, string> = {
  LEAD: "bg-accent/15 text-accent-dark",
  CONTRACT_SIGNED: "bg-warn/15 text-warn",
  PAID: "bg-ok/15 text-ok",
  SHIPPED: "bg-ink/10 text-ink",
  ARRIVED: "bg-ink/10 text-ink",
  DELIVERED: "bg-ink text-paper",
  CANCELLED: "bg-line text-muted",
};

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${tone[status]}`}>
      {orderStatusLabels[status]}
    </span>
  );
}
