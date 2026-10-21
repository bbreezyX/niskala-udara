# Smoke Trace ("Jejak Asap") Design

Status: draft for review, 2026-10-21.

## Intent

People in Riau, Jambi, South Sumatra and Kalimantan ask one question during haze season: is the bad air here coming from those fires, and which ones? Today Niskala shows the pieces separately: the UAQI heatmap, NASA FIRMS hotspots, the Open-Meteo wind field and KLH stations. The reader has to connect them in their head.

Smoke Trace connects them. For any place it follows the wind back 12 hours, draws the corridor the air likely travelled through, finds the fires in that corridor, and says what that means in one plain sentence next to the current reading.

As far as a quick search found, no consumer air quality site does this. A 2023 Heatmap News reporter had to piece it together by hand from MyRadar, a wind map and AirNow. EDF Air Tracker does back-tracing for regulators. AirNow and Canada's FireWork show smoke plumes and forecasts for North America, but not "which fires are behind the air at this place". That gap is the reason to build it, so the feature should feel like a direct answer, not another layer.

## Goals

1. A city, point or device page answers "is fire smoke likely part of what I'm breathing, and from where?" in one sentence, using the reading already on the page.
2. The map can show the same answer for the map centre, with the corridor drawn on the map.
3. The wording is honest about uncertainty: "in the wind's path" and "likely contributing", never "the source".
4. It works with the data Niskala already fetches (FIRMS VIIRS, Open-Meteo wind, Google current conditions) and adds no new provider or key.

## Non-goals (this version)

- Forward smoke arrival ("smoke from this cluster reaches Palembang in ~6 h"). It reuses the same engine and is the planned follow-up.
- Peatland overlay, model-vs-station comparison, notifications.
- Physics-grade dispersion (HYSPLIT-style), pressure-level winds (850/925 hPa), plume rise, rain-out.
- Traces for past days or a history of traces. Nothing is stored.
- A link from the location card to the map centred on that place. That needs the map to read an initial centre from the hash, which is a separate small change.

## Anti-goals (a failure even if it technically works)

- Naming a fire, company or district as the cause of the pollution, or showing a percentage share. The model cannot support either.
- Numbers that look more precise than the method: distances are rounded, there are no decimals on fire power totals.
- Any coordinate (device, point or map centre) in a URL, query string or server log.
- Caching or storing Google data beyond the existing limits. The trace endpoint uses no Google data at all (see Architecture).
- A trace that silently uses stale wind or fire data without saying when the data is from.

## Constraints from the project

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind v4, shadcn/ui. Tabs in TS/TSX, kebab-case files, `@/` imports, comments explain why.
- API route files stay one line and pass env keys to a handler in `src/lib/server/` that takes an injected `fetchFn`, so it is unit-testable.
- Every user-facing string exists in `src/lib/i18n/dictionaries/id.ts` (source) and `en.ts` (British English), as plain strings with `{name}` placeholders filled by `fill`/`plural`.
- Coordinates may travel in a POST body (the existing `/api/air-quality` endpoints already do this), never in a URL or log. Server logs carry codes, statuses and durations only.
- Typography rules from AGENTS.md: operational headings sans semibold, comparable numbers `tabular-nums`, primary text `text-base`. No new fonts, no Material 3 patterns, no new colour tokens; use the brand tokens in `globals.css` and the hotspot encoding in `src/components/map-hotspots.ts`.
- Open-Meteo free tier: 10,000 calls a day. The wind grid uses 429 locations every 3 hours (3,432 calls a day). This design must not raise that.
- FIRMS is cached 10 minutes server-side in `src/lib/server/firms.ts`; Open-Meteo 3 hours in `src/lib/server/wind.ts`. Reuse those caches.
- Tests: Vitest covers `src/lib` only; there are no component tests. Pure logic must live in `src/lib` and be tested there.

## What the reader sees

### On a location page (city, map point, device)

A new card in `LocationDetail`'s body, full width, placed after the Recommendation and Pollutant cards and before the 24-hour trend. The existing comment orders the page by "how is the air now, when to go out, what to do, what is causing it, how has it moved"; this card belongs to "what is causing it".

Card contents, top to bottom:

