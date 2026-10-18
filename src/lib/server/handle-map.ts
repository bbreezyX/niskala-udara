import { MAP_BOUNDS, MAP_ZOOM, type Bounds } from '#lib/config/map.ts';
import { getHotspots } from './firms.ts';
import { AirQualityError } from './google-air-quality.ts';
import { fail, isCrossSite, log, respond } from './http.ts';

const TILE_URL = 'https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles';
const TIMEOUT_MS = 10_000;

/** GET /api/fires: hotspots around Jambi over the last 24 hours. */
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

/**
 * GET /api/air-quality/tiles/[z]/[x]/[y]: proxies Google's UAQI heatmap tile so the
 * Air Quality key never reaches the browser. Only tiles over Sumatra, up to MAP_ZOOM.max.
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

	let response: Response;
	try {
		response = await fetchFn(`${TILE_URL}/${z}/${x}/${y}`, {
			headers: { 'x-goog-api-key': apiKey },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (error) {
		const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
		log('tiles', timedOut ? 'timeout' : 'upstream_error', 'tile fetch failed', startedAt);
		return fail(timedOut ? 'timeout' : 'upstream_error');
	}

	if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
		const code = response.status === 429 ? 'quota_exceeded' : response.status === 400 || response.status === 403 ? 'not_authorized' : 'upstream_error';
		log('tiles', code, `upstream HTTP ${response.status}`, startedAt);
		return fail(code);
	}

	return new Response(response.body, {
		headers: {
			'content-type': response.headers.get('content-type') ?? 'image/png',
			// Google content is not cached (Maps Platform terms).
			'cache-control': 'no-store'
		}
	});
}
