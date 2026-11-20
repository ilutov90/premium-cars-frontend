"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OrderEditor } from "@/components/admin/order-editor";

function NewOrder() {
  const carId = Number(useSearchParams().get("carId"));
  return <OrderEditor orderId={null} initialCarId={Number.isInteger(carId) && carId > 0 ? carId : null} />;
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Зареждане…</p>}>
      <NewOrder />
    </Suspense>
  );
}
