import Form from "next/form";
import Link from "next/link";
import type { FilterOptions } from "@/lib/types";
import { BasicSearchFields } from "./search-fields";

/** The home page's quick search: the catalog's short search, opening /cars with the choices in the URL. */
export function QuickSearch({ options }: { options: FilterOptions }) {
  return (
    <Form action="/cars" className="space-y-4 rounded-3xl bg-card p-5 text-ink shadow-2xl sm:p-6">
      <p className="text-xl font-extrabold tracking-tight">Бързо търсене</p>
      <BasicSearchFields options={options} idPrefix="qs" />
      <button type="submit" className="btn-accent w-full py-3! text-base!">
        Търсене →
      </button>
      <Link href="/cars?more=1" className="block text-center text-sm font-semibold text-accent hover:underline">
        Разширено търсене
      </Link>
    </Form>
  );
}

export function QuickSearchSkeleton() {
  return <div className="h-[470px] animate-pulse rounded-3xl bg-card/10" aria-hidden />;
}
