@AGENTS.md

# premium-cars-frontend

Public website + admin panel for Premium Cars Import (cars from South Korea and China, sold in Bulgaria).
Talks to the Spring Boot API in the sibling repo `premium-cars-backend` (default `http://localhost:8080`).

## Stack

Next.js 16 (App Router, Cache Components + Partial Prefetching enabled), React 19, TypeScript, Tailwind CSS 4,
font Onest. Next.js 16 differs from older versions: read the guide in `node_modules/next/dist/docs/` before
using an API you are not sure about (see AGENTS.md).

## Commands

```bash
npm run dev      # http://localhost:3000 (needs the backend running for data)
npm run lint     # must be clean
npm run build    # must pass; it also type-checks and catches missing <Suspense> around request data
```

Run `npm run lint` and `npm run build` before finishing a change.

## Conventions

- UI text is Bulgarian; code and comments are English.
- Server Components fetch public data through `src/lib/api.ts`. Anything that awaits `params`, `searchParams`
  or calls the API must sit inside `<Suspense>` (Cache Components rule).
- Client components import the API URL from `src/lib/config.ts` only (never `lib/api.ts`).
- Admin pages (`src/app/admin/**`) are client components; all admin calls go through `useAdmin().adminFetch`
  (HTTP Basic credentials in sessionStorage — MVP only).
- API types in `src/lib/types.ts` mirror the backend DTOs (`CarDtos`, `InquiryDtos`). Change both together.
- Labels for enums (fuel, transmission, statuses) live in `src/lib/format.ts`.
- Design tokens are in `src/app/globals.css` (`@theme`: paper, card, ink, muted, line, accent). Use them
  (`bg-card`, `text-muted`, `bg-accent`, ...) instead of raw colours. Shared utilities: `field`, `label`,
  `btn-primary`, `btn-accent`, `btn-ghost`.
- No new dependencies without a clear need.

## Layout

| Path | What |
|---|---|
| `src/app/page.tsx` | home: hero, latest cars, how import works, "find me a car" form |
| `src/app/cars/page.tsx` | catalog with filters in the URL (GET form) |
| `src/app/cars/[slug]/page.tsx` | car page: gallery, specs, price breakdown, inquiry form |
| `src/app/admin/**` | admin: import by link, edit car, photos, statuses, inquiries |
| `src/components/**` | shared components; `admin/` for admin-only ones |
