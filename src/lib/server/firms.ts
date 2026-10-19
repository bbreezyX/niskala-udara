import { setTimeout as delay } from 'node:timers/promises';
import { Agent } from 'undici';
import { FIRE_AREA, FIRE_WINDOW_HOURS } from '@/lib/config/map';
import type { ApiErrorCode, FireData, Hotspot } from '@/lib/types';
import { AirQualityError } from './google-air-quality';
import { log } from './http';

const FIRMS_HOST = 'firms.modaps.eosdis.nasa.gov';
const BASE_URL = `https://${FIRMS_HOST}/api/area/csv`;
/** VIIRS (375 m) from all three satellites; MODIS (1 km) adds little over these. */
export const FIRMS_SOURCES = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT'] as const;
/** One budget per source, including retries and the body, below the browser's 15 s limit. */
const TIMEOUT_MS = 13_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;
const RETRYABLE_STATUSES = new Set([408, 500, 502, 503, 504]);
const RETRYABLE_NETWORK_CODES = new Set([
	'EAI_AGAIN',
	'ECONNREFUSED',
	'ECONNRESET',
	'EHOSTUNREACH',
	'ENETUNREACH',
	'EPIPE',
	'ETIMEDOUT',
	'UND_ERR_CONNECT_TIMEOUT',
	'UND_ERR_HEADERS_TIMEOUT',
	'UND_ERR_BODY_TIMEOUT',
	'UND_ERR_SOCKET'
]);
/** FIRMS alone uses IPv4: the VPS has no IPv6 route and Node's 250 ms fallback cuts IPv4 short. */
const firmsDispatcher = new Agent({ connect: { family: 4 }, autoSelectFamily: false });
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

class FirmsResponseError extends AirQualityError {
	constructor(code: ApiErrorCode, readonly reason: string, readonly retryable: boolean) {
		super(code, reason);
	}
}

/** Only error codes leave this boundary; messages, URLs, stacks and response bodies may contain the key. */
function networkErrorCodes(error: unknown, depth = 0): string[] {
	if (depth >= 4 || typeof error !== 'object' || error === null) return [];
	const codes = 'code' in error && typeof error.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)
		? [error.code]
		: [];
	const nested: unknown[] = 'errors' in error && Array.isArray(error.errors) ? error.errors.slice(0, 4) : [];
	if ('cause' in error) nested.push(error.cause);
	return [...new Set([...codes, ...nested.flatMap((cause) => networkErrorCodes(cause, depth + 1))])];
}

async function fetchSource(source: string, apiKey: string, fetchFn: typeof fetch): Promise<Hotspot[]> {
	const { west, south, east, north } = FIRE_AREA;
	// Two days back, then trimmed to the last 24 h, since FIRMS days are UTC calendar days.
	const url = `${BASE_URL}/${encodeURIComponent(apiKey)}/${source}/${west},${south},${east},${north}/2`;
	const startedAt = performance.now();
	const signal = AbortSignal.timeout(TIMEOUT_MS);
	const init = { signal, dispatcher: firmsDispatcher };
	for (let attempt = 1; ; attempt++) {
		let phase = 'request';
		let response: Response | undefined;
		try {
			response = await fetchFn(url, init);
			phase = 'body';
			const text = await response.text();
			phase = 'response';
			if (!response.ok || !text.startsWith('latitude')) {
				const code = response.status === 401 || response.status === 403
					? 'not_authorized'
					: response.status === 429 ? 'quota_exceeded' : errorCodeForText(text);
				throw new FirmsResponseError(
					code,
					response.ok ? 'non_csv_response' : 'http_error',
					code === 'upstream_error' && RETRYABLE_STATUSES.has(response.status)
				);
			}
			phase = 'csv';
			return parseFirmsCsv(text);
		} catch (error) {
			const causes = networkErrorCodes(error);
			const timedOut = signal.aborted
				|| (error instanceof DOMException && error.name === 'TimeoutError')
				|| causes.some((code) => code === 'ETIMEDOUT' || code.endsWith('_TIMEOUT'));
			const code = timedOut ? 'timeout' : error instanceof AirQualityError ? error.code : 'upstream_error';
			const reason = error instanceof FirmsResponseError ? error.reason
				: timedOut ? 'timeout' : phase === 'csv' ? 'invalid_csv' : 'network_failure';
			const retryable = error instanceof FirmsResponseError ? error.retryable
				: causes.some((cause) => RETRYABLE_NETWORK_CODES.has(cause));
			const retry = retryable && attempt < MAX_ATTEMPTS && !signal.aborted
				&& performance.now() - startedAt + RETRY_DELAY_MS < TIMEOUT_MS;
			const detail = `host=${FIRMS_HOST} source=${source} family=IPv4 attempt=${attempt}/${MAX_ATTEMPTS}`
				+ ` phase=${phase} status=${response?.status ?? 'none'} reason=${reason}`
				+ ` causes=${causes.join(',') || 'none'} outcome=${retry ? 'retry' : 'failed'}`;
			log('firms', code, detail, startedAt);
			if (!retry) throw new AirQualityError(code, detail);
			await delay(RETRY_DELAY_MS);
		}
	}
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
