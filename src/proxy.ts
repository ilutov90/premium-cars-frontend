import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** The backend as this server reaches it (the same value src/lib/api.ts uses). */
const API_URL = process.env.API_URL ?? "http://localhost:8080";

/**
 * A car's page answers 404 when the car is not on the site (deleted by the automatic import, sold out of the
 * catalog, a mistyped address). The page itself streams: its first bytes, and with them the status 200, leave
 * before the car is loaded, so notFound() inside it can only add a "noindex" tag. Search engines then keep the
 * address as "excluded by noindex" instead of dropping it. Asking the backend here, before the page starts, gives
 * a real 404 with the not-found page.
 *
 * Only a clear "no such car" from the backend ends in 404. A backend that does not answer, answers late or does
 * not know the question (an older version) lets the page through as before.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/koli/")) return landingPage(request, path.slice("/koli/".length));
  const slug = path.slice("/cars/".length);
  if (!slug || slug.includes("/")) {
    return NextResponse.next();
  }
  try {
    const res = await ask(`/api/public/cars/${encodeURIComponent(slug)}/exists`);
    if (res.ok) {
      const body = (await res.json()) as { exists?: boolean };
      if (body.exists === false) return notFound(request);
    }
  } catch {
    // no answer: the page decides, as before
  }
  return NextResponse.next();
}

/**
 * The landing pages /koli/{make} and /koli/{make}/{model} the same way: the backend's page endpoint answers 404 for
 * a make or model without public cars. Any other answer, or none, lets the page through.
 */
async function landingPage(request: NextRequest, rest: string) {
  const parts = rest.split("/");
  if (parts.length > 2 || parts.some((p) => !p)) return NextResponse.next();
  try {
    const res = await ask(`/api/public/seo/pages/${parts.map((p) => encodeURIComponent(decodeURIComponent(p))).join("/")}`);
    if (res.status === 404) return notFound(request);
  } catch {
    // no answer (or an address that cannot be decoded): the page decides
  }
  return NextResponse.next();
}

function ask(path: string) {
  return fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
}

/** An address no route answers: Next.js renders src/app/not-found.tsx with the status 404. */
function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/404", request.url), { status: 404 });
}

export const config = {
  matcher: ["/cars/:slug", "/koli/:make", "/koli/:make/:model"],
};
