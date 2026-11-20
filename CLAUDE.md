@AGENTS.md

# premium-cars-frontend

Public website + admin panel for Premium Cars Import (cars from South Korea and China, sold in Bulgaria).
Talks to the Spring Boot API in the sibling repo `premium-cars-backend` (default `http://localhost:8080`).

The owner's session rules (answers in Bulgarian, generated content in English, the lead orchestrator's plan with a
model per task approved before execution) are in `premium-cars-infra/CLAUDE.md`, "Session rules": they hold here too.

## Stack

Next.js 16 (App Router, Cache Components + Partial Prefetching enabled), React 19, TypeScript, Tailwind CSS 4,
font Onest. Next.js 16 differs from older versions: read the guide in `node_modules/next/dist/docs/` before
using an API you are not sure about (see AGENTS.md).

## Where the code lives

GitHub (`ilutov90/premium-cars-frontend`) is the main place: a branch from `main`, a pull request to `main`, merged there (with a
merge commit, not squash or rebase, so GitLab's `main` stays an ancestor). Never push to `main`.
GitLab (`premium-cars-import/premium-cars-frontend`) is the backup way (Google Cloud Build, `cloudbuild.yaml`): it is updated only
by `.github/workflows/mirror-gitlab.yml`, which pushes `main` there after every push to GitHub's `main` (never
forced, token `GITLAB_MIRROR_TOKEN` in a header). Do not push branches or merge requests to GitLab.

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
- A car whose listing is gone has no status: the automatic import deletes it at once (reserved, sold and archived
  ones stay) and its run report lists the deleted cars with their posts, to take them down.
- A car page that is not on the site answers a real 404: `src/proxy.ts` (Next.js 16's proxy, matcher `/cars/:slug`, also `/koli/:make[/:model]`)
  asks the backend (`/api/public/cars/{slug}/exists`) before the page renders and rewrites to the not-found page with
  status 404. The page streams, so `notFound()` inside it alone gives 200 + noindex, which Google reports. No answer
  or an older backend lets the page through.
- Landing pages per make and model (SEO, backend `seo` package): `/koli` ("Марки автомобили": every make with its
  count, lowest price and first models), `/koli/{make}` and `/koli/{make}/{model}` (`seo-landing.tsx`: heading, intro,
  the make's models, its cars the cheapest first in pages of 12 with `?page=N` 1-based, the inquiry form with make /
  model prefilled). Data from `GET /api/public/seo/makes` and `/api/public/seo/pages/{make}[/{model}]`; the cars from
  the public search with `make` / `model` repeated once per `makeNames` / `modelNames` (`searchCars`' `repeated`).
  The texts are written from the data by `src/lib/seo-pages.ts` (pure functions: title, meta description, H1, intro;
  1 vs many, Korea / China / both, fuels); the admins' overrides (`/admin/seo`, `PUT /api/admin/seo/pages`) replace
  the title (`<title>` + og), the description and the intro (plain text, blank line = new paragraph); the H1 stays
  automatic. `seoSlug` must stay equal to the backend's `SeoSlugs.of` (the car page's "Make › Model" links and its
  breadcrumb point at these pages). `src/proxy.ts` answers a real 404 for a page the backend answers 404 for;
  `/sitemaps/makes.xml` lists them. A catalog URL with only `make` (+ `model`) is noindex with its landing page as
  canonical. Not in the header menu (full): linked from the footer, the catalog ("Всички марки") and the car pages.
- The car page shows "Обява № {id}" under the title and the Viber draft / inquiry text carries it; the admin list
  finds a car by that number or by its pasted site link.
  Under it, a logged-in admin sees the source listing and "Редактирай" (`admin-car-bar.tsx`): fetched in the browser
  from `GET /api/admin/cars/{id}` with the admin's session, so the page's HTML never has the source link; asked only
  when the admin panel has marked the browser (`localStorage` "pc-admin", set while logged in, cleared on logout or
  a 401), and it renders nothing otherwise, so customers' layout is unchanged.
- Import sources (`CarSource`): AUTOHOME and GUAZI (China, priced with the AUTOHOME formula), AUTOWINI (Korea),
  AUTOTRADER_CA (www.autotrader.ca, Canada, prices in CAD, its own formula; origin `CA` "Канада"). Its photos are linked
  like guazi's. In "Автоматичен импорт" it has everything autowini has ("Двигател (без)" with the site's fuel names)
  plus its own filters (`AutoImportFilters.autotrader`: postal code, radius 10-400 km, optional coordinates cleared when
  the postal code changes, and four "exclude" ticks: private sellers, damaged, "call for price", not used); its prices
  in the tab are CAD. `/koli-ot-kanada-i-amerika` ("Коли от Канада" in the menu) lists the origins in its `ORIGINS`
  (CA now; add US there). The post templates' location line per origin is editable under "Шаблони → Общи данни"
  (`locationKr` / `locationCn` / `locationCa`, `locationLine` in `description.ts`, empty = the default).
  `specs.batteryHealthPct` (battery SOH, from guazi) shows with the EV figures on the car page. `specs.wltpRangeKm` (backend `WltpRange`: CLTC × 0.82 rounded to 5 km, WLTP as it is; read-only, never sent) shows as "Пробег на ток по WLTP" next to a CLTC range, in the editor, and is what the mobile.bg panel (and so the extension) fills in. `specs.inspection`
  (guazi's inspection report: grade, accident/water/fire checks, areas, remarks with the inspector's note and video)
  shows as "Техническа проверка" (`inspection-report.tsx`); `src/lib/inspection.ts` puts it in Bulgarian: fixed names
  by lookup, the notes by patterns and a parts dictionary with adjective agreement; an unknown sentence stays in
  English (add the part or pattern there).
