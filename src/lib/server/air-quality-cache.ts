import type { AirQualityData, Coordinates } from '@/lib/types';
import { fetchCurrentConditions, fetchForecast, fetchHistory } from './google-air-quality';

/**
 * Google Maps Platform Service Specific Terms, Air Quality API 2.2: current conditions and hourly
 * forecasts may be cached for one hour, after which they must be deleted. No entry outlives that.
 */
export const MAX_AGE_MS = 60 * 60_000;
/** Google publishes a new hourly value shortly after the hour; entries are refreshed this long after it. */
const REFRESH_AFTER_HOUR_MS = 10 * 60_000;
const HOUR_MS = 60 * 60_000;
/** About 9 KB per forecast entry, so the cap keeps the cache under 10 MB even with many map points. */
const CACHE_MAX = 1000;
const SWEEP_EVERY_MS = 5 * 60_000;

/** Whichever comes first: one hour after the fetch, or ten minutes into the next hour. */
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
}

// On globalThis: the page and the route handlers can be bundled separately, and must share one cache.
const STATE_KEY = Symbol.for('niskala.airQualityCache');
const state: CacheState = ((globalThis as Record<symbol, CacheState | undefined>)[STATE_KEY] ??= {
	entries: new Map(),
	sweeper: null
});

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

export function getCurrentConditions(coordinates: Coordinates, apiKey: string, fetchFn: typeof fetch = fetch): Promise<AirQualityData> {
	return cached(`current:${place(coordinates)}`, () => fetchCurrentConditions(coordinates, apiKey, fetchFn));
}

/** The forecast starts at the next full hour; entries expire by ten past it, so its first hour is never stale for long. */
export function getForecast(coordinates: Coordinates, apiKey: string, fetchFn: typeof fetch = fetch): Promise<AirQualityData[]> {
	return cached(`forecast:${place(coordinates)}`, () => fetchForecast(coordinates, apiKey, fetchFn));
}

/** History may be cached indefinitely, but it gains a new hour every hour, so it follows the same expiry. */
export function getHistory(
	coordinates: Coordinates,
	hours: number,
	apiKey: string,
	fetchFn: typeof fetch = fetch
): Promise<AirQualityData[]> {
	return cached(`history:${hours}:${place(coordinates)}`, () => fetchHistory(coordinates, hours, apiKey, fetchFn));
}
