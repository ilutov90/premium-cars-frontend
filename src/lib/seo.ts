// Server-only helpers for search engines and link previews (Facebook, Viber, Google).
import { fuelLabels, transmissionLabels } from "./format";
import { company, site } from "./site";
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

/** JSON for a <script type="application/ld+json">: "<" escaped so the text can never close the tag. */
export const jsonLdScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
