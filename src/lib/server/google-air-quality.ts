import {
	HEALTH_GROUPS,
	POLLUTANT_CODES,
	type AirQualityData,
	type ApiErrorCode,
	type Coordinates,
	type HealthGroup,
	type PollutantCode,
	type PollutantReading,
	type UniversalAqi
} from '@/lib/types';

const BASE_URL = 'https://airquality.googleapis.com/v1/';
export const UPSTREAM_TIMEOUT_MS = 10_000;

export class AirQualityError extends Error {
	constructor(
		readonly code: ApiErrorCode,
		message: string
	) {
		super(message);
		this.name = 'AirQualityError';
	}
}

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function isPollutantCode(value: unknown): value is PollutantCode {
	return POLLUTANT_CODES.includes(value as PollutantCode);
}

/** google.type.Color: channels are 0–1 floats and an omitted channel means 0. */
function parseColor(value: unknown): string | null {
	if (!isRecord(value)) return null;
	const channels = [value.red, value.green, value.blue].map((c) => (c === undefined ? 0 : c));
	if (!channels.every((c) => typeof c === 'number' && Number.isFinite(c) && c >= 0 && c <= 1)) return null;
	const [r, g, b] = (channels as number[]).map((c) => Math.round(c * 255));
	return `rgb(${r} ${g} ${b})`;
}

function parseUniversalAqi(indexes: unknown): UniversalAqi | null {
	if (!Array.isArray(indexes)) return null;
	// Select by code, never by array position.
	const raw = indexes.find((entry) => isRecord(entry) && entry.code === 'uaqi');
	if (!isRecord(raw) || typeof raw.aqi !== 'number' || !Number.isFinite(raw.aqi)) return null;

	return {
		displayName: nonEmptyString(raw.displayName) ?? 'Universal AQI',
		aqi: raw.aqi,
		aqiDisplay: nonEmptyString(raw.aqiDisplay) ?? String(raw.aqi),
		category: nonEmptyString(raw.category),
		dominantPollutant: nonEmptyString(raw.dominantPollutant),
		color: parseColor(raw.color)
	};
}

function parsePollutants(pollutants: unknown): PollutantReading[] {
	if (!Array.isArray(pollutants)) return [];
	const readings = new Map<PollutantCode, PollutantReading>();

	for (const entry of pollutants) {
		if (!isRecord(entry) || !isPollutantCode(entry.code) || readings.has(entry.code)) continue;
		const concentration = entry.concentration;
		if (!isRecord(concentration)) continue;
		const { value, units } = concentration;
		// 0 is a valid reading; only non-numbers are treated as missing.
		if (typeof value !== 'number' || !Number.isFinite(value)) continue;
		readings.set(entry.code, { code: entry.code, value, units: nonEmptyString(units) ?? 'UNIT_UNSPECIFIED' });
	}

	return [...readings.values()];
}

/** Validates the upstream payload at runtime. Throws `no_data` when the essentials are missing. */
export function normalizeResponse(raw: unknown): AirQualityData {
	if (!isRecord(raw)) throw new AirQualityError('no_data', 'response is not an object');

	const dataTime = nonEmptyString(raw.dateTime);
	if (!dataTime || Number.isNaN(Date.parse(dataTime))) {
		throw new AirQualityError('no_data', 'missing or invalid dateTime');
	}

	const index = parseUniversalAqi(raw.indexes);
	if (!index) throw new AirQualityError('no_data', 'universal AQI not present');

	const advice = raw.healthRecommendations;
	const recommendations: Partial<Record<HealthGroup, string>> = {};
	if (isRecord(advice)) {
		for (const group of HEALTH_GROUPS) {
			const text = nonEmptyString(advice[group]);
			if (text) recommendations[group] = text;
		}
	}

	return {
		dataTime,
		index,
		pollutants: parsePollutants(raw.pollutants),
		recommendations
	};
}

interface UpstreamError {
	status: string | null;
	reason: string | null;
}

/** Extracts only non-sensitive identifiers (no message text) from a Google error body. */
async function readUpstreamError(response: Response): Promise<UpstreamError> {
	try {
		const body: unknown = await response.json();
		const error = isRecord(body) && isRecord(body.error) ? body.error : null;
		const details = Array.isArray(error?.details) ? error.details : [];
		const reason = details.map((d) => (isRecord(d) ? nonEmptyString(d.reason) : null)).find(Boolean);
		return { status: nonEmptyString(error?.status), reason: reason ?? null };
	} catch {
		return { status: null, reason: null };
	}
}

