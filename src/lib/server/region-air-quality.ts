import { EDGE_CACHE_CONTROL } from '@/lib/config/cache';
import { citiesInRegion, REGIONS, type RegionId } from '@/lib/config/cities';
import type { ApiResponse, RegionLine, StreamedCity } from '@/lib/types';
import { getCurrentConditions, getForecast } from './air-quality-cache';
import { AirQualityError } from './google-air-quality';
import { fail, isCrossSite, log } from './http';

/** Turns a lookup into a response that never rejects, logging failures (codes only, never coordinates). */
function settle<T>(lookup: Promise<T>): Promise<ApiResponse<T>> {
	const startedAt = performance.now();
	return lookup.then(
		(data) => ({ data }),
		(error: unknown) => {
			const code = error instanceof AirQualityError ? error.code : 'upstream_error';
			log('air-quality', code, error instanceof Error ? error.message : 'unexpected', startedAt);
			return { error: { code } };
		}
	);
}

/**
 * Starts current conditions and the forecast for every city in a region, all at once and through the
 * shared cache. Returns immediately; each promise settles on its own, so callers can stream them.
 */
export function loadRegion(region: RegionId, apiKey: string, fetchFn: typeof fetch = fetch): Record<string, StreamedCity> {
	return Object.fromEntries(
		citiesInRegion(region).map((city) => {
			const coordinates = { latitude: city.latitude, longitude: city.longitude };
			return [
				city.id,
				{
					current: settle(getCurrentConditions(coordinates, apiKey, fetchFn)),
					forecast: settle(getForecast(coordinates, apiKey, fetchFn))
				}
			];
		})
	);
}

/**
 * GET /api/air-quality/region/[region]: every city in a known region as NDJSON, one line per city and part
 * in the order they finish, so current conditions arrive without waiting for the slower forecasts.
 * Only configured regions are accepted, so the endpoint cannot be pointed at arbitrary coordinates.
 */
export function handleRegionRequest(
	request: Request,
	param: string,
	apiKey: string | undefined,
	fetchFn: typeof fetch = fetch
): Response {
	const startedAt = performance.now();
	if (isCrossSite(request)) return fail('invalid_request', 403);
	const region = REGIONS.find((r) => r.id === param)?.id;
	if (!region) return fail('invalid_request', 404);
	if (!apiKey) {
		log('air-quality', 'not_configured', 'GOOGLE_AIR_QUALITY_API_KEY is not set', startedAt);
		return fail('not_configured');
	}

	const cities = loadRegion(region, apiKey, fetchFn);
	const encoder = new TextEncoder();
	let cancelled = false;
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			const send = (line: RegionLine) => {
				if (!cancelled) controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
			};
			const sent = Object.entries(cities).flatMap(([id, city]) => [
				city.current.then((result) => send({ id, part: 'current', result })),
				city.forecast.then((result) => send({ id, part: 'forecast', result }))
			]);
			void Promise.all(sent).then(() => {
				if (!cancelled) controller.close();
			});
		},
		cancel() {
			// The lookups keep running and fill the cache for the next visitor; only the writes stop.
			cancelled = true;
		}
	});

	return new Response(body, {
		// Same for every visitor, so Cloudflare may share it briefly (see src/lib/config/cache.ts).
		headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': EDGE_CACHE_CONTROL }
	});
}
