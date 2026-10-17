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
- http://localhost:3000/admin — admin panel (`admin` / the password configured in the backend)

Before committing: `npm run lint` and `npm run build`.

## Structure

| Path | What |
|---|---|
| `src/app/page.tsx` | home: hero, latest cars, how import works, "find me a car" form |
| `src/app/cars/page.tsx` | catalog; filters live in the URL |
| `src/app/cars/[slug]/page.tsx` | car page: gallery, share buttons, EV stats, all known specs in groups (empty ones hidden), notes, final price, inquiry form |
| `src/app/admin/**` | admin: import by link (autohome, autowini, other sites), edit car, photos, statuses, inquiries |
| `src/app/admin/pricing/page.tsx` | price formula per site: costs, costs per 10 000 € above the threshold, profit |
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

`.env.local`:

| Variable | What |
|---|---|
| `NEXT_PUBLIC_API_URL` | backend URL as the browser sees it (default `http://localhost:8080`); baked in at build time |
| `API_URL` | optional: URL the Next.js server uses (e.g. `http://backend:8080` in Docker) |
| `NEXT_PUBLIC_BRAND_NAME` | optional, default `Premium Cars Import` |
| `NEXT_PUBLIC_CONTACT_PHONE` | optional, default `0878131990` |
| `NEXT_PUBLIC_VIBER_LINK` | optional, the Viber channel link |
