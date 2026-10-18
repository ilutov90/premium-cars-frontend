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
- The browser calls the backend only through this server: `/api` and `/media` are rewrites to `API_URL`
  (`next.config.ts`), so client code uses relative URLs (`PUBLIC_API_URL` in `src/lib/config.ts` is "").
  Server components use `src/lib/api.ts` (direct to `API_URL`).
- Admin pages (`src/app/admin/**`) are client components; all admin calls go through `useAdmin().adminFetch`
  (session cookie from the backend + `X-XSRF-TOKEN` header from the `XSRF-TOKEN` cookie). Never store passwords
  or tokens in the browser; the frontend has no secrets.
- API types in `src/lib/types.ts` mirror the backend DTOs (`CarDtos`, `InquiryDtos`). Change both together.
- Labels for enums (fuel, transmission, statuses) live in `src/lib/format.ts`.
- The car type is nested like the API: `car.specs.*` (title, make, EV fields …) and, for admin, `car.pricing.*`.
- Customers never see the Facebook/Instagram/Viber text. It comes from templates (`src/lib/post-template.ts`:
  placeholders, defaults, rendering; saved ones in the backend `post_template`, edited under `/admin/templates`).
  Rendering drops a line whose placeholder is empty for the car. Publishing always goes through the confirmation
  dialog in `social-post-panel.tsx` (text editable, 1-10 photos picked) and the backend
  (`/api/admin/cars/{id}/social-posts`). The car page shows every known spec and hides empty ones.
- Car descriptions come from `src/lib/description.ts` (a port of `build_post_text` / `generate_hashtags` in
  `autowini_poster_parallel.py`); the default Facebook/Instagram template renders the script's post exactly.
  Business details (brand, phone, Viber, office) and the "why us" bullets live in `src/lib/site.ts`; the phone,
  Viber link and office saved in the admin panel ("Шаблони → Общи данни") override them in the posts and in the
  footer (`getContact()`, `contactDetails()`).
- Docs (README, CLAUDE.md) and code comments are English.
- Design tokens are in `src/app/globals.css` (`@theme`: paper, card, ink, muted, line, accent). Use them
  (`bg-card`, `text-muted`, `bg-accent`, ...) instead of raw colours. Shared utilities: `field`, `label`,
  `btn-primary`, `btn-accent`, `btn-ghost`.
- No new dependencies without a clear need.

## Layout

| Path | What |
|---|---|
| `src/app/page.tsx` | home: hero, latest cars, how import works, "find me a car" form |
| `src/app/cars/page.tsx` | catalog with filters in the URL (GET form) |
| `src/app/cars/[slug]/page.tsx` | car page: gallery, share buttons, grouped specs, notes, final price (only `priceEur`), inquiry form |
| `src/app/admin/**` | admin: import by link, edit car, photos, statuses, price formulas (`pricing/`), post templates (`templates/`), inquiries |
| `src/components/**` | shared components; `admin/` for admin-only ones |
