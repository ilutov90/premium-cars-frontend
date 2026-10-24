import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { searchCars } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";
import type { CarSummary } from "@/lib/types";

const PAGE_SIZE = 48; // the backend's maximum
const MAX_PAGES = 50;

/** Built on every request: the published (and reserved) cars change all the time. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/cars`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/koli-na-gaz-ot-koreya`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/elektromobili-ot-kitay`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/delivered`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];
  return [...pages, ...(await carEntries())];
}

async function carEntries(): Promise<MetadataRoute.Sitemap> {
  const cars: CarSummary[] = [];
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await searchCars({ page: String(page) }, PAGE_SIZE);
      cars.push(...result.items);
      if (page + 1 >= result.totalPages) break;
    }
  } catch {
    // backend down: the static pages are still worth listing
  }
  return cars.map((c) => ({
    url: `${SITE_URL}/cars/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
    images: c.coverImageUrl ? [c.coverImageUrl.startsWith("http") ? c.coverImageUrl : `${SITE_URL}${c.coverImageUrl}`] : undefined,
  }));
}
