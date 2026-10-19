import type { Metadata } from "next";
import "@fontsource-variable/onest";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE_URL } from "@/lib/seo";
import { site } from "@/lib/site";

const description =
  "Внос на автомобили от Южна Корея и Китай с ясна крайна цена в България: транспорт, мито, ДДС и регистрация.";

export const metadata: Metadata = {
  // Absolute links for preview images (/media/...) when a page is shared
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.brandName} — коли от Корея и Китай`,
    template: `%s · ${site.brandName}`,
  },
  description,
  // Facebook / Viber / Messenger previews; car pages set their own title, text and photos
  openGraph: {
    type: "website",
    locale: "bg_BG",
    siteName: site.brandName,
    title: `${site.brandName} — коли от Корея и Китай`,
    description,
    images: [{ url: "/og", width: 1200, height: 630, alt: site.brandName }],
  },
  twitter: { card: "summary_large_image" },
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