function errorCodeFor(httpStatus: number, { reason }: UpstreamError): ApiErrorCode {
	// Key problems arrive as 400 API_KEY_INVALID or 403 (API_KEY_*_BLOCKED, SERVICE_DISABLED).
	if (httpStatus === 401 || httpStatus === 403 || reason?.startsWith('API_KEY')) return 'not_authorized';
	if (httpStatus === 429) return 'quota_exceeded';
	// Coordinates are validated before the call, so a remaining 400 means no coverage for the location.
	if (httpStatus === 400) return 'location_unsupported';
	return 'upstream_error';
}

type GoogleMethod = 'currentConditions:lookup' | 'history:lookup' | 'forecast:lookup';

/** POSTs to a fixed Google method with header auth and a timeout; returns the parsed JSON body. */
async function callGoogle(
	method: GoogleMethod,
	body: Json,
	apiKey: string,
	fetchFn: typeof fetch
): Promise<unknown> {
	let response: Response;
	try {
		response = await fetchFn(BASE_URL + method, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				// Header auth keeps the key out of URLs and access logs.
				'x-goog-api-key': apiKey
			},
			body: JSON.stringify({ ...body, universalAqi: true, languageCode: 'id' }),
			signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === 'TimeoutError') {
			throw new AirQualityError('timeout', `${method}: no response within ${UPSTREAM_TIMEOUT_MS} ms`);
		}
		throw new AirQualityError(
			'upstream_error',
			`${method}: network failure: ${error instanceof Error ? error.name : 'unknown'}`
		);
	}

	if (!response.ok) {
		const upstream = await readUpstreamError(response);
		const detail = [upstream.status, upstream.reason].filter(Boolean).join('/') || 'unknown';
		throw new AirQualityError(
			errorCodeFor(response.status, upstream),
			`${method}: upstream HTTP ${response.status} (${detail})`
		);
	}

	try {
		return await response.json();
	} catch {
		throw new AirQualityError('upstream_error', `${method}: upstream body is not valid JSON`);
	}
}

const location = ({ latitude, longitude }: Coordinates) => ({ location: { latitude, longitude } });

/** Hourly entries share the current-conditions shape. Invalid hours are skipped; none valid means no_data. */
function normalizeHours(raw: unknown, field: 'hoursInfo' | 'hourlyForecasts'): AirQualityData[] {
	const entries = isRecord(raw) && Array.isArray(raw[field]) ? raw[field] : [];
	const hours: AirQualityData[] = [];
	for (const entry of entries) {
		try {
			hours.push(normalizeResponse(entry));
		} catch {
			// A single missing hour should not hide the rest of the series.
		}
	}
	if (hours.length === 0) throw new AirQualityError('no_data', `${field} has no valid hours`);
	return hours.sort((a, b) => Date.parse(a.dataTime) - Date.parse(b.dataTime));
}

export async function fetchCurrentConditions(
	coordinates: Coordinates,
	apiKey: string,
	fetchFn: typeof fetch = fetch
): Promise<AirQualityData> {
	const body = await callGoogle(
		'currentConditions:lookup',
		{ ...location(coordinates), extraComputations: ['POLLUTANT_CONCENTRATION', 'HEALTH_RECOMMENDATIONS'] },
		apiKey,
		fetchFn
	);
	return normalizeResponse(body);
}

/** The last `hours` hours, oldest first, with pollutants and recommendations per hour. */
export async function fetchHistory(
	coordinates: Coordinates,
	hours: number,
	apiKey: string,
	fetchFn: typeof fetch = fetch
): Promise<AirQualityData[]> {
	const body = await callGoogle(
		'history:lookup',
		{
			...location(coordinates),
			hours,
			pageSize: hours,
			extraComputations: ['POLLUTANT_CONCENTRATION', 'HEALTH_RECOMMENDATIONS']
		},
		apiKey,
		fetchFn
	);
	return normalizeHours(body, 'hoursInfo');
}

export const FORECAST_HOURS = 24;

/** The next 24 hours (AQI only), starting at the next full hour. */
export async function fetchForecast(
	coordinates: Coordinates,
	apiKey: string,
	fetchFn: typeof fetch = fetch,
	now = new Date()
): Promise<AirQualityData[]> {
	const start = new Date(now);
	start.setUTCMinutes(0, 0, 0);
	start.setUTCHours(start.getUTCHours() + 1);
	// endTime is inclusive, so +23 h yields 24 hourly entries.
	const end = new Date(start.getTime() + (FORECAST_HOURS - 1) * 3_600_000);

	const body = await callGoogle(
		'forecast:lookup',
		{
			...location(coordinates),
			period: { startTime: start.toISOString(), endTime: end.toISOString() },
			pageSize: FORECAST_HOURS
		},
		apiKey,
		fetchFn
	);
	return normalizeHours(body, 'hourlyForecasts');
}
