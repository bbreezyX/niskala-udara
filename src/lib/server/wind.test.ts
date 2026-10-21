import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WIND_GRID } from '@/lib/config/map';
import { handleWindRequest } from './handle-map';
import { clearWindCache, fetchWindForecast, getWind, getWindForecast, gridPoints, windAt, WIND_FAILURE_HOLD_MS, WIND_TTL_MS } from './wind';

const HOUR = 3600;
const START = Date.parse('2026-10-19T00:00:00Z') / 1000;
const TIMES = Array.from({ length: 48 }, (_, i) => START + i * HOUR);
const request = (headers: Record<string, string> = {}) => new Request('http://localhost/api/wind', { headers });

/** Open-Meteo's answer for the locations in a request URL: every location blows from the east at 5 m/s. */
function openMeteo(url: string, speed = 5, direction = 90): Response {
	const count = new URL(url).searchParams.get('latitude')!.split(',').length;
	const location = { hourly: { time: TIMES, wind_speed_10m: TIMES.map(() => speed), wind_direction_10m: TIMES.map(() => direction) } };
	const body = count === 1 ? location : Array.from({ length: count }, () => location);
	return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
	clearWindCache();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe('gridPoints', () => {
	it('covers the map row by row from the south-west corner', () => {
		const points = gridPoints();
		expect(points).toHaveLength(WIND_GRID.columns * WIND_GRID.rows);
		expect(points[0]).toEqual({ latitude: -11.5, longitude: 94.5 });
		expect(points[1]).toEqual({ latitude: -11.5, longitude: 96 });
		expect(points[WIND_GRID.columns]).toEqual({ latitude: -10, longitude: 94.5 });
		expect(points.at(-1)).toEqual({ latitude: 6.5, longitude: 142.5 });
	});
});

describe('fetchWindForecast', () => {
	it('asks the free API in chunks for hourly 10 m wind in m/s at the grid points themselves', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async (url) => openMeteo(String(url)));
		const forecast = await fetchWindForecast(undefined, fetchFn);

		expect(fetchFn).toHaveBeenCalledTimes(Math.ceil(gridPoints().length / 100));
		const url = new URL(String(fetchFn.mock.calls[0][0]));
		expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
		expect(url.searchParams.get('hourly')).toBe('wind_speed_10m,wind_direction_10m');
		expect(url.searchParams.get('wind_speed_unit')).toBe('ms');
		expect(url.searchParams.get('cell_selection')).toBe('nearest');
		expect(url.searchParams.get('latitude')!.split(',')).toHaveLength(100);
		expect(forecast.speeds).toHaveLength(gridPoints().length);
	});

	it('asks for one past day so the last 12 hours are always covered', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async (url) => openMeteo(String(url)));
		await fetchWindForecast(undefined, fetchFn);
		expect(new URL(String(fetchFn.mock.calls[0][0])).searchParams.get('past_days')).toBe('1');
	});

	it('uses the commercial endpoint when a key is set', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async (url) => openMeteo(String(url)));
		await fetchWindForecast('om-key', fetchFn);
		const url = new URL(String(fetchFn.mock.calls[0][0]));
		expect(url.host).toBe('customer-api.open-meteo.com');
		expect(url.searchParams.get('apikey')).toBe('om-key');
	});

	it('fails the whole field when a chunk fails, with the rate limit as quota_exceeded', async () => {
		const fetchFn = vi
			.fn<typeof fetch>()
			.mockImplementation(async (url) => openMeteo(String(url)))
			.mockResolvedValueOnce(new Response('{"error":true}', { status: 429 }));
		await expect(fetchWindForecast(undefined, fetchFn)).rejects.toMatchObject({ code: 'quota_exceeded' });
	});
});

