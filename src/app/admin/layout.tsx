import type { Metadata } from "next";
import { AdminProvider } from "@/components/admin/admin-context";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: "Админ",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminProvider>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <AdminNav />
        {children}
      </div>
    </AdminProvider>
  );
}
