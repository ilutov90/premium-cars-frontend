// Sitemap XML (sitemaps.org + Google image extension). Built by hand: the car sitemaps have more than 50 000 URLs in
// total, so they are split into parts, listed by an index at /sitemap.xml.
import { fetchSeoMakes, getSitemapCars } from "./api";
import { seoMakePath, seoModelPath } from "./seo-pages";
import { absoluteUrl, SITE_URL } from "./seo";

/** Cars per part (the limit of one file is 50 000 URLs). */
export const CARS_PER_SITEMAP = 5000;

export const SITEMAP_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
};

export const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const pages: { path: string; changefreq: string; priority: number }[] = [
  { path: "/", changefreq: "daily", priority: 1 },
  { path: "/cars", changefreq: "daily", priority: 0.9 },
  { path: "/koli-ot-koreya", changefreq: "weekly", priority: 0.8 },
  { path: "/elektromobili-ot-kitay", changefreq: "weekly", priority: 0.8 },
  { path: "/kak-raboti-vnosat", changefreq: "monthly", priority: 0.6 },
  { path: "/delivered", changefreq: "weekly", priority: 0.6 },
  { path: "/about", changefreq: "yearly", priority: 0.3 },
  { path: "/privacy", changefreq: "yearly", priority: 0.1 },
];

const header = '<?xml version="1.0" encoding="UTF-8"?>\n';

export function pagesSitemapXml(): string {
  const urls = pages
    .map(
      (p) =>
        `<url><loc>${escapeXml(`${SITE_URL}${p.path === "/" ? "/" : p.path}`)}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
    )
    .join("\n");
  return `${header}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Part `index` (0-based) of the cars; throws when the backend cannot answer. */
export async function carsSitemapXml(index: number): Promise<string> {
  const { items } = await getSitemapCars(index, CARS_PER_SITEMAP);
  const urls = items
    .map((c) => {
      const lastmod = c.updatedAt && !Number.isNaN(Date.parse(c.updatedAt)) ? new Date(c.updatedAt).toISOString() : null;
      return (
        `<url><loc>${escapeXml(`${SITE_URL}/cars/${c.slug}`)}</loc>` +
        (lastmod ? `<lastmod>${lastmod}</lastmod>` : "") +
        (c.imageUrl ? `<image:image><image:loc>${escapeXml(absoluteUrl(c.imageUrl))}</image:loc></image:image>` : "") +
        `</url>`
      );
    })
    .join("\n");
  return (
    `${header}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
    `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`
  );
}

/** /sitemaps/makes.xml: /koli, every make's and every model's landing page; throws when the backend cannot answer. */
export async function makesSitemapXml(): Promise<string> {
  const makes = await fetchSeoMakes();
  const url = (path: string, priority: number) =>
    `<url><loc>${escapeXml(`${SITE_URL}${path}`)}</loc><changefreq>daily</changefreq><priority>${priority}</priority></url>`;
  const urls = [url("/koli", 0.8)];
  for (const make of makes) {
    urls.push(url(seoMakePath(make.slug), 0.8));
    for (const model of make.models) urls.push(url(seoModelPath(make.slug, model.slug), 0.7));
  }
  return `${header}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

/** The index: the static pages' file always, the landing pages' file and the cars' parts when the backend answers (N = ceil(total / 5000)). */
export async function sitemapIndexXml(): Promise<string> {
  const locs = [`${SITE_URL}/sitemaps/pages.xml`];
  try {
    await fetchSeoMakes();
    locs.push(`${SITE_URL}/sitemaps/makes.xml`);
  } catch {
    // backend down or older: no landing pages to list
  }
  try {
    const { total } = await getSitemapCars(0, 1);
    const parts = Math.ceil((Number.isFinite(total) ? total : 0) / CARS_PER_SITEMAP);
    for (let i = 0; i < parts; i++) locs.push(`${SITE_URL}/sitemaps/cars-${i}.xml`);
  } catch {
    // backend down or older: the static pages are still worth listing
  }
  const items = locs.map((l) => `<sitemap><loc>${escapeXml(l)}</loc></sitemap>`).join("\n");
  return `${header}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}
