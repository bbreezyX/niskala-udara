import { FIRE_AREA, FIRE_WINDOW_HOURS } from '@/lib/config/map';
import type { ApiErrorCode, FireData, Hotspot } from '@/lib/types';
import { AirQualityError } from './google-air-quality';

const BASE_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';
/** VIIRS (375 m) from all three satellites; MODIS (1 km) adds little over these. */
export const FIRMS_SOURCES = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT'] as const;
const TIMEOUT_MS = 10_000;
/** NASA data may be cached; FIRMS updates every few hours, so 10 minutes costs nothing in freshness. */
export const CACHE_TTL_MS = 10 * 60_000;

const SATELLITES: Record<string, string> = { N: 'Suomi NPP', N20: 'NOAA-20', N21: 'NOAA-21' };
const CONFIDENCE: Record<string, Hotspot['confidence']> = { l: 'low', n: 'nominal', h: 'high' };

/** Parses FIRMS VIIRS CSV. Rows with unusable coordinates or times are skipped. */
export function parseFirmsCsv(csv: string): Hotspot[] {
	const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
	const header = headerLine?.split(',') ?? [];
	const col = (name: string) => header.indexOf(name);
	const [lat, lon, date, time, sat, conf, frp] = [
		'latitude',
		'longitude',
		'acq_date',
		'acq_time',
		'satellite',
		'confidence',
		'frp'
	].map(col);
	if ([lat, lon, date, time].some((i) => i < 0)) throw new AirQualityError('upstream_error', 'FIRMS CSV header missing');

	const hotspots: Hotspot[] = [];
	for (const line of lines) {
		const cells = line.split(',');
		const latitude = Number(cells[lat]);
		const longitude = Number(cells[lon]);
		// acq_time is HHMM in UTC and may lose its leading zeros.
		const hhmm = (cells[time] ?? '').padStart(4, '0');
		const acquiredAt = new Date(`${cells[date]}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`);
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Number.isNaN(acquiredAt.getTime())) continue;
		const power = Number(cells[frp]);
		hotspots.push({
			latitude,
			longitude,
			acquiredAt: acquiredAt.toISOString(),
			satellite: SATELLITES[cells[sat]] ?? cells[sat] ?? 'VIIRS',
			confidence: CONFIDENCE[cells[conf]] ?? 'nominal',
			frp: Number.isFinite(power) ? power : null
		});
	}
	return hotspots;
}

/** FIRMS answers key and limit problems with a plain-text body instead of CSV. */
function errorCodeForText(text: string): ApiErrorCode {
	if (/map_key|invalid key|unauthori/i.test(text)) return 'not_authorized';
	if (/limit|exceed|too many/i.test(text)) return 'quota_exceeded';
	return 'upstream_error';
}

async function fetchSource(source: string, apiKey: string, fetchFn: typeof fetch): Promise<Hotspot[]> {
	const { west, south, east, north } = FIRE_AREA;
	// Two days back, then trimmed to the last 24 h, since FIRMS days are UTC calendar days.
	const url = `${BASE_URL}/${encodeURIComponent(apiKey)}/${source}/${west},${south},${east},${north}/2`;
	let response: Response;
	try {
		response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
	} catch (error) {
		const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
		throw new AirQualityError(timedOut ? 'timeout' : 'upstream_error', `${source}: ${timedOut ? 'timeout' : 'network failure'}`);
	}
	const text = await response.text();
	if (!response.ok || !text.startsWith('latitude')) {
		throw new AirQualityError(errorCodeForText(text), `${source}: HTTP ${response.status}, not CSV`);
	}
	return parseFirmsCsv(text);
}

export async function fetchHotspots(apiKey: string, fetchFn: typeof fetch = fetch, now = new Date()): Promise<FireData> {
	const results = await Promise.allSettled(FIRMS_SOURCES.map((source) => fetchSource(source, apiKey, fetchFn)));
	const succeeded = FIRMS_SOURCES.filter((_, i) => results[i].status === 'fulfilled');
	if (succeeded.length === 0) throw (results[0] as PromiseRejectedResult).reason;

	const since = now.getTime() - FIRE_WINDOW_HOURS * 3_600_000;
	const hotspots = results
		.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
		.filter((h) => Date.parse(h.acquiredAt) >= since)
		.sort((a, b) => Date.parse(b.acquiredAt) - Date.parse(a.acquiredAt));

	return {
		hotspots,
		windowHours: FIRE_WINDOW_HOURS,
		fetchedAt: now.toISOString(),
		sources: succeeded,
		missingSources: FIRMS_SOURCES.filter((source) => !succeeded.includes(source))
	};
}

let cache: { at: number; data: Promise<FireData> } | null = null;

/** Shares one upstream fetch across visitors for CACHE_TTL_MS; failures are not cached. */
export function getHotspots(apiKey: string, fetchFn: typeof fetch = fetch): Promise<FireData> {
	const now = Date.now();
	if (cache && now - cache.at < CACHE_TTL_MS) return cache.data;
	const data = fetchHotspots(apiKey, fetchFn);
	cache = { at: now, data };
	data.catch(() => {
		if (cache?.data === data) cache = null;
	});
	return data;
}

export function clearHotspotCache() {
	cache = null;
}
