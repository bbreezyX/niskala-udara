import { WIND_GRID } from '@/lib/config/map';
import type { ApiErrorCode, WindData } from '@/lib/types';
import { AirQualityError } from './google-air-quality';

const FREE_URL = 'https://api.open-meteo.com/v1/forecast';
const CUSTOMER_URL = 'https://customer-api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 10_000;
/** Locations per request, which keeps each URL near 1.5 KB. */
const CHUNK = 100;
/**
 * One fetch holds yesterday plus two days of hourly wind, so the current hour and the smoke trace's
 * past hours are read from it until it expires. Three days of two variables is still one Open-Meteo
 * call per location, so three hours keeps a full grid at 429 × 8 = 3,432 calls a day, inside the free 10,000.
 */
export const WIND_TTL_MS = 3 * 3_600_000;

export interface WindForecast {
	/** Hour starts, Unix seconds, shared by every location. */
	times: number[];
	/** Per location, per hour. */
	speeds: number[][];
	directions: number[][];
	fetchedAt: string;
}

/** Grid points row by row from the south-west corner, the order WindData uses. */
export function gridPoints(): { latitude: number; longitude: number }[] {
	const { west, south, step, columns, rows } = WIND_GRID;
	return Array.from({ length: rows * columns }, (_, i) => ({
		latitude: south + Math.floor(i / columns) * step,
		longitude: west + (i % columns) * step
	}));
}

interface OpenMeteoLocation {
	hourly?: { time?: number[]; wind_speed_10m?: (number | null)[]; wind_direction_10m?: (number | null)[] };
}

function errorCodeFor(status: number): ApiErrorCode {
	if (status === 429) return 'quota_exceeded';
	if (status === 401 || status === 403) return 'not_authorized';
	return 'upstream_error';
}

async function fetchChunk(
	points: { latitude: number; longitude: number }[],
	apiKey: string | undefined,
	fetchFn: typeof fetch
): Promise<OpenMeteoLocation[]> {
	const params = new URLSearchParams({
		latitude: points.map((p) => p.latitude).join(','),
		longitude: points.map((p) => p.longitude).join(','),
		hourly: 'wind_speed_10m,wind_direction_10m',
		wind_speed_unit: 'ms',
		forecast_days: '2',
		// The smoke trace looks 12 hours back, which at 07:00 WIB (00:00 UTC) reaches into yesterday.
		past_days: '1',
		timeformat: 'unixtime',
		// The grid point itself, sea or land; the default moves to a nearby land cell.
		cell_selection: 'nearest'
	});
	if (apiKey) params.set('apikey', apiKey);
	let response: Response;
	try {
		response = await fetchFn(`${apiKey ? CUSTOMER_URL : FREE_URL}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
	} catch (error) {
		const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
		throw new AirQualityError(timedOut ? 'timeout' : 'upstream_error', `wind: ${timedOut ? 'timeout' : 'network failure'}`);
	}
	if (!response.ok) throw new AirQualityError(errorCodeFor(response.status), `wind: upstream HTTP ${response.status}`);
	const json = (await response.json().catch(() => null)) as OpenMeteoLocation | OpenMeteoLocation[] | null;
	if (!json) throw new AirQualityError('upstream_error', 'wind: response is not JSON');
	// A single location comes back as an object rather than a one-item list.
	return Array.isArray(json) ? json : [json];
}

/** The full grid's hourly wind for two days. Any missing location fails the whole field. */
export async function fetchWindForecast(apiKey?: string, fetchFn: typeof fetch = fetch, now = new Date()): Promise<WindForecast> {
	const points = gridPoints();
	const chunks = Array.from({ length: Math.ceil(points.length / CHUNK) }, (_, i) => points.slice(i * CHUNK, (i + 1) * CHUNK));
	const locations = (await Promise.all(chunks.map((chunk) => fetchChunk(chunk, apiKey, fetchFn)))).flat();

	const times = locations[0]?.hourly?.time ?? [];
	if (locations.length !== points.length || times.length === 0) throw new AirQualityError('no_data', 'wind: incomplete grid');
	const speeds: number[][] = [];
	const directions: number[][] = [];
	for (const { hourly } of locations) {
		const speed = hourly?.wind_speed_10m;
		const direction = hourly?.wind_direction_10m;
		if (!speed || !direction || speed.length !== times.length || direction.length !== times.length) {
			throw new AirQualityError('no_data', 'wind: incomplete location');
		}
		// A gap stays NaN: the map draws it as calm rather than failing (see windAt), and the smoke
		// trace stops there instead of reading missing data as still air.
		speeds.push(speed.map((value) => value ?? Number.NaN));
		directions.push(direction.map((value) => value ?? Number.NaN));
	}
	return { times, speeds, directions, fetchedAt: now.toISOString() };
}

/** `|| 0` turns -0 into 0 and a missing (NaN) hour into calm, so the map's JSON never carries null. */
const round = (value: number) => Math.round(value * 10) / 10 || 0;

/** The hour containing `now`, as eastward/northward components. */
export function windAt(forecast: WindForecast, now = new Date()): WindData {
	const seconds = now.getTime() / 1000;
	const hour = forecast.times.findLastIndex((time) => time <= seconds);
	if (hour < 0 || seconds - forecast.times[hour] >= 3600) throw new AirQualityError('no_data', 'wind: hour outside forecast');
	const u: number[] = [];
	const v: number[] = [];
	forecast.speeds.forEach((speeds, i) => {
		const speed = speeds[hour];
		// Meteorological direction: where the wind comes from, clockwise from north.
		const radians = (forecast.directions[i][hour] * Math.PI) / 180;
		u.push(round(-speed * Math.sin(radians)));
		v.push(round(-speed * Math.cos(radians)));
	});
	const { west, south, step, columns, rows } = WIND_GRID;
	return {
		grid: { west, south, step, columns, rows },
		u,
		v,
		validAt: new Date(forecast.times[hour] * 1000).toISOString(),
		fetchedAt: forecast.fetchedAt
	};
}

let cache: { at: number; forecast: Promise<WindForecast> } | null = null;

/** Shares one upstream fetch across visitors and the smoke trace for WIND_TTL_MS; failures are not cached. */
export function getWindForecast(apiKey?: string, fetchFn: typeof fetch = fetch): Promise<WindForecast> {
	const now = Date.now();
	let entry = cache;
	if (!entry || now - entry.at >= WIND_TTL_MS) {
		const fresh = { at: now, forecast: fetchWindForecast(apiKey, fetchFn) };
		fresh.forecast.catch(() => {
			if (cache === fresh) cache = null;
		});
		cache = entry = fresh;
	}
	return entry.forecast;
}

export async function getWind(apiKey?: string, fetchFn: typeof fetch = fetch): Promise<WindData> {
	return windAt(await getWindForecast(apiKey, fetchFn));
}

export function clearWindCache() {
	cache = null;
}