- Photos of guazi and autohome are linked: their URLs point at the source site's CDN (`AdminImage.linked`), autowini's
  are served from our `/media`. Car photos load with `referrerPolicy="no-referrer"` and a photo that does not load is
  hidden (`car-image.tsx`, `car-gallery.tsx`). Photos swipe (`photo-swiper.tsx`: native scroll snapping, arrows on a computer) on the cards (`card-photos.tsx`, the list's first 8 photos `CarSummary.imageUrls`), in the car page gallery and in its full screen view. Anything that needs a photo's bytes (downloads, the mobile.bg extension)
  uses `AdminImage.fileUrl` (`/media/photo/{id}`, our origin), never `url`.
- Customers never see the Facebook/Instagram/Viber text. It comes from two templates (`src/lib/post-template.ts`:
  placeholders, defaults, rendering; one shared by Facebook and Instagram, stored as `FACEBOOK`, and one for Viber;
  saved ones in the backend `post_template`, edited under `/admin/templates`). Rendering drops a line whose
  placeholder is empty for the car. Publishing is one action for all networks: the confirmation dialog in
  `social-post-panel.tsx` (networks ticked, the Facebook/Instagram text and the Viber text editable, 1-10 photos
  picked for all, now or scheduled for a date and time in Bulgarian time, `src/lib/sofia-time.ts`, whatever the computer's zone: picked in quarter hours (`schedule-picker.tsx`: date, hour, minute 00/15/30/45), by default an hour after the dialog opens rounded up to the next quarter hour; the backend refuses a time less than a minute ahead) sends one `POST /api/admin/cars/{id}/publications` (Viber can be posted as the car's link only, the default: Viber shows the preview, no photos needed, `linkOnly`; or as photos + text); the panel
  follows each network's post (`/scheduled-posts`) until it is published or failed.
  The car page shows every known spec and hides empty ones.
- mobile.bg: the car editor's `mobile-bg-panel.tsx` ("Качи в mobile.bg") shows mobile.bg's "Добави обява" form filled
  in from the car (`GET /api/admin/cars/{id}/mobile-bg`, everything editable, up to 17 photos, the `MOBILE_BG`
  template as description) and hands it to the browser extension in `extension/mobile-bg` (Manifest V3, plain JS,
  messages through `window.postMessage`, see `src/lib/mobile-bg.ts`). The extension types it into mobile.bg in the
  admin's own browser, uploads the photos on step 2 and stops: mobile.bg's "ПРОДЪЛЖИ" (which publishes) is always
  pressed by the admin; it reports the published listing and mobile.bg's lists, which the panel saves. The server never
  calls mobile.bg. `npm run build` (prebuild) zips the extension to `public/downloads/` for the module's download link.
- cars.bg: the car editor's `cars-bg-panel.tsx` ("Качи в cars.bg") works like mobile.bg's: `GET /api/admin/cars/{id}/cars-bg`
  gives cars.bg's form in its ids (`src/lib/cars-bg.ts`: lists, extras, warnings), up to 15 photos (sent as JPEG), the
  `MOBILE_BG` template as description with links, phone numbers and emoji removed (cars.bg's rules) and the car's full
  name first. One offer per car: a posted car is not posted again until "Обявата е свалена" forgets the offer. A car whose
  make cars.bg lacks, or whose model is marked missing, cannot be posted there. The same extension (`extension/mobile-bg`,
  1.1.0+: `carsbg.js` + `carsbg-page.js`) fills cars.bg's "Публикувай обява" and uploads the photos; "Публикувай" is
  always the admin's (`scripts/zip-extension.mjs` refuses files that name the sites' publish/delete controls). Its
  messages: `carsBgCatalog`, `carsBgReports`, `started` with `site`, `refresh`.
- `/admin/marketplace` ("Съпоставяне на модели", backend `marketplace`): our makes + models against mobile.bg's and
  cars.bg's lists, the most cars first; confirm a suggestion, choose the site's model of the matched make, or mark it
  missing; the list of what cars.bg lacks. "Обнови списъците" reloads our models and has the extension open both sites
  and read their lists again (cars.bg: its makes, then each make's models, paced), which the page saves.
- Car descriptions come from `src/lib/description.ts` (a port of `build_post_text` / `generate_hashtags` in
  `autowini_poster_parallel.py`); the default Facebook/Instagram template renders the script's post exactly.
  Business details (brand, phone, Viber, office) and the "why us" bullets live in `src/lib/site.ts`; the phone,
  Viber link and office saved in the admin panel ("Шаблони → Общи данни") override them in the posts and in the
  footer (`getContact()`, `contactDetails()`).
- The inquiry form (`inquiry-form.tsx`): the general one is make, model (suggestions from the catalog, any text goes), year and a required phone, sent as the message "Търся: …"; on a car page phone and message. The name is optional. Both have "Пишете ни във Viber" (`viberChatHref`: a chat with the contact phone, with a first message on a car page).
- Marketing: the inquiry form sends "Откъде научихте за нас?" (`heardFrom`, labels in `format.ts`) and where the visit
  came from (`src/lib/marketing.ts`: UTM parameters, first page, referring site, kept in sessionStorage for the tab).
  `{{link}}` in the post templates gets UTM parameters per template (`postUtm` in `post-template.ts`). The Meta Pixel
  id is saved under "Шаблони → Общи данни" (backend `post_setting`); `cookie-consent.tsx` (in the layout) shows the
  cookie banner only when a pixel (or Google) id is set and loads the pixel only after "Приемам" (PageView per page, Lead on a sent
  inquiry). Keep the privacy policy (`/privacy#cookies`) in line with it. The Google tag is set up there too
  (`googleAdsId`, `googleAnalyticsId`, the Ads conversion labels `googleLeadLabel` / `googlePhoneLabel` / `googleViberLabel`):
  any of the pixel, Ads or Analytics id shows the banner, and `gtag.js` is injected only after "Приемам"
  (`loadGoogleTag` in `marketing.ts`: Consent Mode v2 default denied, then granted; `config` per id sends the first
  page_view, later page changes send one only to Ads, GA4 counts them itself). Conversions: a sent inquiry (with GA4's
  `generate_lead`) and, through one document click listener in `cookie-consent.tsx`, `tel:` and Viber links (`viber:`,
  viber.com / vb.me, the saved Viber link), each only when its label is set. A visit with `gclid` / `gbraid` / `wbraid`
  and no `utm_source` is recorded as google / cpc. `/admin/reports` shows inquiries per channel,
  campaign, car and week; `/admin/delivered` edits "Доставени коли" (shown on `/delivered` and the home page; a new one is added in one go: the photo is chosen in the same form and uploaded right after the record is created).
  A scheduled post the backend skipped (the car was posted to that network by hand after the scheduling) is CANCELLED with a
  reason, shown in Bulgarian by `scheduledPostNote` (`format.ts`).
  Landing pages: `/koli-ot-koreya` (all cars from Korea; the old `/koli-na-gaz-ot-koreya` redirects there, `next.config.ts`) and
  `/elektromobili-ot-kitay` (`niche-page.tsx`: the owner's texts, the quick search limited to the origin, the latest cars,
  the inquiry form). `/kak-raboti-vnosat` is the six-step guide (`import-steps.tsx`; its compact cards are the home
  page's "Как работи вносът"). The owner writes the marketing texts of these pages: keep them verbatim.
- Docs (README, CLAUDE.md) and code comments are English.
- The site's logo: the header (`site-header.tsx`) shows the image uploaded under "Шаблони → Лого на сайта"
  (`GET /api/public/logo`, `getLogo()` returns the whole `SiteLogo`) in place of the whole built-in mark and name; none, or no answer, shows the
  built-in one. The admin page reduces the chosen file (up to 10 MB) to 240 px high PNG in the browser before sending. Its style (`height` 24-64 px, `radius` 0-32 px, `feather` 0-40 %, null = default, `PUT /api/admin/logo/style`) is set with sliders and a header-like live preview in the same section; `src/lib/logo-style.ts` (`logoImageStyle`) turns it into the image's style for both the header and the preview (feather = an edge-fading CSS mask).
  The picture shown when a link to the site is shared (og:image, `/og`) is uploaded the same way under "Шаблони → Картинка при споделяне"
  (`getShareImage()`, `GET /api/public/share-image`; reduced to at most 1200 px wide JPEG): `src/app/og/route.tsx` serves it (fetched per request,
  `connection()`, `Cache-Control: max-age=300`), else the generated default.
- Links to a section ("/#contact", "#niche-contact"): `hash-anchor.tsx` (in the root layout) keeps the section in view while
  the page above it still streams in (the home page's delivered cars come later and would push "#contact" down), for a
  page opened with a hash and for in-site links, until the page has not grown for 2 s or the visitor scrolls, touches or types.
- Text sizes: the public site reads two steps larger than Tailwind's scale (14 / 16 / 18 / 20 px) (`--text-xs` … `--text-lg` set on `body` in
  `globals.css`); the admin panel keeps Tailwind's sizes through `.admin-root` (`admin/layout.tsx`). The header's menu is
  fixed at 14px so it fits.
- "Поръчки" (`/admin/orders`, backend `order`): the list (search, status, pages), `orders/new` (`?carId=` from the car
  editor's "Създай поръчка") and `orders/[id]` (`order-editor.tsx`: the car by "Обява №" or a pasted link, marked
  "Продадена" and off the site on save; the customer's details, all optional; VIN, prices, status, container, dates,
  notes; the car's snapshot and kept photos) with `order-documents.tsx` (a block per kind: upload PDF / Word / images,
  several images = one PDF on the server; open, download, delete) and `document-scanner.tsx` (the camera in the page:
  `getUserMedia`, pages with a "document" look done on the pixels, reorder, sent as JPEGs that the server makes one
  PDF; without a camera `<input capture>`). The camera is allowed only under `/admin` (`Permissions-Policy`
  `camera=(self)` in `next.config.ts`; the public site keeps `camera=()`). `adminFetch` leaves Content-Type to the
  browser for a FormData body. The car editor links a sold car's order (`AdminCar.orderId`).
- The mobile.bg dialog (`mobile-bg-panel.tsx`) marks every field that keeps it from being sent in red (`danger`), lists
  them left of its button and keeps the button off until they are filled; a make or model outside mobile.bg's list counts.
- Design tokens are in `src/app/globals.css` (`@theme`: paper, card, ink, muted, line, accent, danger). Use them
  (`bg-card`, `text-muted`, `bg-accent`, ...) instead of raw colours. Shared utilities: `field`, `label`,
  `btn-primary`, `btn-accent`, `btn-ghost`.
- No new dependencies without a clear need.
- `Dockerfile` is the production image (GitHub CI pushes it to GHCR, Cloud Build on GitLab to the GitLab registry;
  built with `API_URL=http://backend:8080`); local development never needs it.

## Layout

| Path | What |
|---|---|
| `src/app/page.tsx` | home: hero with the quick search (`quick-search.tsx`, the catalog's short search fields from `search-fields.tsx`; "Разширено търсене" opens `/cars?more=1`), latest cars, how import works, "find me a car" form |
| `src/app/cars/page.tsx` | catalog (the cheapest first unless another order is chosen: no `sort` = `price_asc`, "Най-нови" = `newest`) with filters in the URL (GET form, `catalog-filters.tsx`: the short search is make, model (from `FilterOptions.models`), year and fuel; "Разширено търсене" shows the rest and opens by itself when one of those is set; canonical `/cars`; a catalog URL with any filter or sort parameter is `noindex, follow` (`generateMetadata`), only `?page=N` of the unfiltered list keeps a self canonical and stays indexable; after a search, sort or page change `scroll-to-results.tsx` scrolls to the results when they start below the middle of the screen: on a phone, under the filters; whether to move is decided by where the results are in the page, not on the screen at that moment (right after a search the page may still be scrolled as before it); it holds them there (jumps, smooth scrolling off meanwhile) until the page has not moved or grown for 1.5 s or the visitor touches, scrolls or types, since on some phones (a Samsung S23 Ultra) the router's scroll to the top and the streaming results came after a single scroll) |
| `src/app/cars/[slug]/page.tsx` | car page: gallery, title, final price (only `priceEur`, right under the title), share buttons, grouped specs, notes, inquiry form. The page sends no Referer (`referrer: "no-referrer"`), so guazi's inspection videos load as when opened directly; a video that fails offers a direct link |
| `src/app/delivered`, `koli-ot-koreya`, `elektromobili-ot-kitay`, `kak-raboti-vnosat` | "Доставени коли" (only real deliveries with the customer's consent, never made-up ones), the landing pages and the import guide |
| `src/app/koli/page.tsx`, `koli/[make]`, `koli/[make]/[model]` | the makes' list and the make / model landing pages (`src/components/seo-landing.tsx`, texts from `src/lib/seo-pages.ts`; metadata with a self canonical, `?page=N` for later pages; JSON-LD `BreadcrumbList` + `ItemList`) |
| `src/app/about`, `src/app/privacy` | "За нас" and the privacy policy (company details in `site.ts` → `company`); the inquiry form requires the privacy checkbox (`privacyAccepted`) |
| `src/app/sitemap.xml/route.ts`, `src/app/sitemaps/[name]/route.ts`, `src/lib/sitemap.ts`, `robots.ts`, `og/` | SEO: `/sitemap.xml` is a sitemap index (route handlers, built per request, `max-age=3600`): `/sitemaps/pages.xml` (static pages), `/sitemaps/makes.xml` (`/koli` and the make / model landing pages, left out of the index when the backend is down) and `/sitemaps/cars-{n}.xml`, 5000 public cars each (N = ceil(`total` / 5000) from the backend's `GET /api/public/sitemap/cars`, `getSitemapCars`; with the backend down or older the index lists only the pages file, a cars part answers 503), robots, the default preview image; `src/lib/seo.ts` has `SITE_URL`, the car JSON-LD + `BreadcrumbList` and the home page's `AutoDealer` + `WebSite` |
| `src/app/admin/**` | admin: the car list (`admin/page.tsx`: pages of 48, status tabs with counts, text search (a name, a link to the car on our site or at the source, the car's number: a link or number looks in every status), source site, where it is posted (backend `PostedFilter`), sort; each row shows the car's posts (`posted-chips.tsx`); the state is in the URL; `pager.tsx` pages this list and the runs' report), import by link, automatic import (`auto-import/`: main switch, the mileage limit, the highest FOB price, per-site switch, filters, makes with year from and models, autowini's "Двигател (без)" column: per chosen model (or the whole make) the fuel types with their counts, the ticked ones not imported, preview counts, "Проверка на колите" (how many cars of the site we have; the cars that are one listing more than once, by listing id, with links to them and "Изтрий дубликатите"), "Изчисти опашката" (`/{source}/queue/clear`: the next run queues again what is still at the source), "Изтегли отчет (CSV)" (`/{source}/export`: a ZIP with the listings and the last runs), a warning when this server does not run the import (`runsHere` false: another one, e.g. a laptop, does), dry run, run now, the runs' report (pages of 20, newest first, `/runs?page=`) with the cars each run deleted, the posted ones first with their posts and the rest folded, and the checked cars added by hand; `auto-import/failures/`: every failed listing, paged, reasons grouped, batch delete; backend `AutoImportDtos`), edit car, photos, statuses, price formulas (`pricing/`: per site sea, land, commission, duty and VAT as a percent or a table by FOB (`DutyBracket` rows, the next row up, autowini), and the fixed markup by FOB threshold; `price-recalc-panel.tsx` recalculates by hand per site or all, from the kept FOB or read again from the listings, with reports of the changed cars and where they were posted, `posted-chips.tsx`; the report's "С ръчна цена" view lists the scope's cars with a hand-set final price as they are now, with today's formula price next to it), post templates (`templates/`), model mapping for mobile.bg and cars.bg (`marketplace/`), scheduled posts (`scheduled/`), inquiries, the inquiry report (`reports/`), "Изчезнали обяви" (`removed/`: statistics of the cars that disappeared from the source sites per make / model / year, period and site filters and drill-down kept in the URL, bars, weekly columns, table; "Нулирай статистиката" = `POST /api/admin/reports/removed/reset`, the report's `statsFrom` is then "Брои се от"; backend `GET /api/admin/reports/removed`), "SEO страници" (`seo/`: the landing pages with their counts, an editor per row with the automatic texts as placeholders, the limits 160 / 320 / 5000, "Върни автоматичния текст"; backend `/api/admin/seo/pages`), delivered cars (`delivered/`), admin users (`users/`, one-time passwords; `admin-context.tsx` forces the password change) |
| `src/components/site-header.tsx`, `site-nav.tsx` | header: the pages (`pages` in `site-nav.tsx`, one list for both) as links on a wide screen and a ☰ menu below `xl` (rendered into `<body>`: the header's backdrop blur would hold a fixed element), the current page marked; call and Viber with the phone saved in the admin panel |
| `src/components/**` | shared components; `admin/` for admin-only ones |
