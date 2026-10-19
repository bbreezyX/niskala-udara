import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { citiesInRegion } from '@/lib/config/cities';
import type { RegionLine } from '@/lib/types';
import { clearAirQualityCache, expiresAt, getCurrentConditions, MAX_AGE_MS } from './air-quality-cache';
import { handleAirQualityRequest } from './handle-air-quality';
import { handleRegionRequest } from './region-air-quality';

const API_KEY = 'test-key-not-real';
const jambi = { latitude: -1.61, longitude: 103.61 };
const current = { dateTime: '2026-10-19T03:00:00Z', indexes: [{ code: 'uaqi', aqi: 20 }] };
const forecast = { hourlyForecasts: [{ dateTime: '2026-10-19T04:00:00Z', indexes: [{ code: 'uaqi', aqi: 25 }] }] };

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function apiRequest(body: unknown) {
	return new Request('http://localhost/api/air-quality', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

/** Answers current conditions at once and forecasts after `forecastDelayMs`, by Google method. */
function fakeGoogle(forecastDelayMs = 0) {
	return vi.fn<typeof fetch>(async (url) => {
		if (String(url).endsWith('currentConditions:lookup')) return jsonResponse(current);
		await new Promise((resolve) => setTimeout(resolve, forecastDelayMs));
		return jsonResponse(forecast);
	});
}

async function readLines(response: Response): Promise<RegionLine[]> {
	const text = await response.text();
	return text
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line) as RegionLine);
}

beforeEach(() => {
	clearAirQualityCache();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('expiresAt', () => {
	it.each([
		['10:05 → one hour later', '2026-10-19T10:05:00Z', '2026-10-19T11:05:00Z'],
		['10:30 → ten past the next hour', '2026-10-19T10:30:00Z', '2026-10-19T11:10:00Z'],
		['10:59 → ten past the next hour', '2026-10-19T10:59:00Z', '2026-10-19T11:10:00Z']
	])('%s', (_, fetched, expected) => {
		expect(new Date(expiresAt(Date.parse(fetched))).toISOString()).toBe(new Date(expected).toISOString());
	});

	it('never exceeds the one hour the terms allow', () => {
		for (let minute = 0; minute < 60; minute++) {
			const fetched = Date.parse('2026-10-19T10:00:00Z') + minute * 60_000;
			expect(expiresAt(fetched) - fetched).toBeLessThanOrEqual(MAX_AGE_MS);
		}
	});
});

describe('server cache', () => {
	it('shares one Google request between concurrent and later visitors', async () => {
		const fetchFn = fakeGoogle();
		const responses = await Promise.all([
			handleAirQualityRequest(apiRequest(jambi), API_KEY, fetchFn),
			handleAirQualityRequest(apiRequest(jambi), API_KEY, fetchFn)
		]);
		await handleAirQualityRequest(apiRequest(jambi), API_KEY, fetchFn);
		expect(responses.map((r) => r.status)).toEqual([200, 200]);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it('does not cache failures', async () => {
		const fetchFn = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(jsonResponse({ error: { status: 'INTERNAL' } }, 500))
			.mockResolvedValueOnce(jsonResponse(current));
		await expect(getCurrentConditions(jambi, API_KEY, fetchFn)).rejects.toMatchObject({ code: 'upstream_error' });
		await expect(getCurrentConditions(jambi, API_KEY, fetchFn)).resolves.toMatchObject({ index: { aqi: 20 } });
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	it('asks Google again once the entry expires', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-10-19T10:30:00Z'));
		const fetchFn = fakeGoogle();
		await getCurrentConditions(jambi, API_KEY, fetchFn);

		vi.setSystemTime(new Date('2026-10-19T11:09:59Z'));
		await getCurrentConditions(jambi, API_KEY, fetchFn);
		expect(fetchFn).toHaveBeenCalledTimes(1);

		vi.setSystemTime(new Date('2026-10-19T11:10:00Z'));
		await getCurrentConditions(jambi, API_KEY, fetchFn);
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});
});

describe('handleRegionRequest', () => {
	const regionRequest = (headers: Record<string, string> = {}) =>
		new Request('http://localhost/api/air-quality/region/jambi', { headers });

	it('streams every city, current conditions before the slower forecasts', async () => {
		const response = handleRegionRequest(regionRequest(), 'jambi', API_KEY, fakeGoogle(20));
		expect(response.headers.get('content-type')).toContain('application/x-ndjson');
		expect(response.headers.get('cache-control')).toBe('no-store');

		const lines = await readLines(response);
		const cities = citiesInRegion('jambi').map((city) => city.id);
		expect(lines).toHaveLength(cities.length * 2);
		expect(lines.slice(0, cities.length).every((line) => line.part === 'current')).toBe(true);
		expect(new Set(lines.map((line) => line.id))).toEqual(new Set(cities));
		expect(lines[0].result).toMatchObject({ data: { index: { aqi: 20 } } });
		expect(lines.at(-1)?.result).toMatchObject({ data: [{ index: { aqi: 25 } }] });
	});

	it('sends an error line for a failed part instead of failing the stream', async () => {
		const fetchFn = vi.fn<typeof fetch>(async (url) =>
			String(url).endsWith('currentConditions:lookup')
				? jsonResponse({ error: { status: 'RESOURCE_EXHAUSTED' } }, 429)
				: jsonResponse(forecast)
		);
		const lines = await readLines(handleRegionRequest(regionRequest(), 'jambi', API_KEY, fetchFn));
		const currents = lines.filter((line) => line.part === 'current');
		expect(currents.every((line) => 'error' in line.result && line.result.error.code === 'quota_exceeded')).toBe(true);
		expect(lines.filter((line) => line.part === 'forecast').every((line) => 'data' in line.result)).toBe(true);
	});

	it.each([
		['an unknown region', regionRequest(), 'atlantis', API_KEY, 404, 'invalid_request'],
		['a cross-site request', regionRequest({ 'sec-fetch-site': 'cross-site' }), 'jambi', API_KEY, 403, 'invalid_request'],
		['a missing key', regionRequest(), 'jambi', undefined, 503, 'not_configured']
	])('rejects %s without calling Google', async (_, request, region, apiKey, status, code) => {
		const fetchFn = vi.fn<typeof fetch>();
		const response = handleRegionRequest(request, region, apiKey, fetchFn);
		expect(response.status).toBe(status);
		expect(await response.json()).toEqual({ error: { code } });
		expect(fetchFn).not.toHaveBeenCalled();
	});
});