describe('windAt', () => {
	it('turns the hour containing now into components of where the wind blows', async () => {
		// From the east at 5 m/s: blowing west, so u is -5 and v is 0.
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async (url) => openMeteo(String(url)));
		const forecast = await fetchWindForecast(undefined, fetchFn);
		const wind = windAt(forecast, new Date((START + 5 * HOUR + 1800) * 1000));
		expect(wind.validAt).toBe('2026-10-19T05:00:00.000Z');
		expect(wind.u[0]).toBe(-5);
		expect(wind.v[0]).toBe(0);
		expect(wind.grid).toEqual(WIND_GRID);
	});

	it('keeps a missing hour missing for the trace, and calm on the map', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async (url) => {
			const count = new URL(String(url)).searchParams.get('latitude')!.split(',').length;
			const speeds = TIMES.map((_, i) => (i === 5 ? null : 5));
			const location = { hourly: { time: TIMES, wind_speed_10m: speeds, wind_direction_10m: TIMES.map(() => 90) } };
			return Response.json(count === 1 ? location : Array.from({ length: count }, () => location));
		});
		const forecast = await fetchWindForecast(undefined, fetchFn);
		expect(forecast.speeds[0][5]).toBeNaN();
		const wind = windAt(forecast, new Date((START + 5 * HOUR + 60) * 1000));
		expect([wind.u[0], wind.v[0]]).toEqual([0, 0]);
	});

	it('refuses a time past the forecast', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async (url) => openMeteo(String(url)));
		const forecast = await fetchWindForecast(undefined, fetchFn);
		expect(() => windAt(forecast, new Date((START + 48 * HOUR) * 1000))).toThrow();
	});
});

describe('getWindForecast', () => {
	it('shares one upstream fetch between the current hour and the trace', async () => {
		vi.useFakeTimers({ now: (START + 5 * HOUR) * 1000 });
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async (url) => openMeteo(String(url)));
		await getWind(undefined, fetchFn);
		const calls = fetchFn.mock.calls.length;
		const forecast = await getWindForecast(undefined, fetchFn);
		expect(fetchFn).toHaveBeenCalledTimes(calls);
		expect(forecast.times).toEqual(TIMES);
	});
});

describe('handleWindRequest', () => {
	it('shares one upstream fetch across requests until the TTL ends', async () => {
		vi.useFakeTimers({ now: (START + 2 * HOUR) * 1000 });
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async (url) => openMeteo(String(url)));
		const chunks = Math.ceil(gridPoints().length / 100);

		const [a, b] = await Promise.all([handleWindRequest(request(), undefined, fetchFn), handleWindRequest(request(), undefined, fetchFn)]);
		expect(a.status).toBe(200);
		expect(b.headers.get('cache-control')).toBe('public, max-age=300');
		expect(fetchFn).toHaveBeenCalledTimes(chunks);

		vi.advanceTimersByTime(WIND_TTL_MS);
		await handleWindRequest(request(), undefined, fetchFn);
		expect(fetchFn).toHaveBeenCalledTimes(chunks * 2);
	});

	it('holds a failure briefly instead of re-fetching the whole grid on every request', async () => {
		vi.useFakeTimers({ now: (START + 2 * HOUR) * 1000 });
		const fetchFn = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response('oops', { status: 429 }))
			.mockImplementation(async (url) => openMeteo(String(url)));
		expect((await handleWindRequest(request(), undefined, fetchFn)).status).toBe(503);
		const calls = fetchFn.mock.calls.length;

		// During the hold every request gets the same failure and Open-Meteo hears nothing.
		const held = await handleWindRequest(request(), undefined, fetchFn);
		expect(held.status).toBe(503);
		expect(await held.json()).toEqual({ error: { code: 'quota_exceeded' } });
		expect(fetchFn).toHaveBeenCalledTimes(calls);

		vi.advanceTimersByTime(WIND_FAILURE_HOLD_MS);
		expect((await handleWindRequest(request(), undefined, fetchFn)).status).toBe(200);
	});

	it('rejects cross-site requests', async () => {
		const fetchFn = vi.fn<typeof fetch>();
		expect((await handleWindRequest(request({ 'sec-fetch-site': 'cross-site' }), undefined, fetchFn)).status).toBe(403);
		expect(fetchFn).not.toHaveBeenCalled();
	});
});
