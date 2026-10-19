# Repository Guidelines

Niskala is an air quality dashboard for Indonesian cities: Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS v4, shadcn/ui. Data comes from the Google Air Quality API, NASA FIRMS (fire hotspots) and Open-Meteo (wind). No database, no accounts. README.md is in Indonesian; its "Struktur" section predates `app/[lang]`, so trust the source tree over it.

## Working rules

- Run tests, typechecks, builds, `react-doctor` or browser checks only when the current task explicitly asks for verification. Implement, fix, commit and push requests do not authorize them. Report such changes as untested.
- Pushing to `main` deploys to production (`.github/workflows/deploy.yml` → `deploy/deploy.sh` on the VPS). The deploy is blocked unless `react-doctor . -y --score` prints exactly `100`. Push only when asked.
- Preserve unrelated edits in the working tree.
- Adding fonts requires explicit approval.

## Commands

```bash
npm ci                                   # install locked dependencies (Node 22.17+)
npm run dev                              # localhost:3000
npm run build && npm start               # production build and serve
npm run check                            # tsc --noEmit
npm test                                 # Vitest once; npm run test:unit for watch mode
npx vitest run src/lib/format.test.ts    # one file; add -t "name" to filter by test name
npm run doctor                           # react-doctor (the deploy gate)
```

Vitest runs in Node, discovers `src/**/*.{test,spec}.ts` beside the source, and requires every test to assert. Tests cover `src/lib` only; there are no component or DOM tests.

## Layout

- `src/app/[lang]/`: every page. `src/app/api/`: one-line route files that pass an env key to a handler in `src/lib/server/`, so handlers stay testable with an injected `fetchFn`.
- `src/lib/server/`: Google client and response validation (`google-air-quality.ts`), shared memory cache (`air-quality-cache.ts`), request handlers, FIRMS and wind.
- `src/lib/client/`: browser state. `location-feed.ts` holds one `LocationFeed` store per location, read with `useFeed`/`useFeeds` and shared by the dashboard and detail pages.
- `src/lib/config/`: `cities.ts` (regions, cities, reference points, IANA time zones), `cache.ts`, `map.ts`.
- `src/components/ui/`: shadcn primitives; add them with the shadcn CLI. Theme tokens live in `src/app/globals.css` (no Tailwind config file).

## Routing and i18n

Indonesian (`id`) is served on bare URLs, English under `/en`. `next.config.ts` rewrites bare paths to `/id/...` (a config rewrite on purpose: a proxy rewrite broke behind Caddy) and redirects the old Indonesian slugs. `src/proxy.ts` redirects explicit `/id/...` to the bare path. Language comes from the URL only, never a cookie or `Accept-Language`, because the Cloudflare edge cache ignores `Vary`.

Every user-facing string exists in both languages:

- `src/lib/i18n/dictionaries/id.ts` is the source and defines `Dictionary`; `en.ts` must satisfy it, in British English to match the `en-GB` date and number formats.
- Dictionary values are plain strings with `{name}` placeholders, filled by `fill`/`plural`, because they cross from server to client components.
- Long-form pages (about, privacy, terms) are per-language TSX in `src/content/`.
- Internal links in client components use `@/components/link` instead of `next/link`; server code uses `localizePath`.

## Data, cache and key constraints

These come from provider terms and privacy promises, not preference:

- Google's terms allow caching current conditions and forecasts for at most 1 hour across all layers. `src/lib/config/cache.ts` splits it into 55 minutes in server memory plus 60 seconds at Cloudflare; heatmap tiles use `TILE_TTL_MS` in `handle-map.ts`. Do not lengthen these or add browser or CDN caching of Google data without recomputing the total.
- Read env vars only through `src/lib/server/env.ts` (`server-only`). Pages needing a key call `connection()` and pass the client only a `configured` boolean. A missing key renders a "not configured" state, never placeholder numbers. `PUBLIC_GOOGLE_MAPS_API_KEY` is the only browser-visible key; heatmap tiles are proxied.
- Device coordinates never enter a URL; map points travel only in the hash (`/location/point#lat,lng`). Server logs record error codes, statuses and durations, never keys or coordinates.
- Copy `.env.example` to `.env`; never commit credentials.

## Coding style

No formatter or linter is configured, so match the surrounding file. Tabs in application TS/TSX; leave generated shadcn and CSS formatting as is. kebab-case filenames, PascalCase components and types, camelCase functions, `@/` imports. Comments explain why, not what.

## Typography

- Gambetta (`font-display`) only for branding, hero and page titles, footer brand copy, and decorative error codes.
- `font-heading` stays mapped to Plus Jakarta Sans (`font-sans`). Use sans-serif for operational headings, pickers, controls, body text, metrics and timestamps.
- Operational headings are semibold; comparable numbers use `tabular-nums`.
- Primary paragraphs and health advice are `text-base`, including inside cards. Line height `1.1` for page titles, `1.5–1.65` for body text.
- Reuse the existing rem-based scales and shared components, and keep each role the same across breakpoints and languages.

## Commits and pull requests

Imperative subjects matching history, e.g. `Lead Riwayat with the city and plain advice, shorten list actions`. Keep commits focused. PRs explain the change and state its verification status.
