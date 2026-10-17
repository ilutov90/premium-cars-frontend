# premium-cars-frontend

Публичният сайт и админ панелът на Premium Cars Import.
Next.js 16 · React 19 · TypeScript · Tailwind CSS 4.

Пълната инструкция за локален старт на трите части е в репото **premium-cars-infra** (`README.md`).

## Бърз старт

```bash
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
npm install
npm run dev
```

- http://localhost:3000 — сайтът (бекендът трябва да върви на :8080)
- http://localhost:3000/admin — админ панел (`admin` / паролата от бекенда)

Проверки преди commit: `npm run lint` и `npm run build`.

## Структура

| Път | Какво |
|---|---|
| `src/app/page.tsx` | начало: hero, последни коли, „Как работи вносът“, форма „Намери ми кола“ |
| `src/app/cars/page.tsx` | каталог; филтрите са в URL-а |
| `src/app/cars/[slug]/page.tsx` | страница на колата: галерия, характеристики, разбивка на цената, запитване |
| `src/app/admin/**` | админ: импорт по линк, редакция, снимки, статуси, запитвания |
| `src/lib/api.ts` | заявки към публичното API (сървърни компоненти) |
| `src/lib/types.ts` | типове, огледални на DTO-тата в бекенда |
| `src/app/globals.css` | цветове, шрифт и общите класове (`btn-primary`, `field` …) |

## Конфигурация

`.env.local`:

| Променлива | Какво |
|---|---|
| `NEXT_PUBLIC_API_URL` | адрес на бекенда, както го вижда браузърът (по подразбиране `http://localhost:8080`) |
| `API_URL` | по желание: адрес, който Next.js сървърът ползва (напр. `http://backend:8080` в Docker) |
