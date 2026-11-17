import { connection } from "next/server";
import { carsSitemapXml, makesSitemapXml, pagesSitemapXml, SITEMAP_HEADERS } from "@/lib/sitemap";

/** /sitemaps/pages.xml (static pages), /sitemaps/makes.xml (the makes' and models' landing pages) and /sitemaps/cars-{n}.xml (n-th part of 5000 cars, 0-based). */
export async function GET(_request: Request, { params }: RouteContext<"/sitemaps/[name]">) {
  await connection();
  const { name } = await params;
  if (name === "pages.xml") return new Response(pagesSitemapXml(), { headers: SITEMAP_HEADERS });
  if (name === "makes.xml") {
    try {
      return new Response(await makesSitemapXml(), { headers: SITEMAP_HEADERS });
    } catch {
      return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "600" } });
    }
  }
  const match = /^cars-(\d{1,4})\.xml$/.exec(name);
  if (!match) return new Response("Not found", { status: 404 });
  try {
    return new Response(await carsSitemapXml(Number(match[1])), { headers: SITEMAP_HEADERS });
  } catch {
    // a crawler retries later; an empty file would look like "these cars are gone"
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "600" } });
  }
}
