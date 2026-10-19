import { setTimeout as delay } from 'node:timers/promises';
import { HEATMAP_TILE_MAX_AGE_MS } from '@/lib/config/cache';
import { MAP_ZOOM } from '@/lib/config/map';
import { tileInBounds } from '@/lib/tile-bounds';
import { getHotspots } from './firms';
import { getWind } from './wind';
import { AirQualityError } from './google-air-quality';
import { fail, isCrossSite, log, respond } from './http';

const TILE_URL = 'https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles';
/** The full tile request, including a retry and body transfer, shares this budget. */
const TIMEOUT_MS = 10_000;
const TILE_MAX_ATTEMPTS = 2;
const TILE_RETRYABLE_STATUSES = new Set([408, 500, 502, 503, 504]);
const TILE_RETRYABLE_NETWORK_CODES = new Set([
	'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'ETIMEDOUT',
	'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET'
]);

/** GET /api/fires: hotspots across Indonesia over the last 24 hours. */
export async function handleFiresRequest(
	request: Request,
	apiKey: string | undefined,
	fetchFn: typeof fetch = fetch
): Promise<Response> {
	const startedAt = performance.now();
	if (isCrossSite(request)) return fail('invalid_request', 403);
	if (!apiKey) {
		log('fires', 'not_configured', 'FIRMS_MAP_KEY is not set', startedAt);
		return fail('not_configured');
	}
	try {
		const data = await getHotspots(apiKey, fetchFn);
		if (data.missingSources.length > 0) {
			log('fires', 'upstream_error', `partial: missing ${data.missingSources.join(', ')}`, startedAt);
		}
		return respond({ data }, 200, 'public, max-age=300');
	} catch (error) {
		const code = error instanceof AirQualityError ? error.code : 'upstream_error';
		log('fires', code, error instanceof Error ? error.message : 'unexpected', startedAt);
		return fail(code);
	}
}

/** Strict integer parsing: "07", "1e2" or "-0" are not tile coordinates. */
function toInt(value: string): number | null {
	return /^(0|[1-9]\d{0,5})$/.test(value) ? Number(value) : null;
}

interface Tile {
	body: ArrayBuffer;
	contentType: string;
}

/**
 * Server and browser HTTP copies share a 30-minute deadline. A decoded browser fallback can
 * add at most five minutes; the combined 35-minute age stays below Google's one-hour limit.
 */
export const TILE_TTL_MS = HEATMAP_TILE_MAX_AGE_MS;
/** About 25 KB per tile, so the cap keeps the cache near 10 MB. */
const TILE_CACHE_MAX = 400;
const tileCache = new Map<string, { at: number; tile: Promise<Tile> }>();

/** Preserve transport codes through cause/AggregateError without logging URLs, keys or coordinates. */
function tileErrorCodes(error: unknown, depth = 0): string[] {
	if (depth >= 4 || typeof error !== 'object' || error === null) return [];
	const codes = 'code' in error && typeof error.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)
		? [error.code] : [];
	const nested: unknown[] = 'errors' in error && Array.isArray(error.errors) ? error.errors.slice(0, 4) : [];
	if ('cause' in error) nested.push(error.cause);
	return [...new Set([...codes, ...nested.flatMap((cause) => tileErrorCodes(cause, depth + 1))])];
}

