import { MAP_BOUNDS, WIND_GRID } from '@/lib/config/map';
import { parseCoordinates } from '@/lib/coordinates';
import { buildSmokeTrace } from '@/lib/smoke-trace';
import { getHotspots } from './firms';
import { AirQualityError } from './google-air-quality';
import { fail, isCrossSite, log, readJsonBody, respond } from './http';
import { getWindForecast } from './wind';

const MAX_BODY_BYTES = 1024;

/**
 * POST /api/smoke-trace with exactly `{ latitude, longitude }`: where that place's air came from and
 * the fires on the way. Built from the shared FIRMS and wind caches, so it adds no upstream calls; no
 * Google data is involved. The coordinates stay in the body and never reach a log.
 */
export async function handleSmokeTraceRequest(
	request: Request,
	firmsKey: string | undefined,
	openMeteoKey: string | undefined,
	fetchFn: typeof fetch = fetch
): Promise<Response> {
	const startedAt = performance.now();
	if (isCrossSite(request)) return fail('invalid_request', 403);

	const body = await readJsonBody(request, MAX_BODY_BYTES);
	if ('response' in body) return body.response;

	const origin = parseCoordinates(body.payload);
	const { west, south, east, north } = MAP_BOUNDS;
	if (!origin || origin.latitude < south || origin.latitude > north || origin.longitude < west || origin.longitude > east) {
		return fail('invalid_request');
	}

	if (!firmsKey) {
		log('smoke-trace', 'not_configured', 'FIRMS_MAP_KEY is not set', startedAt);
		return fail('not_configured');
	}

	try {
		const [fires, forecast] = await Promise.all([getHotspots(firmsKey, fetchFn), getWindForecast(openMeteoKey, fetchFn)]);
		const trace = buildSmokeTrace({ origin, wind: { grid: WIND_GRID, ...forecast }, windFetchedAt: forecast.fetchedAt, fires, now: new Date() });
		// Without wind for the present hour there is no path to show, only the place itself.
		if (!trace.calm && trace.path.length < 2) throw new AirQualityError('no_data', 'smoke-trace: no wind for the present hour');
		return respond({ data: trace });
	} catch (error) {
		if (error instanceof AirQualityError) {
			log('smoke-trace', error.code, error.message, startedAt);
			return fail(error.code);
		}
		log('smoke-trace', 'upstream_error', `unexpected ${error instanceof Error ? error.name : 'error'}`, startedAt);
		return fail('upstream_error');
	}
}
