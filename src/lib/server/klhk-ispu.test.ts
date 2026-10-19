import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EDGE_CACHE_CONTROL } from '@/lib/config/cache';
import { CITIES, REGIONS } from '@/lib/config/cities';
import { STATION_CITY, STATION_POSITIONS } from '@/lib/config/klhk-stations';
import { clearKlhkCache, fetchKlhkNational, fetchKlhkProvince, handleKlhkRequest, parseObservedAt, regionToProvince } from './klhk-ispu';

/** 18:30 WIB on the day the fixture was captured. */
const NOW = Date.UTC(2026, 9, 19, 11, 30);

function station(id: string, name: string, sumValue: string, waktu: string, extra = '') {
	return `
<div class="card primary flex-container">
  <div class="stasiun-title flex-children">
    <div class="pull-left">
      <img src="/internal/web/img/pin.png" alt="marker">
      Stasiun ${name} [KLHK]
      <span class='alamat'>Kel. , Kec. </span>
    </div>
    <div id="${id}-category" class="pull-right title-category">SEDANG</div>
  </div>
  ${extra}
  <span id="${id}-sum-param" class="ispu-summary-value">PM<sub>2.5</sub></span>
  <span id="${id}-sum-value" class="ispu-summary-value">${sumValue}</span>
  <span id="${id}-sum-waktu" class="ispu-summary-value-2">${waktu}</span>
</div>`;
}

/** Mirrors the KLH province page: one fresh station, then the cases seen live that must be dropped. */
const HTML = [
	station(
		'DKI1',
		'DKI 1 Bundaran HI, Jakarta, DKI Jakarta',
		'96',
		'19 Oktober 2026<br/>17:00',
		`<span id="DKI1-pm10-val" class="ispu-val">59</span>
  <span id="DKI1-pm25-val" class="ispu-val">96</span>
  <span id="DKI1-so2-val" class="ispu-val">44</span>
  <span id="DKI1-co-val" class="ispu-val">9</span>
  <span id="DKI1-o3-val" class="ispu-val">23</span>
  <span id="DKI1-no2-val" class="ispu-val">-</span>`
	),
	station('JAKARTA_TIMUR', 'Jakarta Timur', '35', '02 Desember 2022<br/>13:00'),
	station('JAKARTA_TIMUR_BONAS', 'Jakarta Timur Bonas', '40', '  <br/>07:00'),
	station('OFFLINE', 'Offline Station', '-', '19 Oktober 2026<br/>18:00'),
	station('MOBILE_AQMS_BPBD_KALTENG', 'Mobile AQMS', '80', '19 Oktober 2026<br/>18:00')
].join('\n');

function fakeFetch(html: string) {
	return vi.fn<typeof fetch>().mockImplementation(async () => new Response(html, { status: 200 }));
}

const failFetch: typeof fetch = async () => {
	throw new TypeError('network');
};

