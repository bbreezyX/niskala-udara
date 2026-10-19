import { MAP_BOUNDS, MAP_ZOOM, type Bounds } from '@/lib/config/map';
import { getHotspots } from './firms';
import { getWind } from './wind';
import { AirQualityError } from './google-air-quality';
import { fail, isCrossSite, log, respond } from './http';

const TILE_URL = 'https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles';
const TIMEOUT_MS = 10_000;

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

function tileBounds(z: number, x: number, y: number): Bounds {
	const n = 2 ** z;
	const lat = (row: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * row) / n))) * 180) / Math.PI;
	return { west: (x / n) * 360 - 180, east: ((x + 1) / n) * 360 - 180, north: lat(y), south: lat(y + 1) };
}

function intersects(a: Bounds, b: Bounds): boolean {
	return a.west < b.east && a.east > b.west && a.south < b.north && a.north > b.south;
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
 * The Air Quality API terms allow caching current-conditions content for one hour. Tiles are
 * kept for half of that so the browser's own copy (max-age = time left here) also stays inside it.
 */
export const TILE_TTL_MS = 30 * 60_000;
/** About 25 KB per tile, so the cap keeps the cache near 10 MB. */
const TILE_CACHE_MAX = 400;
const tileCache = new Map<string, { at: number; tile: Promise<Tile> }>();

async function fetchTile(path: string, apiKey: string, fetchFn: typeof fetch): Promise<Tile> {
	let response: Response;
	try {
		response = await fetchFn(`${TILE_URL}/${path}`, {
			headers: { 'x-goog-api-key': apiKey },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (error) {
		const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
		throw new AirQualityError(timedOut ? 'timeout' : 'upstream_error', 'tile fetch failed');
	}
	const contentType = response.headers.get('content-type') ?? '';
	if (!response.ok || !contentType.startsWith('image/')) {
		const code = response.status === 429 ? 'quota_exceeded' : response.status === 400 || response.status === 403 ? 'not_authorized' : 'upstream_error';
		throw new AirQualityError(code, `upstream HTTP ${response.status}`);
	}
	return { body: await response.arrayBuffer(), contentType };
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
	if (!intersects(tileBounds(z, x, y), MAP_BOUNDS)) return fail('invalid_request', 404);
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
