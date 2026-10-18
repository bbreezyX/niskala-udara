import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearHotspotCache, fetchHotspots, parseFirmsCsv } from './firms.ts';
import { handleFiresRequest, handleTileRequest } from './handle-map.ts';

const MAP_KEY = 'firms-test-key';
const API_KEY = 'google-test-key';
const HEADER = 'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight';

const csv = (...rows: string[]) => [HEADER, ...rows].join('\n');
const text = (body: string, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/plain' } });
const request = (url = 'http://localhost/api/fires', headers: Record<string, string> = {}) => new Request(url, { headers });

beforeEach(() => {
	clearHotspotCache();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('parseFirmsCsv', () => {
	it('parses VIIRS rows, padding acq_time and mapping satellites and confidence', () => {
		const [hotspot] = parseFirmsCsv(csv('-1.61234,103.5,330.1,0.4,0.4,2026-10-18,614,N20,VIIRS,h,2.0NRT,290.2,12.75,D'));
		expect(hotspot).toEqual({
			latitude: -1.61234,
			longitude: 103.5,
			acquiredAt: '2026-10-18T06:14:00.000Z',
			satellite: 'NOAA-20',
			confidence: 'high',
			frp: 12.75
		});
	});

	it('skips unusable rows and rejects a non-CSV header', () => {
		expect(parseFirmsCsv(csv('x,103.5,330,0.4,0.4,2026-10-18,0614,N,VIIRS,n,2,290,1,D'))).toEqual([]);
		expect(() => parseFirmsCsv('Invalid MAP_KEY.')).toThrow();
	});
});

describe('fetchHotspots', () => {
	const now = new Date('2026-10-19T00:00:00Z');

	it('queries the fixed Jambi area per VIIRS source and keeps only the last 24 hours, newest first', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () =>
			text(
				csv(
					'-1.6,103.5,330,0.4,0.4,2026-10-18,0600,N,VIIRS,n,2,290,5,D',
					'-1.7,103.4,330,0.4,0.4,2026-10-17,1800,N,VIIRS,h,2,290,9,N',
					'-1.8,103.3,330,0.4,0.4,2026-10-18,1800,N,VIIRS,l,2,290,1,N'
				)
			)
		);
		const data = await fetchHotspots(MAP_KEY, fetchFn, now);

		expect(fetchFn).toHaveBeenCalledTimes(3);
		expect(String(fetchFn.mock.calls[0][0])).toBe(
			`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/VIIRS_SNPP_NRT/100.7,-3.2,104.9,-0.5/2`
		);
		expect(data.hotspots.map((h) => h.acquiredAt)).toEqual([
			'2026-10-18T18:00:00.000Z',
			'2026-10-18T18:00:00.000Z',
			'2026-10-18T18:00:00.000Z',
			'2026-10-18T06:00:00.000Z',
			'2026-10-18T06:00:00.000Z',
			'2026-10-18T06:00:00.000Z'
		]);
		expect(data.missingSources).toEqual([]);
	});

	it('returns partial data when one satellite fails', async () => {
		const fetchFn = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(text(csv('-1.6,103.5,330,0.4,0.4,2026-10-18,0600,N,VIIRS,n,2,290,5,D')))
			.mockResolvedValueOnce(text('Server error', 500))
			.mockResolvedValueOnce(text(csv()));
		const data = await fetchHotspots(MAP_KEY, fetchFn, now);
		expect(data.hotspots).toHaveLength(1);
		expect(data.missingSources).toEqual(['VIIRS_NOAA20_NRT']);
	});

	it.each([
		['Invalid MAP_KEY.', 'not_authorized'],
		['Exceeding allowed transaction limit.', 'quota_exceeded'],
		['Something else', 'upstream_error']
	])('maps "%s" from every source to %s', async (body, code) => {
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => text(body, 400));
		await expect(fetchHotspots(MAP_KEY, fetchFn, now)).rejects.toMatchObject({ code });
	});
});

describe('handleFiresRequest', () => {
	it('reports not_configured without a key', async () => {
		const response = await handleFiresRequest(request(), undefined, vi.fn<typeof fetch>());
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ error: { code: 'not_configured' } });
	});

	it('caches upstream results between requests and never logs the key', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => text(csv()));
		await handleFiresRequest(request(), MAP_KEY, fetchFn);
		const second = await handleFiresRequest(request(), MAP_KEY, fetchFn);
		expect(second.status).toBe(200);
		expect(fetchFn).toHaveBeenCalledTimes(3);

		clearHotspotCache();
		await handleFiresRequest(request(), MAP_KEY, vi.fn<typeof fetch>().mockImplementation(async () => text('Invalid MAP_KEY.', 400)));
		expect(vi.mocked(console.error).mock.calls.flat().join(' ')).not.toContain(MAP_KEY);
	});

	it('rejects cross-site requests', async () => {
		const response = await handleFiresRequest(request(undefined, { 'sec-fetch-site': 'cross-site' }), MAP_KEY);
		expect(response.status).toBe(403);
	});
});

describe('handleTileRequest', () => {
	const png = () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } });
	// Zoom 8 tile containing Kota Jambi.
	const jambi = { z: '8', x: '201', y: '129' };

	it('proxies a tile over Sumatra with header auth and no caching', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(png());
		const response = await handleTileRequest(request(), jambi, API_KEY, fetchFn);
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/png');
		expect(response.headers.get('cache-control')).toBe('no-store');

		const [url, init] = fetchFn.mock.calls[0];
		expect(url).toBe('https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles/8/201/129');
		expect(new Headers(init?.headers).get('x-goog-api-key')).toBe(API_KEY);
	});

	it.each([
		['zoom above the cap', { z: '15', x: '0', y: '0' }, 400],
		['x out of range', { z: '2', x: '4', y: '0' }, 400],
		['non-integer', { z: '8', x: '1e2', y: '129' }, 400],
		['leading zero', { z: '08', x: '201', y: '129' }, 400],
		['tile outside Sumatra (Surabaya)', { z: '8', x: '208', y: '133' }, 404]
	])('rejects %s', async (_, params, status) => {
		const fetchFn = vi.fn<typeof fetch>();
		const response = await handleTileRequest(request(), params, API_KEY, fetchFn);
		expect(response.status).toBe(status);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('maps an upstream key rejection to not_authorized', async () => {
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 403, headers: { 'content-type': 'application/json' } }));
		const response = await handleTileRequest(request(), jambi, API_KEY, fetchFn);
		expect(await response.json()).toEqual({ error: { code: 'not_authorized' } });
	});
});
