/**
 * Browser-facing API base: empty = the same origin. Next.js forwards /api and /media to the backend
 * (next.config.ts), so client components call "/api/..." and the admin session cookie stays first-party.
 */
export const PUBLIC_API_URL = "";
