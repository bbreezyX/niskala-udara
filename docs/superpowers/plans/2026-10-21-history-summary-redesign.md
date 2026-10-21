# History Summary Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the paginated hourly table on `/history` with mockup A's summary layout (average with waffle, hour-by-hour chart, dominant pollutant, per-day ribbons, selected hour, health advice), with mockup B's daily pattern card in place of A's worst/best hour tiles.

**Architecture:** All derived numbers (gap-filled hour slots, summary, daily pattern, day rows) come from pure functions in a new `src/lib/history.ts`, tested in Vitest. `HistoryView` keeps its current fetching and city/range state and renders small presentational tiles, one file per tile. The chart is a new recharts component beside `TrendChart`, sharing `useRecharts` and `ChartContainer`, so other pages are untouched.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS v4, shadcn/ui, radix-ui, recharts 3, Vitest 4.

**Spec:** Mockup canvas https://claude.ai/artifact/Srt3xeuhFGbVtVQtd1mUjf. Artboard `Main.dc.html` (A · Ringkasan bento) is the layout. The "Pola harian" column of `Dial.dc.html` (B · Jam udara, the two "Paling bersih / Paling pekat" cards and the lead sentence) replaces A's "Jam terpekat" and "Jam terbersih" tiles. Decisions this plan makes over the mockup:
- The selected hour's pollutants use the existing `PollutantBreakdown` (WHO comparison), not the mockup's 3×2 grid.
- Health advice uses the existing `Recommendation` (general advice always shown, groups opt-in), not the mockup's chip row with "Umum" preselected.
- Day ribbon cells use Google's per-hour `index.color`, falling back to the band fill, instead of an interpolated UAQI color.
- The worst and best single hours survive only as labelled markers on the chart.

## Global Constraints

- Data still comes only from `POST /api/air-quality/history` with `{ latitude, longitude, hours }`, `hours` one of `HISTORY_RANGES` (`[24, 72]`). No new requests, no browser or CDN caching of Google data (`src/lib/config/cache.ts` is untouched).
- Every user-facing string exists in `src/lib/i18n/dictionaries/id.ts` and `en.ts` (British English), as plain strings with `{name}` placeholders filled by `fill`/`plural`.
- Gambetta (`font-display`) only for the page title, through `PageIntro`. Operational headings are sans and semibold, comparable numbers use `tabular-nums`, body and advice text is `text-base`.
- Colors: brand tokens from `src/app/globals.css` and `AQI_BANDS`/`tint`/`bandEdge` from `src/lib/aqi.ts`. No Material 3 colors or state patterns. No new tokens, fonts or decorative effects.
- Tabs in TS/TSX, kebab-case filenames, `@/` imports, comments explain why.
- Indonesia has no daylight saving time, so every calendar day in a city's zone has exactly 24 hours.
- Running the test, typecheck, doctor, build and browser steps in this plan is the explicit verification request AGENTS.md requires.
- Commit steps run only if the user approved commits for this execution. Never push: pushing `main` deploys, and the deploy needs `react-doctor . -y --score` to print exactly `100`.
- Preserve unrelated edits in the working tree.

## Review Focus

1. **Hours Google skipped** (the live Jambi data misses 20 Oct 19.00 WIB): the chart line breaks, the day cell is hatched, the waffle and counts include only real hours, the table shows a "no data" row. Pinned by `hourSlots` and `dayRows` tests in Task 1, rendered in Tasks 3–5.
2. **WITA and WIT cities** (Denpasar, Jayapura): hour-of-day and calendar days are read in the city's zone, not the browser's. Pinned by the `Asia/Makassar` pattern test in Task 1.
3. **Flat air** (Denpasar over 24 hours stays within a few points): no "cleanest/most polluted" claim built on noise. Pinned by the under-5-points test in Task 1, rendered as `pattern.none` in Task 4.
4. **A window across midnight** (23.00–01.00): labelled `23.00–01.00`, not `23.00–25.00`. Pinned by the midnight test in Task 1 and the `formatHourOfDay(24)` test.
5. **24-hour range**: two partial calendar days, one sample per hour of day. The pattern still renders with "24 jam" in its lead, day rows show `outside` cells. Pinned by the `dayRows` test in Task 1, checked in the browser in Task 7.

---

## File Structure

