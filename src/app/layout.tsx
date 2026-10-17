import type { Metadata } from "next";
import "@fontsource-variable/onest";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  // Absolute links for preview images (/media/...) when a page is shared
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Premium Cars Import — коли от Корея и Китай",
    template: "%s · Premium Cars Import",
  },
  description:
    "Внос на автомобили от Южна Корея и Китай с ясна крайна цена в България: транспорт, мито, ДДС и регистрация.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bg" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