beforeEach(() => {
	clearKlhkCache();
	// Failures are logged on purpose; keep them out of the test output.
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('regionToProvince', () => {
	it('uses the slugs the KLH pages answer to', () => {
		expect(regionToProvince('dki-jakarta')).toBe('dki jakarta');
		expect(regionToProvince('kalimantan-tengah')).toBe('kalimantan tengah');
		expect(regionToProvince('bangka-belitung')).toBe('bangka belitung');
		expect(regionToProvince('di-yogyakarta')).toBe('yogyakarta');
	});
});

describe('STATION_CITY', () => {
	it('points every station at a city that exists', () => {
		const ids = new Set(CITIES.map((c) => c.id));
		expect(Object.values(STATION_CITY).filter((id) => !ids.has(id))).toEqual([]);
	});

	it('has a position for every station mapped to a city', () => {
		expect(Object.keys(STATION_CITY).filter((id) => !STATION_POSITIONS[id])).toEqual([]);
	});
});

describe('parseObservedAt', () => {
	it('reads Indonesian dates in the province zone as UTC', () => {
		expect(parseObservedAt('19 Oktober 2026 18:00', 'Asia/Jakarta')).toBe('2026-10-19T11:00:00.000Z');
		expect(parseObservedAt('19 Oktober 2026 19:00', 'Asia/Makassar')).toBe('2026-10-19T11:00:00.000Z');
		expect(parseObservedAt('1 Januari 2027 08:00', 'Asia/Jayapura')).toBe('2026-12-31T23:00:00.000Z');
	});

	it('rejects a bare hour, an unknown month or zone', () => {
		expect(parseObservedAt('07:00', 'Asia/Jakarta')).toBeNull();
		expect(parseObservedAt('19 October 2026 18:00', 'Asia/Jakarta')).toBeNull();
		expect(parseObservedAt('19 Oktober 2026 18:00', 'Europe/Berlin')).toBeNull();
		expect(parseObservedAt(null, 'Asia/Jakarta')).toBeNull();
	});
});

describe('fetchKlhkProvince', () => {
	it('keeps fresh fixed stations and drops stale, undated, offline and mobile ones', async () => {
		const fetchFn = fakeFetch(HTML);
		const result = await fetchKlhkProvince('dki-jakarta', fetchFn, NOW);

		expect(String(fetchFn.mock.calls[0][0])).toBe('https://ispu.kemenlh.go.id/internal/web/site/provinsi/dki%20jakarta');
		expect(result.province).toBe('dki jakarta');
		expect(result.stations.map((s) => s.id)).toEqual(['DKI1']);
		expect(result.stations[0]).toEqual({
			id: 'DKI1',
			cityId: 'jakarta',
			position: { latitude: -6.19479, longitude: 106.823 },
			name: 'DKI 1 Bundaran HI',
			ispu: 96,
			category: 'SEDANG',
			criticalPollutant: 'PM 2.5',
			observedAt: '2026-10-19T10:00:00.000Z',
			pollutants: { pm10: 59, pm25: 96, so2: 44, co: 9, o3: 23, no2: null }
		});
	});

	it('drops a reading once it is more than three hours old, even from the cache', async () => {
		await fetchKlhkProvince('dki-jakarta', fakeFetch(HTML), NOW);
		const later = await fetchKlhkProvince('dki-jakarta', failFetch, Date.UTC(2026, 9, 19, 13, 1));
		expect(later.stations).toEqual([]);
	});

	it('serves the cached copy without asking KLH again inside 20 minutes', async () => {
		await fetchKlhkProvince('dki-jakarta', fakeFetch(HTML), NOW);
		const fetchFn = fakeFetch('');
		const result = await fetchKlhkProvince('dki-jakarta', fetchFn, NOW + 19 * 60_000);
		expect(fetchFn).not.toHaveBeenCalled();
		expect(result.stations).toHaveLength(1);
	});

	it('falls back to the last copy when KLH cannot be reached', async () => {
		await fetchKlhkProvince('dki-jakarta', fakeFetch(HTML), NOW);
		const result = await fetchKlhkProvince('dki-jakarta', failFetch, NOW + 30 * 60_000);
		expect(result.stations.map((s) => s.id)).toEqual(['DKI1']);
	});

	it('throws with a code when KLH fails and nothing is cached', async () => {
		await expect(fetchKlhkProvince('banten', failFetch, NOW)).rejects.toMatchObject({ code: 'upstream_error' });
		const down = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
		await expect(fetchKlhkProvince('banten', down, NOW)).rejects.toMatchObject({ code: 'upstream_error' });
	});
});

describe('fetchKlhkNational', () => {
	/** DKI1 has a position; NOWHERE is a fresh station missing from STATION_POSITIONS. */
	const page = HTML + station('NOWHERE', 'Nowhere', '50', '19 Oktober 2026<br/>18:00');

	it('lists each positioned station once, though many province pages repeat it', async () => {
		const fetchFn = fakeFetch(page);
		const result = await fetchKlhkNational(fetchFn, NOW);
		expect(fetchFn).toHaveBeenCalledTimes(REGIONS.length);
		expect(result.stations.map((s) => s.id)).toEqual(['DKI1']);
		expect(result.missingProvinces).toEqual([]);
	});

	it('names provinces that could not be read and keeps the rest', async () => {
		const fetchFn: typeof fetch = async (url) =>
			String(url).endsWith('/banten') ? Promise.reject(new TypeError('network')) : new Response(page, { status: 200 });
		const result = await fetchKlhkNational(fetchFn, NOW);
		expect(result.missingProvinces).toEqual(['banten']);
		expect(result.stations).toHaveLength(1);
	});

	it('fails only when no province could be read', async () => {
		await expect(fetchKlhkNational(failFetch, NOW)).rejects.toMatchObject({ code: 'upstream_error' });
	});
});

describe('handleKlhkRequest', () => {
	const request = (headers: Record<string, string> = {}) => new Request('http://localhost/api/klhk-ispu/region/x', { headers });

	it('answers with { data } and the edge cache header', async () => {
		vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
		try {
			const response = await handleKlhkRequest(request(), 'dki-jakarta', fakeFetch(HTML));
			expect(response.status).toBe(200);
			expect(response.headers.get('cache-control')).toBe(EDGE_CACHE_CONTROL);
			const body = await response.json();
			expect(body.data.stations).toHaveLength(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('rejects island groups, unknown ids and cross-site requests', async () => {
		const fetchFn = fakeFetch(HTML);
		expect((await handleKlhkRequest(request(), 'sumatra', fetchFn)).status).toBe(404);
		expect((await handleKlhkRequest(request(), 'atlantis', fetchFn)).status).toBe(404);
		expect((await handleKlhkRequest(request({ 'sec-fetch-site': 'cross-site' }), 'dki-jakarta', fetchFn)).status).toBe(403);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('reports an outage as an error, not as a province without stations', async () => {
		const response = await handleKlhkRequest(request(), 'banten', failFetch);
		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({ error: { code: 'upstream_error' } });
	});
});
