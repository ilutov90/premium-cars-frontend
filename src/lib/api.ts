// Server-side calls to the public API. Used from Server Components inside <Suspense>,
// so every request gets fresh data (an admin change is visible on the next page load).
import type { CarDetail, CarSummary, FilterOptions, PageResponse, PostSettings } from "./types";
/** URL the Next.js server uses; differs from the public one inside Docker/Kubernetes. */
/** Server components call the backend directly (not through the /api rewrite). */
const SERVER_API_URL = process.env.API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SERVER_API_URL}${path}`, { headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError(503, `Няма връзка с бекенда (${SERVER_API_URL}). Стартиран ли е?`);
  }
  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

export type CarSearch = Record<string, string | undefined>;

/** Query keys the catalog understands; anything else in the URL is ignored. */
export const SEARCH_KEYS = [
  "q",
  "make",
  "fuelType",
  "transmission",
  "origin",
  "yearFrom",
  "yearTo",
  "priceFrom",
  "priceTo",
  "mileageTo",
  "sort",
  "page",
] as const;

export function toQuery(params: CarSearch): string {
  const qs = new URLSearchParams();
  for (const key of SEARCH_KEYS) {
    const value = params[key];
    if (value !== undefined && value !== "") qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function searchCars(params: CarSearch, size = 12) {
  const query = toQuery(params);
  const sep = query ? "&" : "?";
  return get<PageResponse<CarSummary>>(`/api/public/cars${query}${sep}size=${size}`);
}

export async function getCar(slug: string): Promise<CarDetail | null> {
  try {
    return await get<CarDetail>(`/api/public/cars/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function getFilterOptions() {
  return get<FilterOptions>("/api/public/filters");
}

/** Phone, Viber channel link and office saved in the admin panel; null when the backend cannot be reached. */
export async function getContact(): Promise<PostSettings | null> {
  try {
    return await get<PostSettings>("/api/public/contact");
  } catch {
    return null;
  }
}
