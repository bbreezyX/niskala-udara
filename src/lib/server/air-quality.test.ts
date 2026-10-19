import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAirQualityCache } from './air-quality-cache';
import { fetchForecast, normalizeResponse } from './google-air-quality';
import {
	handleAirQualityRequest,
	handleForecastRequest,
	handleHistoryRequest
} from './handle-air-quality';

const API_KEY = 'test-key-not-real';

const fullResponse = {
	dateTime: '2026-10-18T09:00:00Z',
	regionCode: 'id',
	indexes: [
		{ code: 'ind_ispu', displayName: 'ISPU', aqi: 120, category: 'Tidak sehat' },
		{
			code: 'uaqi',
			displayName: 'Universal AQI',
			aqi: 62,
			aqiDisplay: '62',
			color: { red: 0.4, green: 0.8 },
			category: 'Kualitas udara cukup baik',
			dominantPollutant: 'pm25'
		}
	],
	pollutants: [
		{ code: 'pm25', concentration: { value: 18.7, units: 'MICROGRAMS_PER_CUBIC_METER' } },
		{ code: 'so2', concentration: { value: 0, units: 'PARTS_PER_BILLION' } },
		{ code: 'co', concentration: { value: 'n/a', units: 'PARTS_PER_BILLION' } },
		{ code: 'nh3', concentration: { value: 3, units: 'PARTS_PER_BILLION' } }
	],
	healthRecommendations: {
		generalPopulation: 'Nikmati aktivitas luar ruangan.',
		elderly: 'Kurangi aktivitas berat.'
	}
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function apiRequest(body: unknown, headers: Record<string, string> = {}, query = '') {
	return new Request(`http://localhost/api/air-quality${query}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

const jakarta = { latitude: -6.1754, longitude: 106.8272 };

// Handlers share the server cache; every test starts from an empty one.
beforeEach(() => clearAirQualityCache());

describe('normalizeResponse', () => {
	it('picks the uaqi index by code, not by position', () => {
		const data = normalizeResponse(fullResponse);
		expect(data.index.aqi).toBe(62);
		expect(data.index.category).toBe('Kualitas udara cukup baik');
		expect(data.index.dominantPollutant).toBe('pm25');
		expect(data.index.color).toBe('rgb(102 204 0)');
		expect(data.dataTime).toBe('2026-10-18T09:00:00Z');
		expect(data.recommendations).toEqual({ generalPopulation: 'Nikmati aktivitas luar ruangan.', elderly: 'Kurangi aktivitas berat.' });
	});

	it('keeps zero values, drops invalid readings and unknown pollutants', () => {
		const { pollutants } = normalizeResponse(fullResponse);
		expect(pollutants).toEqual([
			{ code: 'pm25', value: 18.7, units: 'MICROGRAMS_PER_CUBIC_METER' },
			{ code: 'so2', value: 0, units: 'PARTS_PER_BILLION' }
		]);
	});

	it('tolerates partial data', () => {
		const data = normalizeResponse({
			dateTime: '2026-10-18T09:00:00Z',
			indexes: [{ code: 'uaqi', aqi: 40 }]
		});
		expect(data.index).toMatchObject({ aqi: 40, aqiDisplay: '40', category: null, color: null });
		expect(data.pollutants).toEqual([]);
		expect(data.recommendations).toEqual({});
	});

	it.each([
		['empty object', {}],
		['no uaqi index', { dateTime: '2026-10-18T09:00:00Z', indexes: [{ code: 'ind_ispu', aqi: 10 }] }],
		['non-numeric aqi', { dateTime: '2026-10-18T09:00:00Z', indexes: [{ code: 'uaqi', aqi: '62' }] }],
		['invalid dateTime', { dateTime: 'kemarin', indexes: [{ code: 'uaqi', aqi: 62 }] }],
		['null', null]
	])('throws no_data for %s', (_, raw) => {
		expect(() => normalizeResponse(raw)).toThrow(expect.objectContaining({ code: 'no_data' }));
	});
});

describe('handleAirQualityRequest', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('calls Google with the fixed URL, header auth and the required body', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(fullResponse));
		const response = await handleAirQualityRequest(apiRequest(jakarta), API_KEY, fetchFn);

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		const body = await response.json();
		expect(body.data.index.aqi).toBe(62);
		expect(JSON.stringify(body)).not.toContain(API_KEY);

		const [url, init] = fetchFn.mock.calls[0];
		expect(url).toBe('https://airquality.googleapis.com/v1/currentConditions:lookup');
		expect(String(url)).not.toContain(API_KEY);
		expect(new Headers(init?.headers).get('x-goog-api-key')).toBe(API_KEY);
		expect(JSON.parse(String(init?.body))).toEqual({
			location: jakarta,
			universalAqi: true,
			languageCode: 'id',
			extraComputations: ['POLLUTANT_CONCENTRATION', 'HEALTH_RECOMMENDATIONS', 'LOCAL_AQI']
		});
	});

	it('asks Google for English text with ?lang=en', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(fullResponse));
		const response = await handleAirQualityRequest(apiRequest(jakarta, {}, '?lang=en'), API_KEY, fetchFn);

		expect(response.status).toBe(200);
		expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body)).languageCode).toBe('en');
	});

	it('rejects an unsupported language without calling Google', async () => {
		const fetchFn = vi.fn<typeof fetch>();
		const response = await handleAirQualityRequest(apiRequest(jakarta, {}, '?lang=fr'), API_KEY, fetchFn);

		expect(response.status).toBe(400);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('reports not_configured without calling Google', async () => {
		const fetchFn = vi.fn<typeof fetch>();
		const response = await handleAirQualityRequest(apiRequest(jakarta), undefined, fetchFn);
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ error: { code: 'not_configured' } });
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it.each([
		['invalid coordinates', apiRequest({ latitude: 200, longitude: 0 }), 400],
		['extra fields', apiRequest({ ...jakarta, target: 'https://evil.test' }), 400],
		['malformed JSON', apiRequest('{oops'), 400],
		['wrong content type', apiRequest(jakarta, { 'content-type': 'text/plain' }), 415],
		['oversized body', apiRequest({ latitude: 0, longitude: 0, pad: 'x'.repeat(2000) }), 413],
		['cross-site request', apiRequest(jakarta, { 'sec-fetch-site': 'cross-site' }), 403]
	])('rejects %s', async (_, request, status) => {
		const fetchFn = vi.fn<typeof fetch>();
		const response = await handleAirQualityRequest(request, API_KEY, fetchFn);
		expect(response.status).toBe(status);
		expect(await response.json()).toEqual({ error: { code: 'invalid_request' } });
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it.each([
		[429, 'quota_exceeded', 'RESOURCE_EXHAUSTED'],
		[403, 'not_authorized', 'PERMISSION_DENIED'],
		[400, 'location_unsupported', 'INVALID_ARGUMENT'],
		[500, 'upstream_error', 'INTERNAL']
	])('maps upstream HTTP %i to %s', async (status, code, googleStatus) => {
		const fetchFn = vi
			.fn<typeof fetch>()
			.mockResolvedValue(jsonResponse({ error: { code: status, message: 'details', status: googleStatus } }, status));
		const response = await handleAirQualityRequest(apiRequest(jakarta), API_KEY, fetchFn);
		expect(await response.json()).toEqual({ error: { code } });
	});

	it('maps an invalid key (HTTP 400 API_KEY_INVALID) to not_authorized, not location_unsupported', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse(
				{
					error: {
						code: 400,
						message: 'API key not valid. Please pass a valid API key.',
						status: 'INVALID_ARGUMENT',
						details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }]
					}
				},
				400
			)
		);
		const response = await handleAirQualityRequest(apiRequest(jakarta), API_KEY, fetchFn);
		expect(await response.json()).toEqual({ error: { code: 'not_authorized' } });
	});

	it('maps an empty upstream body to no_data', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}));
		const response = await handleAirQualityRequest(apiRequest(jakarta), API_KEY, fetchFn);
		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({ error: { code: 'no_data' } });
	});

	it('maps timeouts and network failures', async () => {
		const timeout = vi.fn<typeof fetch>().mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
		const timeoutResponse = await handleAirQualityRequest(apiRequest(jakarta), API_KEY, timeout);
		expect(await timeoutResponse.json()).toEqual({ error: { code: 'timeout' } });

		const network = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));
		const networkResponse = await handleAirQualityRequest(apiRequest(jakarta), API_KEY, network);
		expect(await networkResponse.json()).toEqual({ error: { code: 'upstream_error' } });
	});

	it('never logs the API key or coordinates', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ error: { status: 'PERMISSION_DENIED' } }, 403));
		await handleAirQualityRequest(apiRequest(jakarta), API_KEY, fetchFn);
		const logged = vi.mocked(console.error).mock.calls.flat().join(' ');
		expect(logged).toContain('not_authorized');
		expect(logged).not.toContain(API_KEY);
		expect(logged).not.toContain('106.8272');
	});
});

const hour = (dateTime: string, aqi: number | string) => ({ dateTime, indexes: [{ code: 'uaqi', aqi }] });

describe('handleHistoryRequest', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('requests the given range and returns valid hours oldest first', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
			jsonResponse({
				hoursInfo: [
					hour('2026-10-18T10:00:00Z', 50),
					hour('2026-10-18T08:00:00Z', 70),
					hour('2026-10-18T09:00:00Z', 'invalid')
				]
			})
		);
		const response = await handleHistoryRequest(apiRequest({ ...jakarta, hours: 72 }), API_KEY, fetchFn);
		const body = await response.json();
		expect(body.data.map((h: { index: { aqi: number } }) => h.index.aqi)).toEqual([70, 50]);

		const [url, init] = fetchFn.mock.calls[0];
		expect(url).toBe('https://airquality.googleapis.com/v1/history:lookup');
		expect(JSON.parse(String(init?.body))).toMatchObject({ location: jakarta, hours: 72, pageSize: 72, universalAqi: true });
	});

	it.each([
		['unsupported range', { ...jakarta, hours: 720 }],
		['missing hours', jakarta]
	])('rejects %s', async (_, payload) => {
		const fetchFn = vi.fn<typeof fetch>();
		const response = await handleHistoryRequest(apiRequest(payload), API_KEY, fetchFn);
		expect(response.status).toBe(400);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('maps a history without any valid hour to no_data', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ hoursInfo: [] }));
		const response = await handleHistoryRequest(apiRequest({ ...jakarta, hours: 24 }), API_KEY, fetchFn);
		expect(await response.json()).toEqual({ error: { code: 'no_data' } });
	});
});

describe('forecast', () => {
	it('asks for the 24 hours starting at the next full hour', async () => {
		const fetchFn = vi
			.fn<typeof fetch>()
			.mockResolvedValue(jsonResponse({ hourlyForecasts: [hour('2026-10-18T10:00:00Z', 66)] }));
		const data = await fetchForecast(jakarta, API_KEY, fetchFn, 'id', new Date('2026-10-18T09:41:12Z'));
		expect(data[0].index.aqi).toBe(66);

		const [url, init] = fetchFn.mock.calls[0];
		expect(url).toBe('https://airquality.googleapis.com/v1/forecast:lookup');
		expect(JSON.parse(String(init?.body))).toMatchObject({
			period: { startTime: '2026-10-18T10:00:00.000Z', endTime: '2026-10-19T09:00:00.000Z' },
			pageSize: 24
		});
	});

	it('serves forecasts through the handler', async () => {
		const fetchFn = vi
			.fn<typeof fetch>()
			.mockResolvedValue(jsonResponse({ hourlyForecasts: [hour('2026-10-18T10:00:00Z', 66)] }));
		const response = await handleForecastRequest(apiRequest(jakarta), API_KEY, fetchFn);
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
	});
});