async function fetchTile(path: string, apiKey: string, fetchFn: typeof fetch): Promise<Tile> {
	const startedAt = performance.now();
	const signal = AbortSignal.timeout(TIMEOUT_MS);
	for (let attempt = 1; ; attempt++) {
		let response: Response | undefined;
		let phase = 'request';
		let retryable = false;
		try {
			response = await fetchFn(`${TILE_URL}/${path}`, {
				headers: { 'x-goog-api-key': apiKey },
				signal
			});
			phase = 'response';
			const contentType = response.headers.get('content-type') ?? '';
			if (!response.ok || !contentType.startsWith('image/')) {
				const code = response.status === 429 ? 'quota_exceeded'
					: response.status === 400 || response.status === 401 || response.status === 403 ? 'not_authorized' : 'upstream_error';
				retryable = TILE_RETRYABLE_STATUSES.has(response.status);
				await response.body?.cancel().catch(() => {});
				throw new AirQualityError(code, `upstream HTTP ${response.status}`);
			}
			phase = 'body';
			return { body: await response.arrayBuffer(), contentType };
		} catch (error) {
			const causes = tileErrorCodes(error);
			const timedOut = signal.aborted
				|| (error instanceof DOMException && error.name === 'TimeoutError')
				|| causes.some((code) => code === 'ETIMEDOUT' || code.endsWith('_TIMEOUT'));
			const code = timedOut ? 'timeout' : error instanceof AirQualityError ? error.code : 'upstream_error';
			retryable ||= causes.some((cause) => TILE_RETRYABLE_NETWORK_CODES.has(cause));
			// Jitter prevents a viewport's failed tiles from retrying Google in lockstep.
			const retryDelay = 200 + Math.floor(Math.random() * 150);
			const retry = retryable && attempt < TILE_MAX_ATTEMPTS && !signal.aborted
				&& performance.now() - startedAt + retryDelay < TIMEOUT_MS;
			const detail = `host=airquality.googleapis.com attempt=${attempt}/${TILE_MAX_ATTEMPTS}`
				+ ` phase=${phase} status=${response?.status ?? 'none'} causes=${causes.join(',') || 'none'}`
				+ ` outcome=${retry ? 'retry' : 'failed'}`;
			log('tiles', code, detail, startedAt);
			if (!retry) throw new AirQualityError(code, detail);
			await delay(retryDelay);
		}
	}
}

/** Shares one upstream fetch per tile across visitors, including concurrent ones; failures are not cached. */
function getTile(path: string, apiKey: string, fetchFn: typeof fetch): { at: number; tile: Promise<Tile> } {
	const now = Date.now();
	const cached = tileCache.get(path);
	if (cached && now - cached.at < TILE_TTL_MS) {
		// Re-insert so Map order doubles as least-recently-used order.
		tileCache.delete(path);
		tileCache.set(path, cached);
		return cached;
	}
	const entry = { at: now, tile: fetchTile(path, apiKey, fetchFn) };
	tileCache.delete(path);
	tileCache.set(path, entry);
	if (tileCache.size > TILE_CACHE_MAX) tileCache.delete(tileCache.keys().next().value!);
	entry.tile.catch(() => {
		if (tileCache.get(path) === entry) tileCache.delete(path);
	});
	return entry;
}

export function clearTileCache() {
	tileCache.clear();
}

/**
 * GET /api/air-quality/tiles/[z]/[x]/[y]: proxies Google's UAQI heatmap tile so the
 * Air Quality key never reaches the browser. Only tiles over Indonesia, up to MAP_ZOOM.max.
 */
export async function handleTileRequest(
	request: Request,
	params: { z: string; x: string; y: string },
	apiKey: string | undefined,
	fetchFn: typeof fetch = fetch
): Promise<Response> {
	const startedAt = performance.now();
	if (isCrossSite(request)) return fail('invalid_request', 403);

	const [z, x, y] = [params.z, params.x, params.y].map(toInt);
	if (z === null || x === null || y === null || z > MAP_ZOOM.max || x >= 2 ** z || y >= 2 ** z) {
		return fail('invalid_request');
	}
	if (!tileInBounds(z, x, y)) return fail('invalid_request', 404);
	if (!apiKey) return fail('not_configured');

	const { at, tile } = getTile(`${z}/${x}/${y}`, apiKey, fetchFn);
	let result: Tile;
	try {
		result = await tile;
	} catch (error) {
		const code = error instanceof AirQualityError ? error.code : 'upstream_error';
		log('tiles', code, error instanceof Error ? error.message : 'unexpected', startedAt);
		return fail(code);
	}

	const maxAge = Math.max(0, Math.floor((at + TILE_TTL_MS - Date.now()) / 1000));
	return new Response(result.body, {
		headers: {
			'content-type': result.contentType,
			// Private: the browser may keep it for the time left in the server cache, shared caches may not.
			'cache-control': `private, max-age=${maxAge}`
		}
	});
}

/** GET /api/wind: the current hour's wind grid over the map, from Open-Meteo. */
export async function handleWindRequest(
	request: Request,
	apiKey: string | undefined,
	fetchFn: typeof fetch = fetch
): Promise<Response> {
	const startedAt = performance.now();
	if (isCrossSite(request)) return fail('invalid_request', 403);
	try {
		// Short: the hour these values are for turns over on the hour.
		return respond({ data: await getWind(apiKey, fetchFn) }, 200, 'public, max-age=300');
	} catch (error) {
		const code = error instanceof AirQualityError ? error.code : 'upstream_error';
		log('wind', code, error instanceof Error ? error.message : 'unexpected', startedAt);
		return fail(code);
	}
}