- Create `src/lib/history.ts`: pure derivations from `AirQualityData[]`.
- Create `src/lib/history.test.ts`.
- Modify `src/lib/format.ts`, `src/lib/format.test.ts`: `formatHourOfDay`.
- Modify `src/lib/i18n/dictionaries/id.ts`, `en.ts`: the `history` section.
- Create `src/components/history-chart.tsx`: hour-by-hour chart with category bands, gaps, markers and click-to-select.
- Create `src/components/history-summary.tsx`: average, verdict sentence, waffle.
- Create `src/components/history-pattern.tsx`: daily pattern card from mockup B.
- Create `src/components/history-dominant.tsx`: dominant pollutant share.
- Create `src/components/history-days.tsx`: per-day ribbons.
- Create `src/components/history-hour.tsx`: selected hour with pollutants.
- Create `src/components/history-table.tsx`: every hour in a native disclosure, the keyboard path to selecting an hour.
- Rewrite `src/components/history-view.tsx`: state, fetching (kept), layout.
- Modify `src/app/[lang]/history/page.tsx`: the title moves into `HistoryView`.
- Modify `package.json`, `package-lock.json`: remove `@tanstack/react-table` (only `history-view.tsx` imports it today).

---

### Task 1: History derivations

**Files:**
- Create: `src/lib/history.ts`
- Create: `src/lib/history.test.ts`
- Modify: `src/lib/format.ts`
- Modify: `src/lib/format.test.ts`

