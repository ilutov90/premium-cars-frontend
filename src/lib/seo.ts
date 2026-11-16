// Server-only helpers for search engines and link previews (Facebook, Viber, Google).
import { fuelLabels, transmissionLabels } from "./format";
import { company, phoneHref, site, type Contact } from "./site";
import type { CarDetail } from "./types";

/** The public address of the site (build time in Docker: https://premiumcarsimport.bg). */
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path}`);

/** schema.org data of a car (Google rich results): https://schema.org/Car with its offer in EUR. */
export function carJsonLd(car: CarDetail): Record<string, unknown> {
  const s = car.specs;
  const url = absoluteUrl(`/cars/${car.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: s.title,
    url,
    image: car.imageUrls.slice(0, 10).map(absoluteUrl),
    brand: s.make ? { "@type": "Brand", name: s.make } : undefined,
    model: s.model ?? undefined,
    vehicleConfiguration: s.trim ?? undefined,
    vehicleModelDate: s.year?.toString(),
    mileageFromOdometer:
      s.mileageKm != null ? { "@type": "QuantitativeValue", value: s.mileageKm, unitCode: "KMT" } : undefined,
    fuelType: s.fuelType ? fuelLabels[s.fuelType] : undefined,
    vehicleTransmission: s.transmission ? transmissionLabels[s.transmission] : undefined,
    bodyType: s.bodyType ?? undefined,
    color: s.color ?? undefined,
    seatingCapacity: s.seats ?? undefined,
    numberOfDoors: s.doors ?? undefined,
    itemCondition: "https://schema.org/UsedCondition",
    offers:
      car.priceEur != null
        ? {
            "@type": "Offer",
            url,
            price: Math.round(car.priceEur),
            priceCurrency: "EUR",
            availability: car.status === "RESERVED" ? "https://schema.org/Reserved" : "https://schema.org/InStock",
            seller: { "@type": "AutoDealer", name: site.brandName, legalName: company.name, url: SITE_URL },
          }
        : undefined,
  };
}

/** Home page: the business (schema.org AutoDealer) and the site (WebSite). Only details that exist are included. */
export function homeJsonLd(contact: Contact, logoUrl: string | null): Record<string, unknown>[] {
  const city = /^гр\.\s*София,\s*/.exec(company.address);
  const country = company.country === "България" ? "BG" : undefined;
  return [
    {
      "@context": "https://schema.org",
      "@type": "AutoDealer",
      name: site.brandName,
      legalName: company.name,
      url: SITE_URL,
      logo: logoUrl ? absoluteUrl(logoUrl) : undefined,
      telephone: phoneHref(contact.phone).slice("tel:".length),
      address: {
        "@type": "PostalAddress",
        streetAddress: city ? company.address.slice(city[0].length) : company.address,
        addressLocality: city ? "София" : undefined,
        addressCountry: country,
      },
      areaServed: "BG",
      // the only profile link we have is the Viber channel
      sameAs: /^https?:\/\//.test(contact.viberLink) ? [contact.viberLink] : undefined,
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: site.brandName, url: SITE_URL },
  ];
}

/** Car page breadcrumbs: Начало -> Каталог автомобили -> make (a catalog filter) -> the car. */
export function carBreadcrumbJsonLd(car: CarDetail): Record<string, unknown> {
  const s = car.specs;
  const trail: [string, string][] = [
    ["Начало", absoluteUrl("/")],
    ["Каталог автомобили", absoluteUrl("/cars")],
  ];
  if (s.make) trail.push([s.make, absoluteUrl(`/cars?make=${encodeURIComponent(s.make)}`)]);
  trail.push([s.title, absoluteUrl(`/cars/${car.slug}`)]);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
  };
}

/** JSON for a <script type="application/ld+json">: "<" escaped so the text can never close the tag. */
export const jsonLdScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
