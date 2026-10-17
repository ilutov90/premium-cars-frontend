import { Suspense } from "react";
import { CarEditor } from "@/components/admin/car-editor";

export default function AdminCarPage({ params }: PageProps<"/admin/cars/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Зареждане…</p>}>
      <CarEditor params={params} />
    </Suspense>
  );
}