**Interfaces:**
- Consumes: `AirQualityData` from `@/lib/types`; `AQI_BANDS`, `aqiBand`, `aqiBandIndex`, `type AqiBandKey` from `@/lib/aqi`; `INTL_LOCALES`, `type Locale` from `@/lib/i18n/config`.
- Produces (in `src/lib/history.ts`):
  - `HOUR_MS = 3_600_000`
  - `PATTERN_MIN_SPREAD = 5`
  - `interface HourSlot { t: number; hour: AirQualityData | null }`
  - `hourSlots(hours: AirQualityData[], range: number): HourSlot[]`: every hour from `range - 1` hours before the newest reading up to it; `[]` for no readings. Input is sorted oldest first (the server sorts it).
  - `interface HistorySummary { mean: number; worst: AirQualityData; best: AirQualityData; bands: { key: AqiBandKey; count: number }[]; top: AqiBandKey; dominant: { code: string; count: number }[] }`
  - `summarize(hours: AirQualityData[]): HistorySummary` (non-empty input): `mean` rounded; `worst`/`best` the latest hour holding the lowest/highest AQI; `bands` worst band first, only bands with hours; `top` the band with most hours, a tie going to the worse band; `dominant` most frequent first, hours without one skipped.
  - `interface PatternWindow { startHour: number; avg: number }` (a two-hour window starting at `startHour`, 0–23 in the city's zone; `avg` rounded)
  - `interface DailyPattern { best: PatternWindow; worst: PatternWindow }`
  - `dailyPattern(hours: AirQualityData[], timeZone: string): DailyPattern | null`
  - `type PartOfDay = 'night' | 'morning' | 'midday' | 'afternoon' | 'evening'`
  - `partOfDay(hour: number): PartOfDay`: 0–4 night, 5–10 morning, 11–14 midday, 15–17 afternoon, 18–23 evening.
  - `type DayCell = { aqi: number; color: string } | 'gap' | 'outside'`
  - `interface DayRow { key: string; t: number; cells: DayCell[]; avg: number | null }` (`key` is `YYYY-MM-DD` in the city's zone, `t` the first slot's instant, `cells` always 24 long, `avg` rounded over real hours, null when the day holds only gaps)
  - `dayRows(slots: HourSlot[], timeZone: string): DayRow[]`
- Produces (in `src/lib/format.ts`): `formatHourOfDay(hour: number, locale: Locale): string`, e.g. `17.00` / `17:00`; 24 wraps to `00.00`.

- [ ] **Step 1: Write the failing tests**

`src/lib/history.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { dailyPattern, dayRows, HOUR_MS, hourSlots, partOfDay, summarize } from './history';
import type { AirQualityData } from './types';

function reading(iso: string, aqi: number, dominantPollutant: string | null = 'pm25', color: string | null = null): AirQualityData {
	return {
		dataTime: iso,
		index: { displayName: 'Universal AQI', aqi, aqiDisplay: String(aqi), category: null, dominantPollutant, color },
		pollutants: [],
		recommendations: {}
	};
}

/** UTC hours on 20 Oct 2026; values past 23 roll into the next days. WIB is UTC+7. */
const at = (h: number) => new Date(Date.UTC(2026, 9, 20, h)).toISOString();

/** `count` hourly readings from UTC hour `start`, valued by their WIB hour of day. */
function series(start: number, count: number, aqiAt: (wibHour: number) => number) {
	return Array.from({ length: count }, (_, i) => reading(at(start + i), aqiAt((start + i + 7) % 24)));
}

const peaks = (h: number) => (h === 17 || h === 18 ? 40 : h === 3 || h === 4 ? 2 : 20);

describe('hourSlots', () => {
	it('lists every hour of the range ending at the newest reading, gaps as null', () => {
		const slots = hourSlots([reading(at(0), 10), reading(at(1), 12), reading(at(3), 14)], 24);
		expect(slots).toHaveLength(24);
		expect(slots[0].t).toBe(Date.parse(at(3)) - 23 * HOUR_MS);
		expect(slots.at(-1)!.hour?.index.aqi).toBe(14);
		expect(slots.at(-2)!.hour).toBeNull();
		expect(slots.filter((slot) => slot.hour).length).toBe(3);
	});

	it('returns nothing for no readings', () => {
		expect(hourSlots([], 24)).toEqual([]);
	});
});

describe('summarize', () => {
	it('averages, counts bands worst first and names the most frequent band', () => {
		const summary = summarize([reading(at(0), 10), reading(at(1), 15), reading(at(2), 25), reading(at(3), 62, 'o3')]);
		expect(summary.mean).toBe(28);
		expect(summary.bands).toEqual([{ key: 'poor', count: 2 }, { key: 'low', count: 1 }, { key: 'good', count: 1 }]);
		expect(summary.top).toBe('poor');
		expect(summary.dominant).toEqual([{ code: 'pm25', count: 3 }, { code: 'o3', count: 1 }]);
	});

	it('takes the latest hour when the worst or best value repeats', () => {
		const summary = summarize([reading(at(0), 5), reading(at(1), 30), reading(at(2), 5), reading(at(3), 30)]);
		expect(summary.worst.dataTime).toBe(at(2));
		expect(summary.best.dataTime).toBe(at(3));
	});

	it('gives a tied band count to the worse band', () => {
		expect(summarize([reading(at(0), 10), reading(at(1), 70)]).top).toBe('poor');
	});

	it('skips hours without a dominant pollutant', () => {
		expect(summarize([reading(at(0), 10, null), reading(at(1), 12)]).dominant).toEqual([{ code: 'pm25', count: 1 }]);
	});
});

describe('dailyPattern', () => {
	it('finds the cleanest and most polluted two-hour windows in the city zone', () => {
		expect(dailyPattern(series(0, 48, peaks), 'Asia/Jakarta')).toEqual({
			best: { startHour: 17, avg: 40 },
			worst: { startHour: 3, avg: 2 }
		});
	});

	it('reads hours in the city’s own zone', () => {
		expect(dailyPattern(series(0, 48, peaks), 'Asia/Makassar')).toEqual({
			best: { startHour: 18, avg: 40 },
			worst: { startHour: 4, avg: 2 }
		});
	});

	it('lets a window cross midnight', () => {
		const hours = series(0, 24, (h) => (h === 23 || h === 0 ? 1 : 30));
		expect(dailyPattern(hours, 'Asia/Jakarta')?.worst).toEqual({ startHour: 23, avg: 1 });
	});

	it('claims no pattern when windows differ by less than 5 points', () => {
		expect(dailyPattern(series(0, 24, (h) => 60 + (h % 3)), 'Asia/Jakarta')).toBeNull();
	});

	it('claims no pattern without two adjacent hours', () => {
		expect(dailyPattern([reading(at(0), 10)], 'Asia/Jakarta')).toBeNull();
	});
});

describe('partOfDay', () => {
	it('names the part of day a window starts in', () => {
		expect([0, 4, 5, 10, 11, 14, 15, 17, 18, 23].map(partOfDay)).toEqual([
			'night', 'night', 'morning', 'morning', 'midday', 'midday', 'afternoon', 'afternoon', 'evening', 'evening'
		]);
	});
});

describe('dayRows', () => {
	it('splits the range into calendar days of 24 cells in the city zone', () => {
		// 22.00 WIB on 20 Oct to 02.00 WIB on 21 Oct, with 00.00 missing.
		const hours = [reading(at(15), 10, 'pm25', 'rgb(255 0 0)'), reading(at(16), 12), reading(at(18), 14), reading(at(19), 16)];
		const rows = dayRows(hourSlots(hours, 5), 'Asia/Jakarta');
		expect(rows.map((row) => row.key)).toEqual(['2026-10-20', '2026-10-21']);
		expect(rows[0].cells).toHaveLength(24);
		expect(rows[0].cells[21]).toBe('outside');
		expect(rows[0].cells[22]).toEqual({ aqi: 10, color: 'rgb(255 0 0)' });
		expect(rows[1].cells[0]).toBe('gap');
		expect(rows[1].cells[1]).toEqual({ aqi: 14, color: '#c5221f' });
		expect(rows[1].cells[3]).toBe('outside');
		expect(rows.map((row) => row.avg)).toEqual([11, 15]);
	});

	it('gives a day that holds only gaps no average', () => {
		// The range opens at 23.00 WIB on 20 Oct, but the first reading is 01.00 WIB on 21 Oct.
		const rows = dayRows(hourSlots([reading(at(18), 14)], 3), 'Asia/Jakarta');
		expect(rows[0].cells[23]).toBe('gap');
		expect(rows[0].avg).toBeNull();
	});
});
```

Add to `src/lib/format.test.ts` (and `formatHourOfDay` to its import):

```ts
	it('formats an hour of day per language, wrapping 24 to midnight', () => {
		expect(formatHourOfDay(17, 'id')).toBe('17.00');
		expect(formatHourOfDay(17, 'en')).toBe('17:00');
		expect(formatHourOfDay(24, 'id')).toBe('00.00');
	});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/history.test.ts src/lib/format.test.ts`
Expected: FAIL, `history.ts` cannot be resolved and `formatHourOfDay` is not exported.

- [ ] **Step 3: Implement `src/lib/history.ts` and `formatHourOfDay`**

Hour of day and calendar day in a zone come from cached `Intl.DateTimeFormat`s: `en-GB` with `hour: '2-digit', hourCycle: 'h23'` for the hour, `en-CA` with year/month/day for the `YYYY-MM-DD` key. `dailyPattern` averages each hour of day, scores each window `(h, (h + 1) % 24)` whose two hours both have data, keeps the first highest and first lowest, and returns null when there is no window or when best minus worst (unrounded) is under `PATTERN_MIN_SPREAD`. A day cell's color is `hour.index.color ?? aqiBand(aqi).fill`. `formatHourOfDay` formats `Date.UTC(2000, 0, 1, hour % 24)` with `hour: '2-digit', minute: '2-digit', timeZone: 'UTC'` in `INTL_LOCALES[locale]`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/history.test.ts src/lib/format.test.ts`
Expected: PASS, all tests in both files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/history.ts src/lib/history.test.ts src/lib/format.ts src/lib/format.test.ts
git commit -m "Derive history summary, daily pattern and day rows from hourly readings"
```

---

### Task 2: History copy in both languages

**Files:**
- Modify: `src/lib/i18n/dictionaries/id.ts` (`history` section)
- Modify: `src/lib/i18n/dictionaries/en.ts` (`history` section)

**Interfaces:**
- Produces: the keys below under `t.history`. This task only adds keys and changes `rangeOption`; Task 6 removes the keys the old table used, so the current view keeps compiling until then.

- [ ] **Step 1: Add the keys, Indonesian | English**

| Key | id | en |
|---|---|---|
| `rangeOption` (value change) | `{n} jam` | `{n} hours` |
| `meta` | `{name} · {from} – {to} {zone}` | `{name} · {from} – {to} {zone}` |
| `hours` | `{ one: '{n} jam', other: '{n} jam' }` | `{ one: '{n} hour', other: '{n} hours' }` |
| `summary.average` | `Rata-rata {n} jam terakhir` | `Average over the last {n} hours` |
| `summary.verdict` | `{band} di {count} dari {total} jam.` | `{band} in {count} of {total} hours.` |
| `summary.ceiling` | `Belum sekali pun mencapai {band}.` | `Never reached {band}.` |
| `summary.peak` | `Sempat {band} pada {time}.` | `Reached {band} at {time}.` |
| `summary.waffle` | `Satu kotak satu jam, diurutkan per kategori` | `One square per hour, sorted by category` |
| `chart.title` | `Naik turun per jam` | `Hour by hour` |
| `chart.note` | `Pita latar menandai kategori. Garis terputus berarti jam itu tanpa data.` | `Background bands mark the categories. A break in the line means no data for that hour.` |
| `chart.worst` | `Terpekat` | `Worst` |
| `chart.best` | `Terbersih` | `Best` |
| `chart.latest` | `Terakhir` | `Latest` |
| `pattern.title` | `Pola harian` | `Daily pattern` |
| `pattern.lead` | `Rata-rata tiap jam selama {n} jam terakhir.` | `Average for each hour of the day over the last {n} hours.` |
| `pattern.tendency` | `Udara cenderung paling bersih {best} dan paling pekat {worst}.` | `The air tends to be cleanest {best} and most polluted {worst}.` |
| `pattern.cleanest` | `Paling bersih` | `Cleanest` |
| `pattern.dirtiest` | `Paling pekat` | `Most polluted` |
| `pattern.average` | `rata-rata {avg} · {band}` | `average {avg} · {band}` |
| `pattern.none` | `Belum ada pola jam yang jelas di rentang ini.` | `No clear hourly pattern in this range.` |
| `pattern.parts` | `{ night: 'dini hari', morning: 'pagi', midday: 'siang', afternoon: 'sore', evening: 'malam' }` | `{ night: 'before dawn', morning: 'in the morning', midday: 'around midday', afternoon: 'in the afternoon', evening: 'in the evening' }` |
| `dominant.title` | `Polutan dominan` | `Main pollutant` |
| `dominant.share` | `Paling menentukan AQI di {count} dari {total} jam.` | `Set the AQI in {count} of {total} hours.` |
| `days.title` | `Per hari` | `By day` |
| `days.average` | `rata-rata` | `average` |
| `hour.latest` | `Jam terakhir` | `Latest hour` |
| `hour.picked` | `Jam terpilih` | `Selected hour` |
| `hour.hint` | `Pilih titik di grafik atau baris di tabel untuk jam lain.` | `Pick a point on the chart or a row in the table to see another hour.` |
| `hour.back` | `Kembali ke jam terakhir` | `Back to the latest hour` |
| `table.summary` | `Semua jam dalam tabel ({n})` | `All hours as a table ({n})` |
| `table.show` | `Lihat` | `Show` |
| `table.noData` | `Tidak ada data` | `No data` |
| `columns.category` | `Kategori` | `Category` |
| `caption` (value change) | `Kualitas udara per jam di {name}, terbaru di atas.` | `Hourly air quality in {name}, newest first.` |

`pattern.parts` keys match `PartOfDay` from Task 1. Kept as they are: `rangeLabel`, `latest`, `trendLabel`, `showHour`, `columns.hour/aqi/pollutant`.

- [ ] **Step 2: Typecheck**

Run: `npm run check`
Expected: exit 0. If the only errors are under `.next/types`, they are stale build output: run `npm run build` once, then `npm run check` again.

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/dictionaries/id.ts src/lib/i18n/dictionaries/en.ts
git commit -m "Add copy for the history summary layout in both languages"
```

---

### Task 3: Hour-by-hour chart

**Files:**
- Create: `src/components/history-chart.tsx`

**Interfaces:**
- Consumes: `HourSlot` (Task 1); `t.history.chart.*`, `t.chart.summary`, `t.aqi.bands` (Task 2 and existing); `useRecharts` from `@/lib/client/recharts`; `ChartContainer` from `@/components/ui/chart`; `AQI_BANDS` from `@/lib/aqi`; `dateTimeFormat` from `@/lib/date-format`.
- Produces: `HistoryChart(props: { slots: HourSlot[]; timeZone: string; selected: number; marks: { worst: AirQualityData; best: AirQualityData; latest: AirQualityData }; onSelect: (t: number) => void; label: string })`, where `selected` is the selected slot's `t`.

- [ ] **Step 1: Build `HistoryChart` following `TrendChart`'s loading pattern**

The `<figure role="img">` carries `fill(t.chart.summary, { label, min, max })` and renders at once; the plot waits for recharts in `<Suspense>` behind a same-height placeholder (`h-72 sm:h-80`), and the plot itself is `aria-hidden`. Keyboard selection lives in Task 5's table, so the chart needs no focus handling.

Plot rules:
- Rows are `{ t, aqi: number | null }` from `slots`; one `Area` on `aqi` with `connectNulls={false}`, stroke `var(--primary)`, the same gradient fill as `TrendChart`, `isAnimationActive={false}`.
- `YAxis` domain `[0, 100]`, ticks `[0, 20, 40, 60, 80, 100]`.
- One `ReferenceArea` per `AQI_BANDS` entry from `band.min` to the next band's `min` (100 for the last), `fill={band.fill}`, `fillOpacity={0.1}`, label `t.aqi.bands[band.key]` at `insideTopRight` in `band.ink`, `0.75rem`. Draw them before the `Area`.
- A `ReferenceLine` in `var(--border)` at each slot whose hour in `timeZone` is 0. `XAxis` ticks at the first slot and those midnights, labelled with `dateTimeFormat(locale, { weekday: 'short', day: 'numeric', timeZone })`.
- `ReferenceDot`s for `marks.worst`, `marks.best` and `marks.latest` (skip latest when its `dataTime` equals worst's or best's), fill = that hour's band fill, white 2px stroke, label `"{chart.worst|best|latest} {aqi}"`, placed `bottom` when AQI ≥ 60, otherwise `top`, and `left` for latest so it stays inside the plot at the right edge.
- When `selected` is not the latest hour, one more `ReferenceDot` at it: `r={6}`, fill `var(--primary)`, white 3px stroke.
- `onClick` on the `AreaChart` reads the click state's `activeIndex`, and calls `onSelect(slot.t)` only when that slot has a reading. The chart wrapper gets `cursor-pointer`.

- [ ] **Step 2: Typecheck**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/history-chart.tsx
git commit -m "Add the hour-by-hour history chart with category bands and gaps"
```

---

### Task 4: Summary tiles

**Files:**
- Create: `src/components/history-summary.tsx`
- Create: `src/components/history-pattern.tsx`
- Create: `src/components/history-dominant.tsx`
- Create: `src/components/history-days.tsx`

**Interfaces:**
- Consumes: `HistorySummary`, `DailyPattern`, `DayRow`, `partOfDay` (Task 1); `formatHourOfDay` (Task 1); copy from Task 2; `AqiBadge`; `AQI_BANDS`, `aqiBand`, `bandEdge`, `tint`, `UAQI_GRADIENT` from `@/lib/aqi`; `pollutantLabel`, `formatDay`, `formatHour` from `@/lib/format`; `fill`, `plural` from `@/lib/i18n/config`; `Sun`, `Moon` from `lucide-react`; `HistoryRange` from `@/lib/coordinates`.
- Produces:
  - `SummaryTile(props: { summary: HistorySummary; range: HistoryRange; total: number; timeZone: string })`
  - `PatternTile(props: { pattern: DailyPattern | null; range: HistoryRange })`
  - `DominantTile(props: { dominant: HistorySummary['dominant']; total: number })`
  - `DaysTile(props: { rows: DayRow[]; timeZone: string })`

Shared tile shell (match the current history aside): `<section>` with `aria-labelledby` on its heading, `rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6`. Small tile labels are `text-sm font-semibold text-muted-foreground`; larger titles use `panel-title`.

- [ ] **Step 1: `SummaryTile`**

Background `tint(meanBand.fill, 9)` instead of `bg-card`, where `meanBand = aqiBand(summary.mean)`. Top to bottom: label `fill(summary.average, { n: range })`; the mean in `text-7xl font-semibold tabular-nums` colored `meanBand.ink`, beside `<AqiBadge aqi={summary.mean} category={null} color={meanBand.fill} />` and `t.common.scale` (`text-sm`); the verdict paragraph (`body-copy`): `summary.verdict` with the top band's name as written, followed by `summary.ceiling` with the next band's name lowercased when the best hour is below Sangat baik, otherwise `summary.peak` with the best hour's band lowercased and `"{formatDay} {formatHour}"` of `summary.best.dataTime`; then the waffle: caption `summary.waffle` with `plural(t.history.hours, total)` on the right, a `grid-cols-24 gap-[3px]` of `aria-hidden` squares (`aspect-square rounded-[3px]`, band fill plus `bandEdge(band)`), one per hour, built from `summary.bands` in order; and a legend with one band swatch and `"{band name} {plural(hours, count)}"` per entry.

- [ ] **Step 2: `PatternTile`**

Heading `pattern.title`. Lead paragraph: `fill(pattern.lead, { n: range })` plus, when `pattern` is not null, `pattern.tendency` with `pattern.parts[partOfDay(best.startHour)]` and the same for worst. Then two cards side by side from `sm:` (`grid sm:grid-cols-2 gap-3`), each `rounded-xl bg-muted p-4` with: an icon in a `size-11` white circle, `Sun` when `6 ≤ startHour < 18`, otherwise `Moon`, `aria-hidden`; label `pattern.cleanest` or `pattern.dirtiest` (`text-sm text-muted-foreground`); the window `"{formatHourOfDay(startHour)}–{formatHourOfDay(startHour + 2)}"` in `text-2xl font-semibold tabular-nums`; and a band dot plus `fill(pattern.average, { avg, band: band name of avg })`. When `pattern` is null, the lead is followed by `pattern.none` instead of the cards.

- [ ] **Step 3: `DominantTile`**

Heading `dominant.title`. When `dominant` is empty, show `t.common.notAvailable` and nothing else. Otherwise: `pollutantLabel(dominant[0].code)` in `text-4xl font-semibold`; `fill(dominant.share, { count, total })` as `body-copy`; then one row per entry: label (`w-14 font-semibold`), a `h-2 rounded-full bg-muted` track with a `bg-primary` fill at `count / total`, and `plural(hours, count)` right-aligned in `tabular-nums`. The bars are `aria-hidden`; the row text carries the numbers.

- [ ] **Step 4: `DaysTile`**

Header row: heading `days.title`, and `days.average` right-aligned in `text-sm text-muted-foreground`. One row per `DayRow`: `formatDay` of `row.t` (`w-20 shrink-0 text-sm font-semibold`), a `grid-cols-24 gap-0.5 h-5` ribbon (`aria-hidden`) whose cells are the cell's `color` for readings, `repeating-linear-gradient(45deg, var(--surface-hover) 0 3px, var(--card) 3px 6px)` for `'gap'`, and a transparent cell with a `ring-1 ring-inset ring-border` for `'outside'`; then `row.avg` (`w-8 text-right font-semibold tabular-nums`, colored `aqiBand(avg).ink`), or a muted `–` when it is null. Under the ribbons, `00 06 12 18 24` aligned to the ribbon column. Last, a scale: `t.aqi.bands.poor`, a `h-1.5 rounded-full` bar with `UAQI_GRADIENT`, `t.aqi.bands.excellent`. Give the ribbon group an `sr-only` sentence per day, `"{formatDay}: {days.average} {avg}"`, so the tile reads without the colors.

- [ ] **Step 5: Typecheck**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/history-summary.tsx src/components/history-pattern.tsx src/components/history-dominant.tsx src/components/history-days.tsx
git commit -m "Add the history summary, daily pattern, dominant pollutant and per-day tiles"
```

---

### Task 5: Selected hour and the hours table

**Files:**
- Create: `src/components/history-hour.tsx`
- Create: `src/components/history-table.tsx`

**Interfaces:**
- Consumes: `HourSlot` (Task 1); copy from Task 2; `AqiBadge`, `PollutantBreakdown`, `Button`, `Table*` from `@/components/ui/table`; `aqiBand`; `formatDataTime`, `formatDay`, `formatHour`, `pollutantLabel`; `City` from `@/lib/config/cities`.
- Produces:
  - `HourTile(props: { hour: AirQualityData; timeZone: string; isLatest: boolean; onBack: () => void; ref?: React.Ref<HTMLElement> })`
  - `HoursTable(props: { slots: HourSlot[]; city: City; selected: number; onSelect: (t: number) => void })`

- [ ] **Step 1: `HourTile`**

The tile shell from Task 4, plus `scroll-mt-20` and `@container`. Header row (wraps on small screens): heading `hour.latest` or `hour.picked`; under it `<time dateTime={hour.dataTime}>` with `formatDataTime`, followed by `hour.hint` when `isLatest`, or an outline `Button` (`size="lg"`) with `hour.back` that calls `onBack` when not. On the right, the AQI in `text-4xl font-semibold tabular-nums` colored `aqiBand(aqi).ink` and `<AqiBadge>` from `hour.index`. Below, `<h3>` `t.pollutants.levelsThisHour` and `<PollutantBreakdown pollutants={hour.pollutants} dominant={hour.index.dominantPollutant} />`.

- [ ] **Step 2: `HoursTable`**

A native `<details>` in the tile shell (`py-0`). Its `<summary>` is `flex min-h-14 items-center justify-between font-semibold` with `fill(table.summary, { n: hours with a reading })` and a `ChevronDown` that turns 180° when open (`group-open:` on `<details className="group">`). Inside, the shadcn `Table` with `TableCaption` `sr-only` `fill(caption, { name: city.name })`, columns `columns.hour`, `columns.aqi`, `columns.category`, `columns.pollutant`, and an empty header for the action. Rows newest first. A row with a reading: hour (`formatHour` over `formatDay`, `tabular-nums`), AQI (`font-semibold tabular-nums`), band name, `pollutantLabel` or `–`, and a ghost `Button` `table.show` with `aria-pressed` for the selected row and `aria-label` `fill(showHour, { time: "{hour}, {day}" })` that calls `onSelect(slot.t)`. The selected row gets `data-state="selected"`. A gap row: the hour, then `table.noData` across the remaining cells in `text-muted-foreground`.

- [ ] **Step 3: Typecheck**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/history-hour.tsx src/components/history-table.tsx
git commit -m "Add the selected hour tile and the all-hours table for history"
```

---

### Task 6: Wire the new layout into the history page

**Files:**
- Rewrite: `src/components/history-view.tsx`
- Modify: `src/app/[lang]/history/page.tsx`
- Modify: `src/lib/i18n/dictionaries/id.ts`, `src/lib/i18n/dictionaries/en.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: everything Tasks 1–5 produce; `PageIntro`; `CityPicker`, `useNearby`; `Recommendation`, `Attribution`, `DataUnavailable` from `./info-blocks`; `ToggleGroup as ToggleGroupPrimitive` from `radix-ui`; `Skeleton`.
- Produces: `HistoryView(props: { configured: boolean; title: string })`.

- [ ] **Step 1: Keep the data flow, replace the rendering**

Keep from the current file, unchanged: `firstCity`, the `pickedId`/`useNearby`/`range`/`history`/`selectedTime`/`reloadVersion` state, the `settling` rule, the fetch effect, `HistoryError`, and the not-configured `DataUnavailable`. Delete the table, pager, `HourDetail`, `deltaOf`, the column helpers and every `@tanstack/react-table` import.

Derive with `useMemo` from the successful data: `slots = hourSlots(hours, range)`, `summary = summarize(hours)`, `pattern = dailyPattern(hours, city.timeZone)`, `days = dayRows(slots, city.timeZone)`; `latest = hours.at(-1)`, `selected = hours.find((h) => Date.parse(h.dataTime) === selectedTime) ?? latest`. `select(t)` sets `selectedTime` and scrolls the hour tile `{ block: 'nearest' }`, `behavior: 'auto'` when `prefers-reduced-motion: reduce` matches, otherwise `'smooth'`. `onBack` sets `selectedTime` to null.

- [ ] **Step 2: Layout**

Split the render into `HistoryHeader` and `HistoryBody` components in the same file so each stays small enough for react-doctor.

- `HistoryHeader`: `flex flex-wrap items-end justify-between gap-x-6 gap-y-4`. Left: `<PageIntro title={title} />`, then a `text-sm text-muted-foreground` line `fill(history.meta, { name, from: "{formatDay} {formatHour}" of the first hour, to: same for latest, zone: timeZoneLabel(city.timeZone) })` + ` · ` + `fill(history.latest, { time })`, shown once data has loaded. Right: `<CityPicker variant="field" …>` wired as today, and the range toggle: `ToggleGroupPrimitive.Root type="single"` with `aria-label={history.rangeLabel}`, value `String(range)`, ignoring an empty value so one option stays selected; styled as a pill track (`rounded-full bg-muted p-1`), items `min-h-11 rounded-full px-4 text-sm font-semibold text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50`, text `fill(history.rangeOption, { n })`.
- `HistoryBody`, a `grid gap-4`:
  1. `lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]`: `SummaryTile`, then a chart tile (shell from Task 4) with `chart.title` as `panel-title`, `chart.note` in `text-sm text-muted-foreground`, and `HistoryChart` with `label = fill(trendLabel, { name, n: range })`.
  2. `md:grid-cols-2 xl:grid-cols-12`: `PatternTile` (`md:col-span-2 xl:col-span-5`), `DominantTile` (`xl:col-span-3`), `DaysTile` (`xl:col-span-4`).
  3. `lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]`: `HourTile` with the ref, and `Recommendation` for the selected hour with `className="rounded-2xl border-0 bg-card p-5 ring-1 ring-foreground/10 sm:p-6"`.
  4. `HoursTable`.
  5. `<Attribution />`, once, as the last child (Google Maps Platform policy).
- Loading (`idle`/`loading`): the same grid with `Skeleton`s at the tiles' heights: `h-96` for row 1, `h-56` for row 2, `h-80` for row 3, `h-14` for the table. The header shows the picker and toggle and no meta line.
- Error: `HistoryError` in place of the body.

- [ ] **Step 3: Move the title into the view**

In `src/app/[lang]/history/page.tsx`, drop the `PageIntro` import and element and render `<HistoryView configured={Boolean(airQualityKey())} title={pages.history.heading} />` inside the existing `page-frame` wrapper.

- [ ] **Step 4: Remove what the old table used**

Delete from `history` in both dictionaries: `kicker`, `columns.change`, `delta`, `pagesLabel`, `previous`, `next`, `page`, `trendTitle`, `detail`. Then run `npm uninstall @tanstack/react-table`, which updates `package.json` and `package-lock.json`.

- [ ] **Step 5: Typecheck and tests**

Run: `npm run check && npm test`
Expected: tsc exits 0; Vitest reports every file passing. `src/lib/server/map.test.ts` "does not cache upstream failures" failed before this work; if it is the only failure, record it as pre-existing rather than fixing it here.

- [ ] **Step 6: Commit**

```bash
git add src/components/history-view.tsx "src/app/[lang]/history/page.tsx" src/lib/i18n/dictionaries/id.ts src/lib/i18n/dictionaries/en.ts package.json package-lock.json
git commit -m "Lead Riwayat with a summary, daily pattern and chart instead of the hourly table"
```

---

### Task 7: Verify the page

**Files:** none changed unless a check fails; fix in the task that owns the file and re-run from Step 1.

- [ ] **Step 1: Deploy gate**

Run: `npx react-doctor . -y --score`
Expected: prints exactly `100`.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: completes without errors.

- [ ] **Step 3: Browser check**

Start the `dev` entry of `.claude/launch.json` with `preview_start`, then on `/history` and `/en/history`:
- At 1440, 1024 and 375 px wide: no horizontal scroll; the rows collapse as in Task 6 Step 2; the range toggle and picker wrap under the title on phones.
- Kota Jambi (WIB) on 72 and 24 hours: the chart line breaks at a missing hour if the current data has one; the day rows show partial days with outlined cells; the pattern card shows two windows or `pattern.none`.
- Denpasar (WITA): pattern windows and day boundaries follow WITA, the meta line says WITA.
- Click a chart point: the hour tile switches to "Jam terpilih" and the back button returns to the latest hour. Open the table, tab to a "Lihat" button, press Enter: the same selection happens and the tile scrolls into view.
- English page: British copy, `17:00` times, no Indonesian strings left.
- `read_console_messages` with `onlyErrors`: none from this page.

Expected: every item holds. Take one desktop and one phone screenshot for the report.

- [ ] **Step 4: Report**

State which checks ran and passed, any that failed with their output, and that nothing was pushed.
