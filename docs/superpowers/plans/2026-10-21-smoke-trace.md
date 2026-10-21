# Smoke Trace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For any place, follow the wind back 12 hours, find the FIRMS fires in the corridor the air travelled through, and say what that means in one plain sentence on location pages and for the map centre.

**Architecture:** All geometry, trajectory, corridor, grouping and wording logic is pure TypeScript in `src/lib` (`smoke-trace.ts`, `smoke-trace-copy.ts`), tested in Vitest. A POST endpoint computes the trace on the server from the existing FIRMS and Open-Meteo caches and returns a few kilobytes. The location card and the map overlay only fetch, draw and pick a sentence.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS v4, shadcn/ui, Google Maps JS (`OverlayView`), Vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-21-smoke-trace-design.md` (approved 2026-10-21). Read it first; this plan argues from it.

## Global Constraints

- Work on branch `smoke-trace`, which already holds the hotspot encoding commit `eeed25a`. Never push: pushing `main` deploys, and the deploy needs `react-doctor . -y --score` to print exactly `100`.
- Commit steps run only if the user approved commits for this execution. Preserve unrelated edits in the working tree (`src/components/install-app.tsx` is the user's).
- Running the test, typecheck, doctor and browser steps in this plan is the explicit verification request AGENTS.md requires.
- Coordinates travel only in POST bodies, never in a URL, query string or log. Logs carry codes, statuses and durations.
- The trace endpoint uses no Google data. Do not touch `src/lib/config/cache.ts` or Google cache lifetimes.
- Open-Meteo stays at 429 locations every 3 hours; `past_days=1` keeps one call per location.
- Every user-facing string exists in `id.ts` (source of `Dictionary`) and `en.ts` (British English), plain strings with `{name}` placeholders filled by `fill`/`plural`. Labels use editorial title case, sentences use sentence case.
- Low-confidence hotspots are always excluded from the trace.
- Trace colour is the brand primary `#13386b` (`--primary`); never red or orange, which mean fire and bad air. No new tokens, fonts or decorative effects; operational headings sans semibold, comparable numbers `tabular-nums`, sentences `text-base`.
- Starting constants (spec): 12 hours, 10-minute steps, a sample every 30 minutes, radius `15 km + 0.25 × distance travelled`, calm when the 12-hour path is under 30 km (then a 50 km circle), groups link within 10 km, `heavy` from 100 MW, at most 300 hotspots in a response.
- Tabs in TS/TSX, kebab-case files, `@/` imports, comments explain why.

## Review Focus

1. **Places at the wind grid's edge** (Merauke, Sabang, Miangas): the path leaves the grid early; expect `truncated: true`, the truncation sentence, no crash. Pinned by the east-edge test in Task 3.
2. **Wind cache without the past hours** (a forecast fetched before `past_days=1` deployed, or Open-Meteo missing early hours): expect the trace to stop where wind data ends and report `truncated`, not throw. Pinned by the 6-hour-history test in Task 3.
3. **A quiet fire day** (zero hotspots in Indonesia, or none in the corridor): expect level `none`, `mainGroup: null`, the "no fires" sentence and a figure with just the corridor. Pinned by the empty-fires test in Task 5 and the `none` copy test in Task 6.
4. **Hotspots without FRP:** they still count, the total stays 0, and the level is `light`, not `none`. Pinned by the level test in Task 4.
5. **Fast panning on the map:** every idle used to mean a request; expect debounce plus abort, so only the last centre's trace is drawn. No unit test (component code); checked in the browser in Task 9.

---

## File Structure

- Create `src/lib/hotspot-encoding.ts` (+ test): the shared FRP/age classes, colour and low-confidence filter, moved out of the `'use client'` file.
- Modify `src/components/map-hotspots.ts`, `src/components/map-panel.tsx`, `src/components/map-view.tsx`: import the encoding from `src/lib`.
- Modify `src/lib/server/wind.ts`, `src/lib/server/wind.test.ts`: `past_days=1`, export the cached forecast.
- Create `src/lib/smoke-trace.ts` (+ `smoke-trace.test.ts`): geometry, wind over time, back-trajectory, corridor fires, groups, level, building the response.
- Modify `src/lib/types.ts`: `SmokeTrace` and its parts.
- Modify `src/lib/server/http.ts`, `src/lib/server/handle-air-quality.ts`: shared JSON body reading.
- Create `src/lib/server/handle-smoke-trace.ts`, `src/lib/server/smoke-trace.test.ts`, `src/app/api/smoke-trace/route.ts`.
- Create `src/lib/smoke-trace-copy.ts` (+ test): sentence variant and text.
- Modify `src/lib/i18n/dictionaries/id.ts`, `en.ts`: a `smokeTrace` section.
- Create `src/lib/client/use-smoke-trace.ts`, `src/components/smoke-trace-card.tsx`, `src/components/smoke-trace-figure.tsx`; modify `src/components/location-detail.tsx`.
- Create `src/lib/client/smoke-trace-layer.ts`; modify `src/lib/client/use-google-map.ts`, `src/components/map-view.tsx`, `src/components/map-panel.tsx`.

---

### Task 1: Shared hotspot encoding in `src/lib`

**Files:**
- Create: `src/lib/hotspot-encoding.ts`, `src/lib/hotspot-encoding.test.ts`
- Modify: `src/components/map-hotspots.ts:13-43`, `src/components/map-panel.tsx:17`, `src/components/map-view.tsx:19`

**Interfaces:**
- Produces: `HOTSPOT_COLOR`, `INTENSITY`, `AGE` (moved unchanged), `intensityClass(frp: number | null): number`, `ageClass(hoursOld: number): number`, `shownHotspots(hotspots: readonly Hotspot[], showLow: boolean): readonly Hotspot[]`. `hotspotStyle(now)` stays in `map-hotspots.ts` and uses these.

- [ ] **Step 1: Write the failing test** in `src/lib/hotspot-encoding.test.ts`

