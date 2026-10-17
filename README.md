# premium-cars-frontend

Public website and admin panel of Premium Cars Import.
Next.js 16 · React 19 · TypeScript · Tailwind CSS 4.

The site's texts are in Bulgarian (the customers are in Bulgaria); code, comments and docs are in English.
The full guide for running all three parts locally is in the **premium-cars-infra** repo (`README.md`).

## Quick start

```bash
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
npm install
npm run dev
```

- http://localhost:3000 — the site (the backend must be running on :8080)
- http://localhost:3000/admin — admin panel (`admin`; the first password is in `premium-cars-infra/vault/secrets/admin-initial-password.txt`)

Before committing: `npm run lint` and `npm run build`.

## Structure

| Path | What |
|---|---|
| `src/app/page.tsx` | home: hero, latest cars, how import works, "find me a car" form |
| `src/app/cars/page.tsx` | catalog; filters live in the URL |
| `src/app/cars/[slug]/page.tsx` | car page: gallery, share buttons, EV stats, all known specs in groups (empty ones hidden), notes, final price, inquiry form |
| `src/app/admin/**` | admin: import by link (autohome, autowini, other sites), edit car, photos, statuses, inquiries |
| `src/app/admin/pricing/page.tsx` | price formula per site: costs, costs per 10 000 € above the threshold, profit |
| `src/app/admin/account/page.tsx` | change the admin password |
| `src/components/admin/social-post-panel.tsx` | Facebook/Instagram text (editable), publish buttons, earlier posts, share/download photos |
| `src/components/share-buttons.tsx` | share buttons on the car page: Facebook, Viber, the phone's share sheet (Instagram …), copy link |
| `src/lib/api.ts` | calls to the public API (server components) |
| `src/lib/types.ts` | types mirroring the backend DTOs (`CarSpecs`, `PricingInputs`, `CarDetail`, `AdminCar` …) |
| `src/lib/format.ts` | Bulgarian labels for enums, number/power/range/battery formatting |
| `src/lib/description.ts` | car description and social post text, same format as `autowini_poster_parallel.py` |
| `src/lib/site.ts` | business details (brand, phone, Viber link, office) and the "why us" bullets |
| `src/lib/car-hashtags.json` | hashtag table exported from the posting script |
| `src/app/globals.css` | colours, font and shared utilities (`btn-primary`, `field` …) |

## Electric cars and hybrids

Cars carry optional EV fields: battery (kWh), electric range with its test cycle (CLTC/NEDC/WLTP/EPA) and
motor power (kW). They are shown as a dark stat band on the car page, as a line on the catalog card and in
the description. For combustion cars the fields stay empty and nothing is shown.

## Prices

Customers see only the final price (everything included); it is the same number as in the Facebook/Instagram
post. The formula per source site (autohome, autowini) is edited in the admin panel under "Цени" and stored in
the backend database; the breakdown is shown only in the admin car editor.

## Configuration

`.env.local` (no secrets: the frontend has none):

| Variable | What |
|---|---|
| `API_URL` | backend URL for the Next.js server (default `http://localhost:8080`); read at build/start |
| `SITE_URL` | public address of the site, for preview images when a car is shared (default `http://localhost:3000`) |
| `NEXT_PUBLIC_BRAND_NAME` | optional, default `Premium Cars Import` |
| `NEXT_PUBLIC_CONTACT_PHONE` | optional, default `0878131990` |
| `NEXT_PUBLIC_VIBER_LINK` | optional, the Viber channel link |

## How the browser reaches the backend

The browser talks only to this Next.js server: `/api/*` and `/media/*` are forwarded to the backend
(`next.config.ts` rewrites). Server components call the backend directly at `API_URL`. Because everything is one
origin, the admin session cookie and the CSRF cookie are first-party and the backend needs no CORS.

## Admin login

`src/components/admin/admin-context.tsx`: the login form calls `GET /api/admin/csrf` (sets the `XSRF-TOKEN`
cookie) and `POST /api/admin/login`; the backend answers with an HttpOnly session cookie. Nothing about the login
is stored by the frontend (no password, no token in sessionStorage/localStorage). `adminFetch` sends the
`X-XSRF-TOKEN` header on changing requests and shows the login form again on 401. "Профил"
(`/admin/account`) changes the password. Security headers (frame, sniffing, referrer, permissions) come from
`next.config.ts`.
