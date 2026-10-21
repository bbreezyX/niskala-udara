import { AQI_BANDS, aqiBand, aqiBandIndex, type AqiBandKey } from './aqi';
import { dateTimeFormat } from './date-format';
import type { AirQualityData } from './types';

export const HOUR_MS = 3_600_000;

/** Below this many AQI points between the cleanest and most polluted window, hour-to-hour noise would pass for a pattern. */
export const PATTERN_MIN_SPREAD = 5;

/** One hour of the requested range; `hour` is null when Google sent nothing for it. */
export interface HourSlot {
	t: number;
	hour: AirQualityData | null;
}

export interface HistorySummary {
	mean: number;
	/** The latest hour holding the lowest AQI: the most recent one is the one worth pointing at. */
	worst: AirQualityData;
	best: AirQualityData;
	/** Worst band first, only bands that have hours. */
	bands: { key: AqiBandKey; count: number }[];
	/** The band with most hours; a tie goes to the worse band, so a summary never understates bad air. */
	top: AqiBandKey;
	/** Most frequent first; hours without a dominant pollutant are left out. */
	dominant: { code: string; count: number }[];
}

/** A two-hour window starting at `startHour` (0–23) in the city's time zone. */
export interface PatternWindow {
	startHour: number;
	avg: number;
}

export interface DailyPattern {
	best: PatternWindow;
	worst: PatternWindow;
}

export type PartOfDay = 'night' | 'morning' | 'midday' | 'afternoon' | 'evening';

export type DayCell = { aqi: number; color: string } | 'gap' | 'outside';

export interface DayRow {
	/** YYYY-MM-DD in the city's time zone. */
	key: string;
	/** The day's first slot in the range, for labels. */
	t: number;
	/** One cell per hour of the day; Indonesia has no daylight saving time, so always 24. */
	cells: DayCell[];
	/** Null when the day holds only gaps. */
	avg: number | null;
}

/** Hour of day (0–23) in a time zone. */
function hourIn(t: number, timeZone: string): number {
	return Number(dateTimeFormat('en', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(t));
}

/** Calendar day as YYYY-MM-DD in a time zone. */
function dayKey(t: number, timeZone: string): string {
	const parts = dateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(t);
	const part = (type: string) => parts.find((p) => p.type === type)?.value;
	return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Every hour from `range - 1` hours before the newest reading up to it. Readings arrive sorted oldest first. */
export function hourSlots(hours: AirQualityData[], range: number): HourSlot[] {
	if (hours.length === 0) return [];
	const byTime = new Map(hours.map((hour) => [Date.parse(hour.dataTime), hour]));
	const end = Date.parse(hours[hours.length - 1].dataTime);
	return Array.from({ length: range }, (_, i) => {
		const t = end - (range - 1 - i) * HOUR_MS;
		return { t, hour: byTime.get(t) ?? null };
	});
}

/** Expects at least one hour; the server answers an empty history with `no_data`. */
export function summarize(hours: AirQualityData[]): HistorySummary {
	const mean = Math.round(hours.reduce((sum, hour) => sum + hour.index.aqi, 0) / hours.length);
	const worst = hours.reduce((low, hour) => (hour.index.aqi <= low.index.aqi ? hour : low));
	const best = hours.reduce((high, hour) => (hour.index.aqi >= high.index.aqi ? hour : high));
	const bands = AQI_BANDS.map((band, i) => ({
		key: band.key,
		count: hours.filter((hour) => aqiBandIndex(hour.index.aqi) === i).length
	})).filter((band) => band.count > 0);
	const top = bands.reduce((most, band) => (band.count > most.count ? band : most)).key;
	const counts = new Map<string, number>();
	for (const hour of hours) {
		const code = hour.index.dominantPollutant;
		if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
	}
	const dominant = [...counts].map(([code, count]) => ({ code, count })).toSorted((a, b) => b.count - a.count);
	return { mean, worst, best, bands, top, dominant };
}

/** The cleanest and most polluted two-hour windows of the day, averaged over every day in `hours`. */
export function dailyPattern(hours: AirQualityData[], timeZone: string): DailyPattern | null {
	const sums = Array.from({ length: 24 }, () => ({ total: 0, n: 0 }));
	for (const hour of hours) {
		const slot = sums[hourIn(Date.parse(hour.dataTime), timeZone)];
		slot.total += hour.index.aqi;
		slot.n += 1;
	}
	const avg = sums.map(({ total, n }) => (n ? total / n : null));
	let best: { h: number; v: number } | null = null;
	let worst: { h: number; v: number } | null = null;
	for (let h = 0; h < 24; h++) {
		const a = avg[h];
		const b = avg[(h + 1) % 24];
		if (a === null || b === null) continue;
		const v = (a + b) / 2;
		if (!best || v > best.v) best = { h, v };
		if (!worst || v < worst.v) worst = { h, v };
	}
	if (!best || !worst || best.v - worst.v < PATTERN_MIN_SPREAD) return null;
	return { best: { startHour: best.h, avg: Math.round(best.v) }, worst: { startHour: worst.h, avg: Math.round(worst.v) } };
}

export function partOfDay(hour: number): PartOfDay {
	if (hour < 5) return 'night';
	if (hour < 11) return 'morning';
	if (hour < 15) return 'midday';
	if (hour < 18) return 'afternoon';
	return 'evening';
}

export function dayRows(slots: HourSlot[], timeZone: string): DayRow[] {
	const rows: DayRow[] = [];
	for (const slot of slots) {
		const key = dayKey(slot.t, timeZone);
		let row = rows.at(-1);
		if (!row || row.key !== key) {
			row = { key, t: slot.t, cells: Array.from({ length: 24 }, (): DayCell => 'outside'), avg: null };
			rows.push(row);
		}
		const index = slot.hour?.index;
		row.cells[hourIn(slot.t, timeZone)] = index ? { aqi: index.aqi, color: index.color ?? aqiBand(index.aqi).fill } : 'gap';
	}
	for (const row of rows) {
		const values = row.cells.flatMap((cell) => (typeof cell === 'object' ? [cell.aqi] : []));
		row.avg = values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;
	}
	return rows;
}
