"use client";

import { useParams } from "next/navigation";
import { OrderEditor } from "@/components/admin/order-editor";

export default function OrderPage() {
  const id = Number(useParams<{ id: string }>().id);
  return <OrderEditor key={id} orderId={id} initialCarId={null} />;
}