1. Title: "Asal Udara, 12 Jam Terakhir" / "Where This Air Came From, Last 12 Hours".
2. The lead sentence (text-base). Variants are listed under Wording.
3. A small facts row: hotspots in the corridor, total fire power (MW, rounded to whole numbers), and the main fire group's distance, direction and roughly how many hours the air took from it.
4. A figure: an SVG drawn around the place, north up, with the corridor, the wind path, distance rings (for example 50, 100, 200 km, picked to fit), and the corridor's hotspots drawn with the map's own encoding (size by FRP class, opacity by age, `HOTSPOT_COLOR`, from `map-hotspots.ts`). No basemap: adding Google Maps to every location page would add a billed map load per view. The figure is decorative for screen readers (`aria-hidden`) because the sentence and facts carry the same information.
5. A footnote: data times (wind fetched at, fire data updated at, in the location's time zone) and a one-line method note ("Perkiraan dari angin model 10 m dan deteksi satelit, bukan pengukuran asap.").

States:
- Loading: a skeleton the size of the card.
- FIRMS key missing: the card shows a short "not configured" message, never placeholder numbers.
- Wind or FIRMS failed: an error message with a retry button, in the style of the map panel's retry.
- FIRMS partial (a satellite source missing): the existing "count may be lower" note.
- No fires in the corridor: the figure still shows the corridor (where the air came from is useful on its own), and the sentence says no fires were found.

### On the map

A new switch in `LayerControls`, "Jejak Asap (Tengah Peta)" / "Smoke Trace (Map Centre)", off by default. When on:

- A small crosshair marks the map centre, the trace's starting point.
- The corridor is drawn as a translucent fill in the brand primary (`--primary`, #13386b) with the wind path as a thin dashed line in the same colour. Not red or orange: those mean fire and bad air on this map.
- The panel shows the map version of the sentence (no air quality clause, since the map centre has no loaded reading) and the data times.
- The trace is recomputed when the map comes to rest (`idle`), debounced, with the previous request aborted. This mirrors how the panel's "wind at map centre" reading already updates.

Off by default is my call: the corridor covers the hotspot dots and heatmap, and it answers a question the reader opts into. The location card is the main way people discover the feature.

## How the trace works

All of this is pure TypeScript in `src/lib/smoke-trace.ts`, with Vitest tests beside it.

### Wind over time

The trace needs hourly wind for the last 12 hours, not just the current hour.

- `src/lib/server/wind.ts` already fetches two days of hourly 10 m wind for the whole grid and caches it for 3 hours. Add `past_days=1` to that request so the cached forecast always covers the previous 12 hours, including just after 00:00 UTC (07:00 WIB). This keeps one call per location (Open-Meteo counts calls by location, variables and span, and three days of four variables stays one call), so the daily total is unchanged.
- Expose the cached forecast to the trace (for example a `getWindForecast()` beside `getWind()`), and convert speed and direction to eastward/northward components the same way `windAt` does.
- Wind at any position and time: bilinear in space over the grid (the same maths as `WindField.at` in `src/lib/client/wind-layer.ts`) and linear in time between the two surrounding hours.
- 10 m wind, not 850/925 hPa: my call, so the trace agrees with the wind particles the map already shows. A higher level is a later experiment.

### Back-trajectory

- Start at the place at the current time. Step backward in fixed steps (10 minutes is a sensible default) for 12 hours, each step moving the position against the wind at that position and time.
- Record a path point every 30 minutes with its hours-back and the distance travelled along the path so far.
- If the path leaves the wind grid (`WIND_GRID`, the same box as `MAP_BOUNDS`), stop there and mark the trace `truncated`.
- Calm: if the whole 12-hour path is shorter than about 30 km, treat the air as stagnant. Skip the corridor and use a circle of about 50 km around the place instead, with no direction claim.

### Corridor

- Around each path point, a circle with radius `r = 15 km + 0.25 × distance travelled to that point`. Five m/s for 12 hours travels about 216 km, giving a 69 km radius at the far end, roughly ±14°.
- The corridor is the union of those circles. Drawing it as filled circles in one path (canvas) or one group with group opacity (SVG) avoids computing a polygon outline.
- The constants are starting values. Calibrating them on live data is part of the work (see Verification).

### Fires in the corridor

- Use FIRMS hotspots from the existing 24-hour cache, excluding low confidence, which matches the map's default filter.
- A hotspot is in the corridor if it is within the radius of any path point. Record the hours-back of the closest path point: roughly how long ago the air passed over it.
- Fires are treated as burning throughout the 24-hour window. Detection time is when a satellite passed, not when the fire started or stopped, so it is not matched against the path's time.
- Prefilter by the corridor's bounding box before measuring distances; Indonesia can have 15,000+ detections a day.

### Groups and level

- Group the corridor's hotspots into contiguous burning areas (single-link within about 10 km is fine; a grid-cell split would cut real clusters in two). The main group is the one with the largest total FRP, because fire power, not the number of pixels, drives how much smoke reaches the place. The copy calls it the strongest group, never "most fires". Report its FRP-weighted centre's distance (rounded to 5 km under 50 km, 10 km above), compass direction from the place, count, total FRP and hours-back.
- Level from the corridor's total FRP: `none` (no hotspots), `light` (under 100 MW), `heavy` (100 MW and up). FRP missing counts as 0 for the total but the hotspot still counts. The level decides the wording (see Wording): only `heavy` can lead to "smoke likely contributing". Thresholds are starting values to calibrate.

### Response shape

The endpoint returns something like this (the builder may rename fields):

```ts
interface SmokeTrace {
	hours: number; // 12
	startedAt: string; // ISO, when the trace starts (now)
	windFetchedAt: string;
	firesFetchedAt: string;
	missingFireSources: string[];
	calm: boolean;
	truncated: boolean;
	/** Every 30 min from the place backward. */
	path: { latitude: number; longitude: number; hoursBack: number; radiusKm: number }[];
	/** Corridor hotspots, strongest first, capped (e.g. 300) to keep the response small. */
	hotspots: { latitude: number; longitude: number; frp: number | null; acquiredAt: string; hoursBack: number }[];
	count: number; // uncapped
	totalFrp: number;
	mainGroup: { latitude: number; longitude: number; count: number; totalFrp: number; distanceKm: number; bearing: number; hoursBack: number } | null;
	level: 'none' | 'light' | 'heavy';
}
```

## Architecture

A change from what I said earlier in the conversation: I had proposed computing the trace in the browser. The full FIRMS response is about 2 MB of JSON (about 400 KB compressed) on a busy day, which is too much for every location page on a phone. So the trace runs on the server and returns a few kilobytes.

- `POST /api/smoke-trace` with body exactly `{ latitude, longitude }` (reuse `parseCoordinates`), inside `MAP_BOUNDS`, or `invalid_request`. One-line route file in `src/app/api/smoke-trace/route.ts` passing `firmsKey()` and `openMeteoKey()` to a handler in `src/lib/server/`.
- The handler follows the existing POST pattern in `handle-air-quality.ts`: cross-site check, JSON content type, 1 KB body cap, strict parse, `not_configured` when the FIRMS key is missing, error codes from `AirQualityError`, `no-store` responses, logs with codes and durations only.
- It awaits the cached FIRMS data and the cached wind forecast, then calls the pure functions. No result cache: the computation is cheap once both inputs are cached.
- Coordinates arrive in the POST body exactly as the air-quality endpoints receive them today. Device coordinates are rounded first, as `roundCoordinates` already does for those requests.
- The location page combines the trace with the current Google reading in the browser, using data it already holds. The server never touches Google data for this feature, so the Google caching rules are unaffected.
- The map overlay is a canvas `OverlayView`, like the wind layer, drawing the corridor, path and centre crosshair.

## Wording

The sentence picks one variant. Inputs: level, calm, truncated, the main group, the overall direction the air came from (bearing from the place to the path's far end, as a compass word from the existing `compass` list), and on location pages the current reading.

"Smoke likely contributing" is only said when all three hold: the level is `heavy`, the current reading is UAQI Moderate or worse (band `moderate`, `low` or `poor`), and PM2.5 is the dominant pollutant. Moderate PM2.5 from traffic alone is routine in Jakarta, so a few small burns upwind must not be enough. With `light` fires, or `heavy` fires and a different reading, the sentence states the fires and the current reading side by side and draws no conclusion.

Indonesian drafts (English to match in British English):

- Heavy fires, smoke likely: "Angin 12 jam terakhir datang dari {direction} dan melewati {n} titik api. Kelompok api terkuat ada sekitar {km} km dari sini. PM2.5 sedang tinggi, jadi asap kebakaran kemungkinan ikut menyumbang."
- Fires, no conclusion (light, or heavy with another reading): "Angin 12 jam terakhir datang dari {direction} dan melewati {n} titik api. Kelompok api terkuat ada sekitar {km} km dari sini. Kualitas udara di sini saat ini {band}." ({band} is the UAQI band name in lower case.)
- No fires: "Angin 12 jam terakhir datang dari {direction} tanpa melewati titik api yang terdeteksi satelit."
- Calm with fires: "Angin hampir tenang selama 12 jam terakhir. Ada {n} titik api dalam {r} km, dan asapnya bisa mengendap di sekitar sini."
- Calm, no fires: "Angin hampir tenang selama 12 jam terakhir, dan tidak ada titik api dalam {r} km."
- Truncated (appended): "Jejak berhenti di batas data angin, jadi api di luar Indonesia tidak terhitung."
- Map versions start with "Tengah peta:" and drop the air quality clause.

Copy in both languages follows the project's editorial title case for labels and sentence case for sentences.

## Verification

- Vitest for the pure module:
  - Uniform wind: a straight upwind path of the expected length (5 m/s for 12 h is about 216 km).
  - Time interpolation between two hourly frames.
  - Truncation at the grid edge.
  - The calm rule.
  - Corridor membership at the radius boundary.
  - Grouping that keeps a cluster together across a 0.1° line.
  - Level thresholds.
  - Rounding of distances.
  - Picking the sentence variant.
- Vitest for the handler: cross-site 403, wrong content type 415, oversized body 413, invalid and out-of-bounds coordinates 400, missing FIRMS key `not_configured`, upstream failures mapped to codes, and no coordinates in logged messages. Update `wind.test.ts` for `past_days=1`.
- Calibration on live data: run the trace for every city in `src/lib/config/cities.ts` and review the levels and corridor widths against the map for a few haze-affected cities. The 21 October 2026 data was active enough to use (a partial NOAA-20 download alone held 4,901 detections, with FRP up to 296 MW near Palembang). Calibration does not block shipping and needs no replay harness: if the live data is quiet on build day, ship the starting constants and say so. Record the final values and why in the code comments.
- Browser:
  - Palembang, Pekanbaru, Pontianak and Jakarta pages, plus a map point and the map switch while panning.
  - Indonesian and English.
  - 375 px width.
  - Loading, error and not-configured states.
  - Server logs checked for coordinates.
- `npm run check`, `npm test`, `react-doctor . -y --score` printing 100.
- FIRMS can be very slow from a home connection (13 s timeouts were seen on 2026-10-21). Local checks may need a retry once the server cache warms. That is not a defect in this feature.

## Dependency: the hotspot encoding change

The FRP size classes, age opacities, `HOTSPOT_COLOR` and the low-confidence filter were added in an uncommitted change on 2026-10-21 (`map-hotspots.ts`, `map-panel.tsx`, `map-view.tsx`, `hotspot-layer.ts`, both dictionaries). This feature edits the same files and reuses that encoding, so that change must be committed before Smoke Trace work starts.

The pure parts of that encoding (`INTENSITY`, `AGE`, the class lookup, `HOTSPOT_COLOR` and the low-confidence filter) currently live in `src/components/map-hotspots.ts`, a `'use client'` file. Move them to a plain module in `src/lib` (for example `src/lib/hotspot-encoding.ts`) so the server handler and the location card share one definition. `map-hotspots.ts` keeps the map-specific parts and imports the rest.

## Left to the builder

- Step size, sampling and the exact way the corridor is drawn, as long as the corridor reads as one shape.
- The grouping algorithm, within the "contiguous area, not grid cells" rule.
- Figure layout details: ring distances, labels, how the path is styled, the card layout at desktop width.
- Debounce timing on the map, and exactly where the crosshair and summary sit in the panel.
- Field names in the response, file split inside `src/lib` and `src/components`.

## My calls (not discussed with you)

1. The trace runs on the server, not in the browser (payload size, explained under Architecture).
2. 10 m wind, matching the map's wind layer.
3. The map switch is off by default.
4. Starting constants: 12 hours, radius 15 km + 25% of distance travelled, calm under 30 km, light/heavy split at 100 MW.
5. The location page figure is an SVG with no basemap.
6. Low-confidence hotspots are always excluded from the trace.
7. No link from the card to the map in this version.
8. Only `heavy` fires (100 MW and up in the corridor) can lead to "smoke likely contributing"; `light` fires are stated without a conclusion.
9. The main group is the strongest by total FRP, and the copy says "strongest", not "most fires".
10. Calibration uses live data on build day and does not block shipping; no fixture replay harness.
