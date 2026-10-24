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
  Car extras (`CarFeature`) mirror the backend enum, one per mobile.bg checkbox: `featureGroups` (mobile.bg's groups and
  order) and `featureLabels` (mobile.bg's own words) in `format.ts`; add a constant on both sides at once.
  `specs.sheet` (backend `SpecGroup`) is the source's whole specification sheet as imported, in English; the car
  page shows it as "Пълна спецификация" through `src/lib/spec-sheet.ts` (Bulgarian names and values, unknown text
  stays as the source wrote it: add a line there when a car shows English). It is read-only: the editor never sends it.
- The car type is nested like the API: `car.specs.*` (title, make, EV fields …) and, for admin, `car.pricing.*`.
- Customers never see the Facebook/Instagram/Viber text. It comes from two templates (`src/lib/post-template.ts`:
  placeholders, defaults, rendering; one shared by Facebook and Instagram, stored as `FACEBOOK`, and one for Viber;
  saved ones in the backend `post_template`, edited under `/admin/templates`). Rendering drops a line whose
  placeholder is empty for the car. Publishing is one action for all networks: the confirmation dialog in
  `social-post-panel.tsx` (networks ticked, the Facebook/Instagram text and the Viber text editable, 1-10 photos
  picked for all, now or scheduled for a date and time) sends one `POST /api/admin/cars/{id}/publications`; the panel
  follows each network's post (`/scheduled-posts`) until it is published or failed.
  The car page shows every known spec and hides empty ones.
- mobile.bg: the car editor's `mobile-bg-panel.tsx` ("Качи в mobile.bg") shows mobile.bg's "Добави обява" form filled
  in from the car (`GET /api/admin/cars/{id}/mobile-bg`, everything editable, up to 17 photos, the `MOBILE_BG`
  template as description) and hands it to the browser extension in `extension/mobile-bg` (Manifest V3, plain JS,
  messages through `window.postMessage`, see `src/lib/mobile-bg.ts`). The extension types it into mobile.bg in the
  admin's own browser, uploads the photos on step 2 and stops: mobile.bg's "ПРОДЪЛЖИ" (which publishes) is always
  pressed by the admin; it reports the published listing and mobile.bg's lists, which the panel saves. The server never
  calls mobile.bg. `npm run build` (prebuild) zips the extension to `public/downloads/` for the module's download link.
- Car descriptions come from `src/lib/description.ts` (a port of `build_post_text` / `generate_hashtags` in
  `autowini_poster_parallel.py`); the default Facebook/Instagram template renders the script's post exactly.
  Business details (brand, phone, Viber, office) and the "why us" bullets live in `src/lib/site.ts`; the phone,
  Viber link and office saved in the admin panel ("Шаблони → Общи данни") override them in the posts and in the
  footer (`getContact()`, `contactDetails()`).
- Marketing: the inquiry form sends "Откъде научихте за нас?" (`heardFrom`, labels in `format.ts`) and where the visit
  came from (`src/lib/marketing.ts`: UTM parameters, first page, referring site, kept in sessionStorage for the tab).
  `{{link}}` in the post templates gets UTM parameters per template (`postUtm` in `post-template.ts`). The Meta Pixel
  id is saved under "Шаблони → Общи данни" (backend `post_setting`); `cookie-consent.tsx` (in the layout) shows the
  cookie banner only when a pixel id is set and loads the pixel only after "Приемам" (PageView per page, Lead on a sent
  inquiry). Keep the privacy policy (`/privacy#cookies`) in line with it. `/admin/reports` shows inquiries per channel,
  campaign, car and week; `/admin/delivered` edits "Доставени коли" (shown on `/delivered` and the home page).
  Landing pages for ads: `/koli-na-gaz-ot-koreya`, `/elektromobili-ot-kitay` (`niche-page.tsx`).
- Docs (README, CLAUDE.md) and code comments are English.
- Design tokens are in `src/app/globals.css` (`@theme`: paper, card, ink, muted, line, accent). Use them
  (`bg-card`, `text-muted`, `bg-accent`, ...) instead of raw colours. Shared utilities: `field`, `label`,
  `btn-primary`, `btn-accent`, `btn-ghost`.
- No new dependencies without a clear need.
- `Dockerfile` is the production image (CI pushes it to GHCR, built with `API_URL=http://backend:8080`); local
  development never needs it.

## Layout

| Path | What |
|---|---|
| `src/app/page.tsx` | home: hero, latest cars, how import works, "find me a car" form |
| `src/app/cars/page.tsx` | catalog with filters in the URL (GET form) |
| `src/app/cars/[slug]/page.tsx` | car page: gallery, share buttons, grouped specs, notes, final price (only `priceEur`), inquiry form |
| `src/app/delivered`, `koli-na-gaz-ot-koreya`, `elektromobili-ot-kitay` | "Доставени коли" and the landing pages for ads |
| `src/app/about`, `src/app/privacy` | "За нас" and the privacy policy (company details in `site.ts` → `company`); the inquiry form requires the privacy checkbox (`privacyAccepted`) |
| `src/app/sitemap.ts`, `robots.ts`, `og/` | SEO: sitemap with the public cars (built per request), robots, the default preview image; `src/lib/seo.ts` has `SITE_URL` and the car JSON-LD |
| `src/app/admin/**` | admin: import by link, edit car, photos, statuses, price formulas (`pricing/`), post templates (`templates/`), scheduled posts (`scheduled/`), inquiries, the inquiry report (`reports/`), delivered cars (`delivered/`), admin users (`users/`, one-time passwords; `admin-context.tsx` forces the password change) |
| `src/components/**` | shared components; `admin/` for admin-only ones |
