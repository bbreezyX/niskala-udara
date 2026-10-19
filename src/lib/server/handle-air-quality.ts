import { parseCoordinates, parseHistoryRequest } from '@/lib/coordinates';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/config';
import type { ApiErrorCode } from '@/lib/types';
import {
	AirQualityError,
	fetchCurrentConditions,
	fetchForecast,
	fetchHistory
} from './google-air-quality';
import { fail, isCrossSite, log as logScoped, respond } from './http';

const MAX_BODY_BYTES = 1024;

const log = (code: ApiErrorCode, detail: string, startedAt: number) => logScoped('air-quality', code, detail, startedAt);

type Handler = (request: Request, apiKey: string | undefined, fetchFn?: typeof fetch) => Promise<Response>;

/**
 * Builds a POST handler that accepts only the input `parse` allows; the upstream
 * target is fixed on the server. Kept free of Next.js imports so it can be unit tested.
 */
function createHandler<Input>(
	parse: (payload: unknown) => Input | null,
	run: (input: Input, apiKey: string, fetchFn: typeof fetch, language: Locale) => Promise<unknown>
): Handler {
	return async (request, apiKey, fetchFn = fetch) => {
		const startedAt = performance.now();

		if (isCrossSite(request)) return fail('invalid_request', 403);

		if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
			return fail('invalid_request', 415);
		}

		const declaredLength = Number(request.headers.get('content-length') ?? 0);
		if (declaredLength > MAX_BODY_BYTES) return fail('invalid_request', 413);

		const text = await request.text();
		if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return fail('invalid_request', 413);

		let payload: unknown;
		try {
			payload = JSON.parse(text);
		} catch {
			return fail('invalid_request');
		}

		const input = parse(payload);
		if (!input) return fail('invalid_request');

		// ?lang= picks the language of Google's text; the body stays exactly the coordinates.
		const lang = new URL(request.url).searchParams.get('lang') ?? DEFAULT_LOCALE;
		if (!isLocale(lang)) return fail('invalid_request');

		if (!apiKey) {
			log('not_configured', 'GOOGLE_AIR_QUALITY_API_KEY is not set', startedAt);
			return fail('not_configured');
		}

		try {
			return respond({ data: await run(input, apiKey, fetchFn, lang) });
		} catch (error) {
			if (error instanceof AirQualityError) {
				log(error.code, error.message, startedAt);
				return fail(error.code);
			}
			log('upstream_error', `unexpected ${error instanceof Error ? error.name : 'error'}`, startedAt);
			return fail('upstream_error');
		}
	};
}

/** POST /api/air-quality: current conditions. */
export const handleAirQualityRequest = createHandler(parseCoordinates, fetchCurrentConditions);

/** POST /api/air-quality/history: the last 24 or 72 hours. */
export const handleHistoryRequest = createHandler(parseHistoryRequest, ({ coordinates, hours }, apiKey, fetchFn, language) =>
	fetchHistory(coordinates, hours, apiKey, fetchFn, language)
);

/** POST /api/air-quality/forecast: the next 24 hours. */
export const handleForecastRequest = createHandler(parseCoordinates, (coordinates, apiKey, fetchFn, language) =>
	fetchForecast(coordinates, apiKey, fetchFn, language)
);
