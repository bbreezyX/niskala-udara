import { SERVER_MAX_AGE_MS } from '@/lib/config/cache';
import { CITIES } from '@/lib/config/cities';
import type { AirQualityData, Coordinates } from '@/lib/types';
import { fetchCurrentConditions, fetchForecast, fetchHistory } from './google-air-quality';

/** Server entries never outlive this; with Cloudflare's copy on top, the total stays inside Google's hour. */
export const MAX_AGE_MS = SERVER_MAX_AGE_MS;
/** Google publishes a new hourly value shortly after the hour; entries are refreshed this long after it. */
const REFRESH_AFTER_HOUR_MS = 10 * 60_000;
const HOUR_MS = 60 * 60_000;
/** About 9 KB per forecast entry, so the cap keeps the cache under 10 MB even with many map points. */
const CACHE_MAX = 1000;
const SWEEP_EVERY_MS = 5 * 60_000;
/**
 * forecast:lookup slows down sharply when many run at once. Measured on the VPS with a region's
 * current conditions alongside: 11 forecasts in parallel took up to 9.3 s (the timeout is 10 s),
 * 6 at a time stayed under 4 s with the same total time. Current conditions do not slow down.
 */
export const FORECAST_CONCURRENCY = 6;

/** Whichever comes first: MAX_AGE_MS after the fetch, or ten minutes into the next hour. */
export function expiresAt(fetchedAt: number): number {
	const nextHour = Math.floor(fetchedAt / HOUR_MS) * HOUR_MS + HOUR_MS;
	return Math.min(fetchedAt + MAX_AGE_MS, nextHour + REFRESH_AFTER_HOUR_MS);
}

interface Entry {
	expires: number;
	value: Promise<unknown>;
}

interface CacheState {
	entries: Map<string, Entry>;
	sweeper: ReturnType<typeof setInterval> | null;
	/** Forecast calls in flight, and the ones waiting for a free slot (oldest first). */
	forecastSlots?: { active: number; waiting: (() => void)[] };
}

// On globalThis: the page and the route handlers can be bundled separately, and must share one cache.
const STATE_KEY = Symbol.for('niskala.airQualityCache');
const state: CacheState = ((globalThis as Record<symbol, CacheState | undefined>)[STATE_KEY] ??= {
	entries: new Map(),
	sweeper: null
});
const forecastSlots = (state.forecastSlots ??= { active: 0, waiting: [] });

/** Runs a forecast call once fewer than FORECAST_CONCURRENCY are in flight, across all visitors. */
async function withForecastSlot<T>(task: () => Promise<T>): Promise<T> {
	if (forecastSlots.active < FORECAST_CONCURRENCY) forecastSlots.active++;
	else await new Promise<void>((resolve) => forecastSlots.waiting.push(resolve));
	try {
		return await task();
	} finally {
		// Hand the slot straight to the next caller, so a new one cannot slip in between.
		const next = forecastSlots.waiting.shift();
		if (next) next();
		else forecastSlots.active--;
	}
}

/** Deletes expired entries even when nobody asks for them again, as the terms require. */
function sweep(now = Date.now()) {
	for (const [key, entry] of state.entries) {
		if (now >= entry.expires) state.entries.delete(key);
	}
}

/**
 * Shares one upstream request per key across visitors, including concurrent ones, until it expires.
 * Failures are not cached, so the next request tries Google again.
 */
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
	const now = Date.now();
	const hit = state.entries.get(key);
	if (hit && now < hit.expires) {
		// Re-insert so Map order doubles as least-recently-used order.
		state.entries.delete(key);
		state.entries.set(key, hit);
		return hit.value as Promise<T>;
	}

	// Measured from the request, not the response, so the data is never kept longer than allowed.
	const entry: Entry = { expires: expiresAt(now), value: load() };
	state.entries.delete(key);
	state.entries.set(key, entry);
	if (state.entries.size > CACHE_MAX) state.entries.delete(state.entries.keys().next().value!);
	entry.value.catch(() => {
		if (state.entries.get(key) === entry) state.entries.delete(key);
	});

	if (!state.sweeper) {
		state.sweeper = setInterval(sweep, SWEEP_EVERY_MS);
		state.sweeper.unref?.();
	}
	return entry.value as Promise<T>;
}

export function clearAirQualityCache() {
	state.entries.clear();
}

const place = ({ latitude, longitude }: Coordinates) => `${latitude},${longitude}`;

/** 1/200 degree, about 550 m: close to the 500 m grid of Google's air quality model. */
const GRID = 200;
const CITY_POINTS = new Set(CITIES.map((city) => place(city)));

/**
 * Configured cities are looked up at their exact reference points. Any other point (device location,
 * map click) snaps to the nearest grid point, at most about 390 m away, so nearby visitors share one
 * cached lookup instead of each costing Google calls.
 */
export function snapToGrid(coordinates: Coordinates): Coordinates {
	if (CITY_POINTS.has(place(coordinates))) return coordinates;
	return {
		latitude: Math.round(coordinates.latitude * GRID) / GRID,
		longitude: Math.round(coordinates.longitude * GRID) / GRID
	};
}

export function getCurrentConditions(coordinates: Coordinates, apiKey: string, fetchFn: typeof fetch = fetch): Promise<AirQualityData> {
	const point = snapToGrid(coordinates);
	return cached(`current:${place(point)}`, () => fetchCurrentConditions(point, apiKey, fetchFn));
}

/**
 * The forecast starts at the next full hour; entries expire by ten past it, so its first hour is never stale for long.
 * The 10 s timeout starts when the call leaves the queue, so waiting for a slot never counts against it.
 */
export function getForecast(coordinates: Coordinates, apiKey: string, fetchFn: typeof fetch = fetch): Promise<AirQualityData[]> {
	const point = snapToGrid(coordinates);
	return cached(`forecast:${place(point)}`, () => withForecastSlot(() => fetchForecast(point, apiKey, fetchFn)));
}

/** History may be cached indefinitely, but it gains a new hour every hour, so it follows the same expiry. */
export function getHistory(
	coordinates: Coordinates,
	hours: number,
	apiKey: string,
	fetchFn: typeof fetch = fetch
): Promise<AirQualityData[]> {
	const point = snapToGrid(coordinates);
	return cached(`history:${hours}:${place(point)}`, () => fetchHistory(point, hours, apiKey, fetchFn));
}
