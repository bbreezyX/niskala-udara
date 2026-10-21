import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearHotspotCache } from './firms';
import { handleSmokeTraceRequest } from './handle-smoke-trace';
import { createStaticMask } from './static-heat-sources';
import { clearWindCache } from './wind';

const HOUR = 3600;
const PALEMBANG = { latitude: -2.99, longitude: 104.76 };

/** Only NOAA-20 carries rows, so a hotspot is not counted once per satellite. */
function firmsCsv(source: string): string {
	const header = 'latitude,longitude,acq_date,acq_time,satellite,confidence,frp';
	if (source !== 'VIIRS_NOAA20_NRT') return header;
	const at = new Date(Date.now() - 2 * HOUR * 1000).toISOString();
	const [date, time] = [at.slice(0, 10), at.slice(11, 13) + at.slice(14, 16)];
	// A 20 MW hotspot 50 km east of Palembang, and a low-confidence one at the same place.
	return [header, `-2.99,105.21,${date},${time},N20,n,20`, `-2.99,105.21,${date},${time},N20,l,30`].join('\n');
}

/** Every location blows from the east at 5 m/s, hourly from `firstOffset` hours around the current hour. */
function openMeteo(url: string, firstOffset = -24): Response {
	const first = Math.floor(Date.now() / 3_600_000) * HOUR + firstOffset * HOUR;
	const times = Array.from({ length: 72 }, (_, i) => first + i * HOUR);
	const count = new URL(url).searchParams.get('latitude')!.split(',').length;
	const location = { hourly: { time: times, wind_speed_10m: times.map(() => 5), wind_direction_10m: times.map(() => 90) } };
	return Response.json(count === 1 ? location : Array.from({ length: count }, () => location));
}

const routes = ({ firmsStatus = 200, windOffset = -24 } = {}) =>
	vi.fn<typeof fetch>().mockImplementation(async (input) => {
		const url = String(input);
		if (!url.includes('firms.modaps.eosdis.nasa.gov')) return openMeteo(url, windOffset);
		if (firmsStatus !== 200) return new Response('oops', { status: firmsStatus });
		return new Response(firmsCsv(url.match(/\/(VIIRS_[A-Z0-9_]+)\//)![1]));
	});

const post = (body: unknown, headers: Record<string, string> = {}) =>
	new Request('http://localhost/api/smoke-trace', {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});

beforeEach(() => {
	clearHotspotCache();
	clearWindCache();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('handleSmokeTraceRequest', () => {
	it('returns the trace for a place inside Indonesia', async () => {
		const res = await handleSmokeTraceRequest(post(PALEMBANG), 'firms-key', undefined, routes(), createStaticMask([]));
		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
		const { data } = await res.json();
		expect(data.path).toHaveLength(25);
		expect(data.count).toBe(1);
		expect(data.level).toBe('light');
	});

	it('leaves static heat sources out of the count and reports them', async () => {
		const flare = createStaticMask([[-2.99, 105.21]], 1);
		const res = await handleSmokeTraceRequest(post(PALEMBANG), 'firms-key', undefined, routes(), flare);
		const { data } = await res.json();
		expect(data.count).toBe(0);
		expect(data.staticExcluded).toBe(1);
		expect(data.level).toBe('none');
	});

	it('rejects cross-site requests, other content types, big bodies, bad and out-of-bounds coordinates', async () => {
		const fetchFn = routes();
		expect((await handleSmokeTraceRequest(post(PALEMBANG, { 'sec-fetch-site': 'cross-site' }), 'k', undefined, fetchFn)).status).toBe(403);
		expect((await handleSmokeTraceRequest(post(PALEMBANG, { 'content-type': 'text/plain' }), 'k', undefined, fetchFn)).status).toBe(415);
		expect((await handleSmokeTraceRequest(post({ ...PALEMBANG, pad: 'x'.repeat(2000) }), 'k', undefined, fetchFn)).status).toBe(413);
		expect((await handleSmokeTraceRequest(post({ latitude: 'a', longitude: 1 }), 'k', undefined, fetchFn)).status).toBe(400);
		expect((await handleSmokeTraceRequest(post({ latitude: 20, longitude: 104 }), 'k', undefined, fetchFn)).status).toBe(400);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('reports not_configured without a FIRMS key and calls nothing', async () => {
		const fetchFn = routes();
		const res = await handleSmokeTraceRequest(post(PALEMBANG), undefined, undefined, fetchFn);
		expect(res.status).toBe(503);
		expect(await res.json()).toEqual({ error: { code: 'not_configured' } });
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('maps a FIRMS failure to its code and never logs the coordinates', async () => {
		const res = await handleSmokeTraceRequest(post(PALEMBANG), 'k', undefined, routes({ firmsStatus: 500 }));
		expect(res.status).toBe(502);
		const logged = vi.mocked(console.error).mock.calls.flat().join(' ');
		expect(logged).not.toContain('-2.99');
		expect(logged).not.toContain('104.76');
	});

	it('answers no_data when the wind does not reach the present', async () => {
		const res = await handleSmokeTraceRequest(post(PALEMBANG), 'k', undefined, routes({ windOffset: 2 }));
		expect(res.status).toBe(502);
		expect(await res.json()).toEqual({ error: { code: 'no_data' } });
	});
});