```ts
describe('intensityClass', () => {
	it('splits FRP at 10 and 50 MW, with a missing value in the smallest class', () => {
		expect([null, 0, 9.99, 10, 49.9, 50, 300].map(intensityClass)).toEqual([0, 0, 0, 1, 1, 2, 2]);
	});
});
describe('ageClass', () => {
	it('splits age at 6 and 12 hours, and anything older falls in the last class', () => {
		expect([-0.5, 0, 5.9, 6, 11.9, 12, 30].map(ageClass)).toEqual([0, 0, 0, 1, 1, 2, 2]);
	});
});
describe('shownHotspots', () => {
	it('drops low confidence unless asked to show it', () => {
		const list = [hotspot('high'), hotspot('nominal'), hotspot('low')];
		expect(shownHotspots(list, false).map((h) => h.confidence)).toEqual(['high', 'nominal']);
		expect(shownHotspots(list, true)).toHaveLength(3);
	});
});
```

(`hotspot(confidence)` is a local helper returning a `Hotspot` at any fixed place and time.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/hotspot-encoding.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Move the encoding.** Create `src/lib/hotspot-encoding.ts` holding `HOTSPOT_COLOR`, `INTENSITY`, `AGE`, the private `classIndex`, `intensityClass`, the new `ageClass(hoursOld) = classIndex(AGE, hoursOld)` and `shownHotspots`, with their existing comments. No `'use client'`. In `map-hotspots.ts` delete those definitions and import them; `hotspotStyle` uses `ageClass`. Update the imports in `map-panel.tsx` and `map-view.tsx`.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/lib/hotspot-encoding.test.ts src/lib/client/hotspot-layer.test.ts && npm run check`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit** (with the spec and this plan, which are still uncommitted)

```bash
git add src/lib/hotspot-encoding.ts src/lib/hotspot-encoding.test.ts src/components/map-hotspots.ts src/components/map-panel.tsx src/components/map-view.tsx docs/superpowers/specs/2026-10-21-smoke-trace-design.md docs/superpowers/plans/2026-10-21-smoke-trace.md
git commit -m "Move the hotspot encoding into src/lib so the server can share it"
```

---

### Task 2: Wind history for the trace

**Files:**
- Modify: `src/lib/server/wind.ts:16-23, 49-58, 123-137`, `src/lib/server/wind.test.ts`

**Interfaces:**
- Produces: `export interface WindForecast { times: number[]; speeds: number[][]; directions: number[][]; fetchedAt: string }` (the existing `Forecast`, renamed and exported) and `getWindForecast(apiKey?: string, fetchFn?: typeof fetch): Promise<WindForecast>`, sharing the cache entry that `getWind` uses. `getWind` becomes `windAt(await getWindForecast(apiKey, fetchFn))`.

- [ ] **Step 1: Write the failing tests** in `wind.test.ts`

```ts
it('asks for one past day so the last 12 hours are always covered', async () => {
	const fetchFn = vi.fn<typeof fetch>().mockImplementation(async (url) => openMeteo(String(url)));
	await fetchWindForecast(undefined, fetchFn);
	expect(new URL(String(fetchFn.mock.calls[0][0])).searchParams.get('past_days')).toBe('1');
});

it('shares one upstream fetch between the current hour and the trace', async () => {
	vi.useFakeTimers({ now: (START + 5 * HOUR) * 1000 });
	const fetchFn = vi.fn<typeof fetch>().mockImplementation(async (url) => openMeteo(String(url)));
	await getWind(undefined, fetchFn);
	const calls = fetchFn.mock.calls.length;
	const forecast = await getWindForecast(undefined, fetchFn);
	expect(fetchFn).toHaveBeenCalledTimes(calls);
	expect(forecast.times).toEqual(TIMES);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/server/wind.test.ts`
Expected: FAIL (`past_days` is null; `getWindForecast` is not exported).

- [ ] **Step 3: Implement.** Add `past_days: '1'` to the `URLSearchParams` in `fetchChunk`. Extend the comment on `WIND_TTL_MS`: three days of four variables is still one Open-Meteo call per location. Rename `Forecast` to `WindForecast` and export it. Add `getWindForecast` with the cache logic now inside `getWind`.

- [ ] **Step 4: Run the wind and map tests**

Run: `npx vitest run src/lib/server/wind.test.ts src/lib/server/map.test.ts`
Expected: wind tests PASS. `map.test.ts` keeps exactly its one known failure (`does not cache upstream failures`), which predates this branch.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/wind.ts src/lib/server/wind.test.ts
git commit -m "Keep a past day of wind and expose the cached forecast for tracing"
```

---

### Task 3: Back-trajectory

**Files:**
- Create: `src/lib/smoke-trace.ts`, `src/lib/smoke-trace.test.ts`
- Modify: `src/lib/types.ts` (append)

**Interfaces:**
- Consumes: `WIND_GRID` from `src/lib/config/map.ts`; `Wind` type from `src/lib/client/wind-layer.ts` (type-only import).
- Produces in `types.ts`: `interface TracePoint { latitude: number; longitude: number; hoursBack: number; distanceKm: number; radiusKm: number }`.
- Produces in `smoke-trace.ts`:
  - The constants `TRACE_HOURS = 12`, `STEP_MINUTES = 10`, `SAMPLE_MINUTES = 30`, `BASE_RADIUS_KM = 15`, `SPREAD = 0.25`, `CALM_PATH_KM = 30`, `CALM_RADIUS_KM = 50`.
  - `interface WindHistory { grid: { west: number; south: number; step: number; columns: number; rows: number }; times: number[]; speeds: number[][]; directions: number[][] }`. It has the same layout as `WindForecast`, so the handler passes `{ grid: WIND_GRID, ...forecast }`.
  - `interface TracePath { points: TracePoint[]; truncated: boolean; calm: boolean }`.
  - `distanceKm(a: Coordinates, b: Coordinates): number` (haversine, R = 6371 km).
  - `bearingDeg(from: Coordinates, to: Coordinates): number` (initial bearing, 0–360, 0 = north).
  - `windAtTime(wind: WindHistory, latitude: number, longitude: number, time: number): Wind | null` (`time` in Unix seconds).
  - `traceBack(wind: WindHistory, origin: Coordinates, startTime: number, hours?: number): TracePath`.

- [ ] **Step 1: Write the failing tests** in `src/lib/smoke-trace.test.ts`

```ts
const HOUR = 3600;
const NOW = Date.parse('2026-10-21T06:00:00Z') / 1000;
const PALEMBANG = { latitude: -2.99, longitude: 104.76 };

/** Every grid point blows from `direction` (degrees, where the wind comes from) at `speed` m/s, hourly from `first` to 24 h after NOW. */
function steadyWind(speed: number, direction: number, first = NOW - 24 * HOUR): WindHistory {
	const times = Array.from({ length: (NOW + 24 * HOUR - first) / HOUR + 1 }, (_, i) => first + i * HOUR);
	const points = WIND_GRID.columns * WIND_GRID.rows;
	return {
		grid: WIND_GRID,
		times,
		speeds: Array.from({ length: points }, () => times.map(() => speed)),
		directions: Array.from({ length: points }, () => times.map(() => direction))
	};
}

describe('windAtTime', () => {
	it('interpolates linearly between two hours', () => {
		const wind = steadyWind(2, 0);
		const hour = wind.times.indexOf(NOW);
		for (const speeds of wind.speeds) speeds[hour + 1] = 4;
		const at = windAtTime(wind, PALEMBANG.latitude, PALEMBANG.longitude, NOW + HOUR / 2)!;
		// From the north at 3 m/s: blowing south.
		expect(at.u).toBeCloseTo(0);
		expect(at.v).toBeCloseTo(-3);
	});

	it('has no wind outside the hours it holds', () => {
		const wind = steadyWind(2, 0);
		expect(windAtTime(wind, PALEMBANG.latitude, PALEMBANG.longitude, wind.times[0] - 1)).toBeNull();
	});
});

describe('traceBack', () => {
	it('goes straight upwind for 12 hours with a widening radius', () => {
		const { points, truncated, calm } = traceBack(steadyWind(5, 90), PALEMBANG, NOW);
		const far = points.at(-1)!;
		expect(points).toHaveLength(25);
		expect(far.hoursBack).toBe(12);
		expect(Math.abs(distanceKm(PALEMBANG, far) - 216)).toBeLessThan(2);
		expect(Math.abs(bearingDeg(PALEMBANG, far) - 90)).toBeLessThan(1);
		expect(Math.abs(far.radiusKm - 69)).toBeLessThan(1);
		expect(points[0]).toMatchObject({ hoursBack: 0, distanceKm: 0, radiusKm: 15 });
		expect({ truncated, calm }).toEqual({ truncated: false, calm: false });
	});

	it('stops at the east edge of the wind grid', () => {
		const { points, truncated } = traceBack(steadyWind(10, 90), { latitude: -3, longitude: 141.3 }, NOW);
		expect(truncated).toBe(true);
		expect(points.at(-1)!.hoursBack).toBeLessThan(12);
	});

	it('stops where the wind history ends', () => {
		const { points, truncated } = traceBack(steadyWind(5, 90, NOW - 6 * HOUR), PALEMBANG, NOW);
		expect(truncated).toBe(true);
		expect(points.at(-1)!.hoursBack).toBeLessThanOrEqual(6);
	});

	it('treats a path under 30 km as calm: one 50 km circle at the place', () => {
		expect(traceBack(steadyWind(0.5, 90), PALEMBANG, NOW)).toEqual({
			points: [{ ...PALEMBANG, hoursBack: 0, distanceKm: 0, radiusKm: 50 }],
			truncated: false,
			calm: true
		});
	});
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/smoke-trace.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `distanceKm`, `bearingDeg`, `windAtTime` and `traceBack`.
  - `windAtTime`: find the hour pair around `time`. For each of the two hours, take the four grid corners, convert each corner's speed and direction to components (`u = -speed·sin(dir)`, `v = -speed·cos(dir)`, as `windAt` in `wind.ts` does), then mix them bilinearly the way `WindField.at` does. Then interpolate linearly between the two hours.
  - `traceBack`: step backward `STEP_MINUTES` at a time. Each step moves the position against the wind: `Δlat = −v·Δt / R`, `Δlon = −u·Δt / (R·cos lat)`, in radians converted to degrees. Accumulate the along-path distance. Record a `TracePoint` every `SAMPLE_MINUTES`, with `radiusKm = BASE_RADIUS_KM + SPREAD × distanceKm`. When `windAtTime` returns null, stop and set `truncated`. Apply the calm rule after the loop.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/smoke-trace.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/smoke-trace.ts src/lib/smoke-trace.test.ts src/lib/types.ts
git commit -m "Trace the wind back 12 hours over the wind grid"
```

---

### Task 4: Fires in the corridor

**Files:**
- Modify: `src/lib/smoke-trace.ts`, `src/lib/smoke-trace.test.ts`, `src/lib/types.ts`

**Interfaces:**
- Consumes: `TracePath`, `distanceKm`, `bearingDeg` (Task 3); `shownHotspots` (Task 1).
- Produces in `types.ts`:
  - `interface TraceHotspot { latitude: number; longitude: number; frp: number | null; acquiredAt: string; hoursBack: number }`
  - `interface FireGroup { latitude: number; longitude: number; count: number; totalFrp: number; distanceKm: number; bearing: number; hoursBack: number }`
  - `type TraceLevel = 'none' | 'light' | 'heavy'`
- Produces in `smoke-trace.ts`:
  - The constants `GROUP_LINK_KM = 10` and `HEAVY_FRP_MW = 100`.
  - `corridorHotspots(path: TracePath, hotspots: readonly Hotspot[]): TraceHotspot[]`: low confidence excluded, strongest FRP first (null last). `hoursBack` is the hours-back of the nearest path point that contains the hotspot.
  - `groupHotspots(origin: Coordinates, hotspots: readonly TraceHotspot[]): FireGroup[]`: single-link within `GROUP_LINK_KM`, strongest `totalFrp` first. The centre is FRP-weighted (an unweighted mean when the total is 0). `distanceKm` is unrounded, and `hoursBack` is the group's minimum.
  - `traceLevel(count: number, totalFrp: number): TraceLevel`
  - `roundDistanceKm(km: number): number` (nearest 5 under 50 km, nearest 10 from 50).

- [ ] **Step 1: Write the failing tests**

```ts
/** A point `km` east (positive) or west (negative) of `from`, at the same latitude. */
const east = (from: Coordinates, km: number) => ({
	latitude: from.latitude,
	longitude: from.longitude + km / (111.32 * Math.cos((from.latitude * Math.PI) / 180))
});
const fire = (at: Coordinates, frp: number | null, confidence: Hotspot['confidence'] = 'nominal'): Hotspot => ({
	...at, frp, confidence, acquiredAt: '2026-10-21T05:30:00.000Z', satellite: 'NOAA-20'
});

describe('corridorHotspots', () => {
	const path = traceBack(steadyWind(5, 90), PALEMBANG, NOW);

	it('keeps fires inside the radius at the place and drops those just outside', () => {
		const found = corridorHotspots(path, [fire(east(PALEMBANG, -14.5), 3), fire(east(PALEMBANG, -15.5), 3)]);
		expect(found).toHaveLength(1);
	});

	it('records how long ago the air passed over the fire, and ignores low confidence', () => {
		const at = east(PALEMBANG, 100);
		const found = corridorHotspots(path, [fire(at, 12), fire(at, 40, 'low')]);
		expect(found).toHaveLength(1);
		expect(found[0].hoursBack).toBeCloseTo(5.5);
	});
});

describe('groupHotspots', () => {
	it('keeps a cluster together across a 0.1° line', () => {
		const groups = groupHotspots(PALEMBANG, [
			{ ...fire({ latitude: -3, longitude: 105.07 }, 5), hoursBack: 2 },
			{ ...fire({ latitude: -3, longitude: 105.12 }, 5), hoursBack: 2 }
		]);
		expect(groups).toHaveLength(1);
	});

	it('ranks by total fire power, not by how many hotspots a group has', () => {
		const strong = [0, 1, 2].map((i) => ({ ...fire(east(PALEMBANG, 150 + i), 100), hoursBack: 8 }));
		const many = Array.from({ length: 50 }, (_, i) => ({ ...fire(east(PALEMBANG, 60 + i * 0.1), 2), hoursBack: 3 }));
		const [first] = groupHotspots(PALEMBANG, [...many, ...strong]);
		expect(first).toMatchObject({ count: 3, totalFrp: 300 });
		expect(Math.abs(first.distanceKm - 151)).toBeLessThan(1);
		expect(Math.abs(first.bearing - 90)).toBeLessThan(1);
	});
});

describe('traceLevel', () => {
	it('is none without hotspots, heavy from 100 MW, and light for hotspots without FRP', () => {
		expect([traceLevel(0, 0), traceLevel(5, 99.9), traceLevel(5, 100), traceLevel(3, 0)]).toEqual(['none', 'light', 'heavy', 'light']);
	});
});

describe('roundDistanceKm', () => {
	it('rounds to 5 km under 50 km and to 10 km above', () => {
		expect([12, 43, 47.6, 52, 123, 125].map(roundDistanceKm)).toEqual([10, 45, 50, 50, 120, 130]);
	});
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/smoke-trace.test.ts`
Expected: the new tests FAIL (functions not exported); the Task 3 tests still pass.

- [ ] **Step 3: Implement the four functions.** In `corridorHotspots`, first drop hotspots outside the corridor's bounding box: the path points' extent, widened by the largest `radiusKm` converted to degrees. Indonesia can have more than 15,000 detections a day.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/smoke-trace.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/smoke-trace.ts src/lib/smoke-trace.test.ts src/lib/types.ts
git commit -m "Find and group the fires in the wind corridor"
```

---

### Task 5: The trace endpoint

**Files:**
- Modify: `src/lib/smoke-trace.ts`, `src/lib/smoke-trace.test.ts`, `src/lib/types.ts`, `src/lib/server/http.ts`, `src/lib/server/handle-air-quality.ts:19-46`
- Create: `src/lib/server/handle-smoke-trace.ts`, `src/lib/server/smoke-trace.test.ts`, `src/app/api/smoke-trace/route.ts`

**Interfaces:**
- Consumes: Tasks 2–4; `getHotspots` from `firms.ts`, `getWindForecast` from `wind.ts`, `parseCoordinates`, `MAP_BOUNDS`, `firmsKey()`, `openMeteoKey()`.
- Produces in `types.ts`: `interface SmokeTrace { hours: number; startedAt: string; windFetchedAt: string; firesFetchedAt: string; missingFireSources: string[]; calm: boolean; truncated: boolean; from: number | null; path: TracePoint[]; hotspots: TraceHotspot[]; count: number; totalFrp: number; mainGroup: FireGroup | null; level: TraceLevel }`. `from` is the bearing from the place to the path's last point (null when calm). `mainGroup.distanceKm` is already rounded with `roundDistanceKm`, and `mainGroup.hoursBack` is rounded to whole hours, at least 1.
- Produces in `smoke-trace.ts`: `MAX_TRACE_HOTSPOTS = 300` and `buildSmokeTrace(input: { origin: Coordinates; wind: WindHistory; windFetchedAt: string; fires: FireData; now: Date }): SmokeTrace`.
- Produces in `http.ts`: `readJsonBody(request: Request, maxBytes: number): Promise<{ payload: unknown } | { response: Response }>`. It holds the content-type (415), size (413) and JSON parse (400) checks moved out of `createHandler`.
- Produces: `handleSmokeTraceRequest(request: Request, firmsKey: string | undefined, openMeteoKey: string | undefined, fetchFn: typeof fetch = fetch): Promise<Response>` and the route `POST /api/smoke-trace`.

- [ ] **Step 1: Write the failing `buildSmokeTrace` tests** in `src/lib/smoke-trace.test.ts`

```ts
const fires = (hotspots: Hotspot[]): FireData => ({
	hotspots, windowHours: 24, fetchedAt: '2026-10-21T05:50:00.000Z', sources: ['VIIRS_NOAA20_NRT'], missingSources: ['VIIRS_SNPP_NRT']
});
const build = (hotspots: Hotspot[]) => buildSmokeTrace({
	origin: PALEMBANG, wind: steadyWind(5, 90), windFetchedAt: '2026-10-21T04:00:00.000Z', fires: fires(hotspots), now: new Date(NOW * 1000)
});

it('reports a quiet day as level none with no group', () => {
	expect(build([])).toMatchObject({ count: 0, totalFrp: 0, level: 'none', mainGroup: null, hotspots: [], missingFireSources: ['VIIRS_SNPP_NRT'] });
});

it('caps the hotspots it returns but counts them all', () => {
	const many = Array.from({ length: 320 }, (_, i) => fire(east(PALEMBANG, 20 + i * 0.5), 1));
	const trace = build(many);
	expect(trace.count).toBe(320);
	expect(trace.hotspots).toHaveLength(300);
	expect(trace.level).toBe('heavy');
});

it('rounds the main group for display and carries the data times', () => {
	const trace = build([fire(east(PALEMBANG, 83), 40)]);
	expect(trace.mainGroup).toMatchObject({ distanceKm: 80, hoursBack: 5, count: 1 });
	expect(trace.from).toBeCloseTo(90, 0);
	expect(trace).toMatchObject({ hours: 12, startedAt: '2026-10-21T06:00:00.000Z', windFetchedAt: '2026-10-21T04:00:00.000Z', firesFetchedAt: '2026-10-21T05:50:00.000Z' });
});
```

- [ ] **Step 2: Write the failing handler tests** in `src/lib/server/smoke-trace.test.ts`. Clear both caches (`clearHotspotCache`, `clearWindCache`) in `beforeEach` and silence `console.error`.
  - **`fetchFn`** routes by host.
    - FIRMS URLs return a CSV with header `latitude,longitude,acq_date,acq_time,satellite,confidence,frp`, acquired 2 h before `Date.now()`. Only the `VIIRS_NOAA20_NRT` URL carries rows; the other two sources return the header alone, so a hotspot is not counted three times. The rows are a nominal 20 MW hotspot 50 km east of Palembang (longitude ≈ 105.21) and a low-confidence one at the same place.
    - Open-Meteo URLs return the shape of `openMeteo()` in `wind.test.ts` (wind from the east at 5 m/s), with hourly times from 24 h before the current hour to 48 h after.
  - **`failingFirmsFetch`** is the same, except every FIRMS URL answers HTTP 500.

```ts
const post = (body: unknown, headers: Record<string, string> = {}) => new Request('http://localhost/api/smoke-trace', {
	method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body)
});

it('returns the trace for a place inside Indonesia', async () => {
	const res = await handleSmokeTraceRequest(post(PALEMBANG), 'firms-key', undefined, fetchFn);
	expect(res.status).toBe(200);
	const { data } = await res.json();
	expect(data.path).toHaveLength(25);
	expect(data.count).toBe(1); // one 20 MW hotspot 50 km east, one low-confidence hotspot ignored
	expect(data.level).toBe('light');
});
it('rejects cross-site requests, other content types, big bodies, bad and out-of-bounds coordinates', async () => {
	expect((await handleSmokeTraceRequest(post(PALEMBANG, { 'sec-fetch-site': 'cross-site' }), 'k', undefined, fetchFn)).status).toBe(403);
	expect((await handleSmokeTraceRequest(post(PALEMBANG, { 'content-type': 'text/plain' }), 'k', undefined, fetchFn)).status).toBe(415);
	expect((await handleSmokeTraceRequest(post({ ...PALEMBANG, pad: 'x'.repeat(2000) }), 'k', undefined, fetchFn)).status).toBe(413);
	expect((await handleSmokeTraceRequest(post({ latitude: 'a', longitude: 1 }), 'k', undefined, fetchFn)).status).toBe(400);
	expect((await handleSmokeTraceRequest(post({ latitude: 20, longitude: 104 }), 'k', undefined, fetchFn)).status).toBe(400);
	expect(fetchFn).not.toHaveBeenCalled();
});
it('reports not_configured without a FIRMS key and calls nothing', async () => {
	const res = await handleSmokeTraceRequest(post(PALEMBANG), undefined, undefined, fetchFn);
	expect(res.status).toBe(503);
	expect(await res.json()).toEqual({ error: { code: 'not_configured' } });
	expect(fetchFn).not.toHaveBeenCalled();
});
it('maps a FIRMS failure to its code and never logs the coordinates', async () => {
	const res = await handleSmokeTraceRequest(post(PALEMBANG), 'k', undefined, failingFirmsFetch);
	expect(res.status).toBe(502);
	const logged = vi.mocked(console.error).mock.calls.flat().join(' ');
	expect(logged).not.toContain('-2.99');
	expect(logged).not.toContain('104.76');
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run src/lib/smoke-trace.test.ts src/lib/server/smoke-trace.test.ts`
Expected: FAIL (`buildSmokeTrace` and the handler do not exist).

- [ ] **Step 4: Implement.**
  - `buildSmokeTrace` composes `traceBack`, `corridorHotspots` and `groupHotspots`. It rounds the main group, takes `from` from `bearingDeg(origin, path.points.at(-1))` (null when calm), and caps the hotspots at `MAX_TRACE_HOTSPOTS`.
  - Move the body checks into `readJsonBody` and switch `createHandler` to it, keeping its behaviour.
  - The handler runs, in order: cross-site check; `readJsonBody(request, 1024)`; `parseCoordinates`; inside `MAP_BOUNDS`, otherwise `invalid_request`; missing FIRMS key gives `not_configured` (log `'FIRMS_MAP_KEY is not set'`); then `Promise.all([getHotspots(firmsKey, fetchFn), getWindForecast(openMeteoKey, fetchFn)])`, then `buildSmokeTrace`, then `respond({ data })` (default `no-store`).
  - Map errors through `AirQualityError` as `handleFiresRequest` does, logging under scope `'smoke-trace'`.
  - The route file is one line: `export const POST = (request: Request) => handleSmokeTraceRequest(request, firmsKey(), openMeteoKey());`.

- [ ] **Step 5: Run the server and lib tests**

Run: `npx vitest run src/lib/smoke-trace.test.ts src/lib/server && npm run check`
Expected: PASS except the known `map.test.ts > does not cache upstream failures`; no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/smoke-trace.ts src/lib/smoke-trace.test.ts src/lib/types.ts src/lib/server/http.ts src/lib/server/handle-air-quality.ts src/lib/server/handle-smoke-trace.ts src/lib/server/smoke-trace.test.ts src/app/api/smoke-trace/route.ts
git commit -m "Serve the smoke trace from the FIRMS and wind caches"
```

---

### Task 6: Wording in both languages

**Files:**
- Create: `src/lib/smoke-trace-copy.ts`, `src/lib/smoke-trace-copy.test.ts`
- Modify: `src/lib/i18n/dictionaries/id.ts`, `src/lib/i18n/dictionaries/en.ts` (a top-level `smokeTrace` section)

**Interfaces:**
- Consumes: `SmokeTrace` (Task 5), `CALM_RADIUS_KM` (Task 3), `aqiBand` from `src/lib/aqi.ts`, `fill`/`plural`, `Dictionary`.
- Produces:
  - `interface TraceReading { aqi: number; dominantPollutant: string | null }`
  - `type TraceVariant = 'smokeLikely' | 'fires' | 'none' | 'calmFires' | 'calmNone'`
  - `compassPoint(bearing: number): number` (`Math.round(bearing / 45) % 8`, an index into `t.map.compass`)
  - `traceVariant(trace: SmokeTrace, reading: TraceReading | null): TraceVariant`
  - `traceSentence(trace: SmokeTrace, reading: TraceReading | null, t: Dictionary, locale: Locale): string`. A null reading means the map version.
- The dictionary section, with the exact Indonesian copy below. Write the English to match in British English, with plural forms where `{n}` appears (for example "passed over {n} hotspot" / "{n} hotspots"):

```ts
smokeTrace: {
	title: 'Asal Udara, {hours} Jam Terakhir',
	smokeLikely: { one: '…', other: 'Angin {hours} jam terakhir datang dari {direction} dan melewati {n} titik api. Kelompok api terkuat ada sekitar {km} km dari sini. PM2.5 sedang tinggi, jadi asap kebakaran kemungkinan ikut menyumbang.' },
	fires: { one: '…', other: 'Angin {hours} jam terakhir datang dari {direction} dan melewati {n} titik api. Kelompok api terkuat ada sekitar {km} km dari sini. Kualitas udara di sini saat ini {band}.' },
	none: 'Angin {hours} jam terakhir datang dari {direction} tanpa melewati titik api yang terdeteksi satelit.',
	calmFires: { one: '…', other: 'Angin hampir tenang selama {hours} jam terakhir. Ada {n} titik api dalam {km} km, dan asapnya bisa mengendap di sekitar sini.' },
	calmNone: 'Angin hampir tenang selama {hours} jam terakhir, dan tidak ada titik api dalam {km} km.',
	mapFires: { one: '…', other: 'Tengah peta: angin {hours} jam terakhir datang dari {direction} dan melewati {n} titik api. Kelompok api terkuat ada sekitar {km} km dari tengah peta.' },
	mapNone: 'Tengah peta: angin {hours} jam terakhir datang dari {direction} tanpa melewati titik api yang terdeteksi satelit.',
	mapCalmFires: { one: '…', other: 'Tengah peta: angin hampir tenang selama {hours} jam terakhir. Ada {n} titik api dalam {km} km.' },
	mapCalmNone: 'Tengah peta: angin hampir tenang selama {hours} jam terakhir, dan tidak ada titik api dalam {km} km.',
	truncated: 'Jejak berhenti di batas data angin, jadi api di luar Indonesia tidak terhitung.',
	facts: { hotspots: 'Titik Api di Jalur Angin', power: 'Total Intensitas', powerValue: '{mw} MW', group: 'Kelompok Terkuat', groupValue: '{km} km ke {direction}, ±{hours} jam' },
	north: 'U',
	method: 'Perkiraan dari angin model 10 m dan deteksi satelit, bukan pengukuran asap.',
	dataTimes: 'Angin diambil {wind}. Hotspot diperbarui {fires}.',
	failed: 'Jejak asap gagal dimuat.',
	unconfigured: 'Data hotspot belum dikonfigurasi di server, jadi jejak asap belum tersedia.',
	mapSwitch: 'Jejak Asap (Tengah Peta)'
}
```

(In Indonesian `one` equals `other`, as in `detections`.)

- [ ] **Step 1: Write the failing tests** in `src/lib/smoke-trace-copy.test.ts`, using the real `id` and `en` dictionaries.

```ts
const base: SmokeTrace = {
	hours: 12, startedAt: '2026-10-21T06:00:00.000Z', windFetchedAt: '2026-10-21T04:00:00.000Z', firesFetchedAt: '2026-10-21T05:50:00.000Z',
	missingFireSources: [], calm: false, truncated: false, from: 225, path: [], hotspots: [], count: 38, totalFrp: 420, level: 'heavy',
	mainGroup: { latitude: -3.4, longitude: 104.2, count: 20, totalFrp: 300, distanceKm: 80, bearing: 230, hoursBack: 5 }
};
const trace = (over: Partial<SmokeTrace> = {}) => ({ ...base, ...over });
const smoky = { aqi: 35, dominantPollutant: 'pm25' };

it('says smoke is likely only for heavy fires, a moderate-or-worse reading and dominant PM2.5', () => {
	expect(traceSentence(trace(), smoky, id, 'id')).toBe('Angin 12 jam terakhir datang dari barat daya dan melewati 38 titik api. Kelompok api terkuat ada sekitar 80 km dari sini. PM2.5 sedang tinggi, jadi asap kebakaran kemungkinan ikut menyumbang.');
	expect(traceVariant(trace({ level: 'light' }), smoky)).toBe('fires');
	expect(traceVariant(trace(), { aqi: 35, dominantPollutant: 'o3' })).toBe('fires');
	expect(traceVariant(trace(), { aqi: 65, dominantPollutant: 'pm25' })).toBe('fires');
});
it('states fires and the reading side by side, band in lower case', () => {
	expect(traceSentence(trace({ level: 'light' }), smoky, id, 'id')).toBe('Angin 12 jam terakhir datang dari barat daya dan melewati 38 titik api. Kelompok api terkuat ada sekitar 80 km dari sini. Kualitas udara di sini saat ini rendah.');
});
it('has a no-fires sentence, calm sentences and a map version', () => {
	expect(traceSentence(trace({ count: 0, totalFrp: 0, level: 'none', mainGroup: null }), smoky, id, 'id')).toBe('Angin 12 jam terakhir datang dari barat daya tanpa melewati titik api yang terdeteksi satelit.');
	expect(traceSentence(trace({ calm: true, from: null, count: 4 }), smoky, id, 'id')).toBe('Angin hampir tenang selama 12 jam terakhir. Ada 4 titik api dalam 50 km, dan asapnya bisa mengendap di sekitar sini.');
	expect(traceSentence(trace(), null, id, 'id')).toBe('Tengah peta: angin 12 jam terakhir datang dari barat daya dan melewati 38 titik api. Kelompok api terkuat ada sekitar 80 km dari tengah peta.');
});
it('appends the truncation note and uses English plurals', () => {
	expect(traceSentence(trace({ truncated: true, level: 'light' }), smoky, id, 'id')).toMatch(/ Jejak berhenti di batas data angin, jadi api di luar Indonesia tidak terhitung\.$/);
	expect(traceSentence(trace({ count: 1, level: 'light' }), smoky, en, 'en')).toContain('1 hotspot.');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/smoke-trace-copy.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Add the `smokeTrace` section to both dictionaries and implement the module.**
  - `traceVariant` follows the spec's Wording rules. The "moderate or worse" check is `aqiBand(aqi).key` in `['moderate', 'low', 'poor']`. `none` and `calmNone` depend on `count === 0`.
  - `traceSentence` fills these placeholders: `{hours}` from `trace.hours`; `{direction}` from `t.map.compass[compassPoint(trace.from)]`; `{km}` from `mainGroup.distanceKm`, or `CALM_RADIUS_KM` when calm; `{band}` from `t.aqi.bands[key].toLocaleLowerCase(locale)`.
  - Append `' ' + t.smokeTrace.truncated` when `truncated` and not calm.

- [ ] **Step 4: Run the tests and typecheck**

Run: `npx vitest run src/lib/smoke-trace-copy.test.ts && npm run check`
Expected: PASS; `en.ts` satisfies `Dictionary`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/smoke-trace-copy.ts src/lib/smoke-trace-copy.test.ts src/lib/i18n/dictionaries/id.ts src/lib/i18n/dictionaries/en.ts
git commit -m "Word the smoke trace in Indonesian and English"
```

---

### Task 7: The location card

**Files:**
- Create: `src/lib/client/use-smoke-trace.ts`, `src/components/smoke-trace-card.tsx`, `src/components/smoke-trace-figure.tsx`
- Modify: `src/components/location-detail.tsx:347-374` (`DetailBody`)

**Interfaces:**
- Consumes: `postJson`, `toRemote`, `Remote` from `src/lib/client/api.ts`; `traceSentence` (Task 6); `INTENSITY`, `AGE`, `intensityClass`, `ageClass`, `HOTSPOT_COLOR` (Task 1); `formatDataTime`, `numberFormat` from `src/lib/format.ts`.
- Produces:
  - `useSmokeTrace(coordinates: Coordinates | null): readonly [Remote<SmokeTrace>, () => void]`. A null value means idle. A new coordinate or the retry function aborts the request in flight.
  - `SmokeTraceCard({ coordinates, current, timeZone }: { coordinates: Coordinates; current: AirQualityData; timeZone: string })`.
  - `SmokeTraceFigure({ trace }: { trace: SmokeTrace })`.

No component tests exist in this project; this task is checked in Task 9.

- [ ] **Step 1: Write `useSmokeTrace`** following `useRemoteJson` in `map-view.tsx` (abort on change, `loading` while waiting). The effect depends on the latitude and longitude numbers, not the object identity. It posts `{ latitude, longitude }` to `/api/smoke-trace` with `postJson`.

- [ ] **Step 2: Write `SmokeTraceFigure`.** It is an SVG, `aria-hidden`, north up, with the place at the centre.
  - **Projection:** a local equirectangular projection in km (`x = Δlon × 111.32 × cos(lat₀)`, `y = −Δlat × 110.57`), scaled to fit the farthest path point plus its radius, or the farthest hotspot.
  - **Corridor:** circles of the path points' radii inside one `<g>` with `fill="currentColor"`, `className="text-primary"`, `opacity={0.15}`, so overlaps don't darken.
  - **Path:** a dashed `<polyline>` in the same colour.
  - **Rings:** two or three distance rings taken from `[25, 50, 100, 200, 400]` km that fit, labelled with `tabular-nums`.
  - **North:** a short north tick labelled `t.smokeTrace.north`.
  - **Hotspots:** drawn with `INTENSITY[intensityClass(frp)].radius` and `AGE[ageClass(age)].opacity`, where `age` is the hours from `acquiredAt` to `firesFetchedAt`. Fill `HOTSPOT_COLOR`, white outline.
  - **Calm:** the single 50 km circle draws the same way.

- [ ] **Step 3: Write `SmokeTraceCard`.** A `Card` with `rounded-[20px] lg:col-span-12`:
  - **Header:** `CardTitle` `fill(t.smokeTrace.title, { hours })`.
  - **Lead:** the sentence `traceSentence(trace, { aqi: current.index.aqi, dominantPollutant: current.index.dominantPollutant }, t, locale)` in `body-copy`.
  - **Facts:** a `<dl>` styled like `TrendStats`: count, `fill(powerValue, { mw: numberFormat(locale, 0).format(totalFrp) })`, and the main group (omit that cell when null).
  - **Figure:** beside the text from `lg`, below it on phones.
  - **Footnote:** `meta-copy` with the method line, then `dataTimes` formatted with `formatDataTime(…, timeZone, locale)`, then `t.map.missingSources` when `missingFireSources` is non-empty.
  - **States:** a skeleton while loading. `error.code === 'not_configured'` shows `t.smokeTrace.unconfigured`. Any other error shows `t.smokeTrace.failed` with a retry `Button` (`RotateCw`, `t.common.retry`), as in `map-panel.tsx`.

- [ ] **Step 4: Render the card** in `DetailBody` between the pollutant card and `TrendCard`: `<SmokeTraceCard coordinates={location.coordinates} current={current} timeZone={location.timeZone} />`.

- [ ] **Step 5: Typecheck**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/client/use-smoke-trace.ts src/components/smoke-trace-card.tsx src/components/smoke-trace-figure.tsx src/components/location-detail.tsx
git commit -m "Show where a place's air came from on its detail page"
```

---

### Task 8: The map layer

**Files:**
- Create: `src/lib/client/smoke-trace-layer.ts`
- Modify: `src/lib/client/use-google-map.ts` (after `useWindOverlay`), `src/components/map-view.tsx`, `src/components/map-panel.tsx` (`LayerControls`)

**Interfaces:**
- Consumes: `useSmokeTrace` (Task 7), `traceSentence` (Task 6), `roundCoordinates`.
- Produces:
  - `createSmokeTraceOverlay(trace: SmokeTrace, color: string): google.maps.OverlayView`
  - `useSmokeTraceOverlay(state: MapState, trace: SmokeTrace | null, show: boolean): void`
  - New `LayerControls` props `showTrace: boolean`, `onShowTrace: (checked: boolean) => void`, `trace: Remote<SmokeTrace>`, `onRetryTrace: () => void`.

- [ ] **Step 1: Write `createSmokeTraceOverlay`.** An `OverlayView` holding one SVG in the `overlayLayer` pane, `pointer-events: none`, `aria-hidden`.
  - Redraw it in `draw()` from `getProjection().fromLatLngToDivPixel`.
  - Draw each corridor circle in pixels: project a point `radiusKm / 111.32`° north of the path point and measure the pixel distance.
  - Use the same group-opacity union and dashed path as the figure.
  - The colour constant in `use-google-map.ts` is `const TRACE_COLOR = '#13386b'`, with a comment that it is the brand primary (`--primary`).

- [ ] **Step 2: Add `useSmokeTraceOverlay`** beside `useWindOverlay`, with the same lifecycle: a new trace replaces the old overlay, and `show` off removes it.

- [ ] **Step 3: Wire up `MapView`.**
  - Add `const [showTrace, setShowTrace] = useState(false)`.
  - Add a local hook `useMapCentre(map, enabled)` that reads `map.getCenter()` 400 ms after the last `idle`. It clears the pending timer on every new `idle` and on unmount, and returns `roundCoordinates(...)` or null when disabled.
  - Call `const [trace, reloadTrace] = useSmokeTrace(showTrace ? centre : null)`, then `useSmokeTraceOverlay(mapState, trace.status === 'success' ? trace.data : null, showTrace)`.
  - While `showTrace` is on, show a centre crosshair: an absolutely centred, `aria-hidden`, `pointer-events-none` element over the map, about 20 px, in `text-primary`.
  - Pass the new props to `LayerControls`.

- [ ] **Step 4: Update the panel.** Add a switch row `layer-trace` labelled `t.smokeTrace.mapSwitch` after the wind row, disabled when `!mapReady || !firesConfigured`. Under it, a `TraceStatus` in the style of `WindStatus`:
  - success shows `traceSentence(trace, null, t, locale)` and the data times;
  - loading shows a skeleton;
  - `not_configured` shows `t.smokeTrace.unconfigured`;
  - other errors show `t.smokeTrace.failed` with retry;
  - nothing renders while the switch is off.

- [ ] **Step 5: Typecheck**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/client/smoke-trace-layer.ts src/lib/client/use-google-map.ts src/components/map-view.tsx src/components/map-panel.tsx
git commit -m "Draw the smoke trace for the map centre"
```

---

### Task 9: Calibrate and verify

**Files:**
- Possibly modify: `src/lib/smoke-trace.ts` (constants and their comments only)

- [ ] **Step 1: Run every check**

Run: `npm test && npm run check && npx react-doctor . -y --score`
Expected: all tests pass except the known `map.test.ts > does not cache upstream failures`; tsc clean; doctor prints `100`.

- [ ] **Step 2: Calibrate on live data.** Start the `dev` preview. Write a scratch Node script in the session scratchpad, not the repo. It pulls `id`, `latitude` and `longitude` for every entry in `src/lib/config/cities.ts` with a regex, POSTs each to `http://localhost:3000/api/smoke-trace`, and prints `id, level, count, round(totalFrp), mainGroup.distanceKm, truncated, calm`.
  - FIRMS can time out on the first call from a home connection; retry once the server cache is warm.
  - Compare three or four haze-affected cities (for example Palembang, Pekanbaru, Pontianak) with the map's hotspots and wind.
  - If a constant clearly misjudges real cases, change it and its comment, rerun the Task 3–5 tests, and note the before and after in the commit message. If the live data is quiet, keep the starting constants and say so.

- [ ] **Step 3: Check in the browser.**
  - Location pages in Indonesian: `/location/palembang` (or the nearest Sumatra city id that exists), a map point page, and `/location/me` if the browser grants location. Check the card's sentence, facts, figure, footnote and states.
  - The same pages in English under `/en/...`.
  - The map: switch on Smoke Trace, pan fast several times, and confirm (in network requests) that earlier requests were aborted and only the last centre's corridor is drawn. Confirm the crosshair, panel sentence and retry.
  - At 375 px wide: no horizontal scroll, and the figure stacks under the text.
  - The server logs (`preview_logs`): no coordinates.

- [ ] **Step 4: Commit any calibration change**

```bash
git add src/lib/smoke-trace.ts
git commit -m "Calibrate smoke trace constants on live FIRMS data"
```
