import { connection } from "next/server";
import { SITEMAP_HEADERS, sitemapIndexXml } from "@/lib/sitemap";

/** The sitemap index, built on every request (the cars change all the time). */
export async function GET() {
  await connection();
  return new Response(await sitemapIndexXml(), { headers: SITEMAP_HEADERS });
}
