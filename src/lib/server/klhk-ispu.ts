import { EDGE_CACHE_CONTROL } from '@/lib/config/cache';
import { citiesInRegion, REGIONS, type RegionId } from '@/lib/config/cities';
import { STATION_CITY } from '@/lib/config/klhk-stations';
import type { ApiErrorCode } from '@/lib/types';
import { fail, isCrossSite, log, respond } from './http';

export interface KlhkPollutants {
	pm10: number | null;
	pm25: number | null;
	so2: number | null;
	co: number | null;
	o3: number | null;
	no2: number | null;
}

/** One fixed KLH/BPLH station with a recent reading; ISPU values per pollutant, not concentrations. */
export interface KlhkStation {
	id: string;
	/** The city in `cities.ts` this station measures, or null when it sits elsewhere (see STATION_CITY). */
	cityId: string | null;
	name: string;
	ispu: number;
	category: string | null;
	criticalPollutant: string | null;
	/** When the station measured (ISO 8601, UTC). */
	observedAt: string;
	pollutants: KlhkPollutants;
}

export interface KlhkProvinceData {
	province: string;
	stations: KlhkStation[];
	/** When the server last read the KLH page, not when the stations measured. */
	fetchedAt: string;
}

export class KlhkError extends Error {
	constructor(
		readonly code: ApiErrorCode,
		message: string
	) {
		super(message);
		this.name = 'KlhkError';
	}
}

// Checked against every province page on 19 Oct 2026: the rest match our id with spaces, including
// "bangka belitung" ("kepulauan bangka belitung" returns an empty page).
const PROVINCE_OVERRIDES: Partial<Record<RegionId, string>> = {
	'di-yogyakarta': 'yogyakarta'
};

/** The KLH province page slug for one of our region ids. */
export function regionToProvince(region: RegionId): string {
	return PROVINCE_OVERRIDES[region] ?? region.replace(/-/g, ' ');
}

const UPSTREAM_TIMEOUT_MS = 15_000;
const PROVINCE_URL = 'https://ispu.kemenlh.go.id/internal/web/site/provinsi/';

/** KLH refreshes hourly; 20 minutes keeps pages current without asking for each view. */
const CACHE_TTL_MS = 20 * 60_000;

/**
 * Pages keep offline stations with their last reading, some from years ago. Readings older than this are
 * dropped. It allows for stations that post an hour late, and for the hour a station's clock can differ
 * from its province's zone: the pages carry no zone label.
 */
const MAX_READING_AGE_MS = 3 * 60 * 60_000;

/** Mobile units move between sites, so their reading belongs to no fixed place. */
const MOBILE_STATION = /^MOBILE_/;

/** Indonesia has no daylight saving, so each zone is a fixed offset from UTC. */
const UTC_OFFSET_HOURS: Record<string, number> = { 'Asia/Jakarta': 7, 'Asia/Pontianak': 7, 'Asia/Makassar': 8, 'Asia/Jayapura': 9 };

const MONTHS = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];

/** A numeric span value, or null for "-" or a missing element. */
function parseVal(html: string, id: string): number | null {
	const m = html.match(new RegExp(`id="${id}"[^>]*>\\s*([^<]+)`, 'i'));
	if (!m) return null;
	const n = Number(m[1].trim());
	return Number.isFinite(n) ? n : null;
}

/** An element's text with inner tags (<sub>, <br/>) turned into spaces, or null for "-". */
function parseText(html: string, id: string): string | null {
	const m = html.match(new RegExp(`id="${id}"[^>]*>\\s*([\\s\\S]*?)<\\/`, 'i'));
	if (!m) return null;
	const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
	return text && text !== '-' ? text : null;
}

/** "19 Oktober 2026 18:00" in the province's local time, as UTC. Null for a bare hour or anything else. */
export function parseObservedAt(text: string | null, timeZone: string): string | null {
	const m = text?.match(/^(\d{1,2}) (\p{L}+) (\d{4}) (\d{1,2}):(\d{2})$/u);
	if (!m) return null;
	const month = MONTHS.indexOf(m[2].toLowerCase());
	const offset = UTC_OFFSET_HOURS[timeZone];
	if (month === -1 || offset === undefined) return null;
	return new Date(Date.UTC(Number(m[3]), month, Number(m[1]), Number(m[4]) - offset, Number(m[5]))).toISOString();
}

function stationIds(html: string): string[] {
	return [...html.matchAll(/id="([^"]+)-sum-value"/g)].map((m) => m[1]);
}

/** The name sits after the pin image in the title block that precedes the station's category. */
function parseStationName(html: string, id: string): string {
	const at = html.indexOf(`id="${id}-category"`);
	if (at === -1) return id;
	const block = html.substring(Math.max(0, at - 2000), at);
	const m = block.match(/class="pull-left"[\s\S]*?<img[^>]*>\s*([\s\S]*?)\s*<(?:span|\/div)/i);
	if (!m) return id;
	return m[1]
		.replace(/^Stasiun\s+/i, '')
		// "Jambi Paal Lima, Jambi, Jambi [KLHK]": the city and province repeat what the page already says.
		.replace(/[,[].*$/, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Fixed stations with a value and a full date; age is checked when read, so the cache can serve them. */
function parseStations(html: string, timeZone: string): KlhkStation[] {
	return stationIds(html).flatMap((id) => {
		const ispu = parseVal(html, `${id}-sum-value`);
		const observedAt = parseObservedAt(parseText(html, `${id}-sum-waktu`), timeZone);
		if (MOBILE_STATION.test(id) || ispu === null || observedAt === null) return [];
		return [
			{
				id,
				cityId: STATION_CITY[id] ?? null,
				name: parseStationName(html, id),
				ispu,
				category: parseText(html, `${id}-category`),
				criticalPollutant: parseText(html, `${id}-sum-param`),
				observedAt,
				pollutants: {
					pm10: parseVal(html, `${id}-pm10-val`),
					pm25: parseVal(html, `${id}-pm25-val`),
					so2: parseVal(html, `${id}-so2-val`),
					co: parseVal(html, `${id}-co-val`),
					o3: parseVal(html, `${id}-o3-val`),
					no2: parseVal(html, `${id}-no2-val`)
				}
			}
		];
	});
}

interface CacheEntry {
	data: KlhkProvinceData;
	expires: number;
}

// On globalThis, like the air quality cache, so the route and any page share one copy.
const STATE_KEY = Symbol.for('niskala.klhkIspuCache');
const cache: Map<string, CacheEntry> = ((globalThis as Record<symbol, Map<string, CacheEntry> | undefined>)[STATE_KEY] ??= new Map());

export function clearKlhkCache() {
	cache.clear();
}

function recent(data: KlhkProvinceData, now: number): KlhkProvinceData {
	return { ...data, stations: data.stations.filter((s) => now - Date.parse(s.observedAt) <= MAX_READING_AGE_MS) };
}

/**
 * Recent readings from every fixed station on a province's KLH page. If KLH cannot be reached, the last
 * copy is served instead (its old readings drop out by age); with no copy at all it throws `KlhkError`.
 */
export async function fetchKlhkProvince(region: RegionId, fetchFn: typeof fetch = fetch, now = Date.now()): Promise<KlhkProvinceData> {
	const province = regionToProvince(region);
	const hit = cache.get(province);
	if (hit && now < hit.expires) return recent(hit.data, now);

	const startedAt = performance.now();
	let html: string;
	try {
		const response = await fetchFn(PROVINCE_URL + encodeURIComponent(province), { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
		if (!response.ok) throw new KlhkError('upstream_error', `upstream HTTP ${response.status}`);
		html = await response.text();
	} catch (error) {
		const failure =
			error instanceof KlhkError
				? error
				: error instanceof DOMException && error.name === 'TimeoutError'
					? new KlhkError('timeout', `no response within ${UPSTREAM_TIMEOUT_MS} ms`)
					: new KlhkError('upstream_error', `network failure: ${error instanceof Error ? error.name : 'unknown'}`);
		log('klhk-ispu', failure.code, `${province}: ${failure.message}`, startedAt);
		if (hit) return recent(hit.data, now);
		throw failure;
	}

	// Every province has cities, and each province sits in one zone.
	const timeZone = citiesInRegion(region)[0]?.timeZone ?? 'Asia/Jakarta';
	const data: KlhkProvinceData = { province, stations: parseStations(html, timeZone), fetchedAt: new Date(now).toISOString() };
	cache.set(province, { data, expires: now + CACHE_TTL_MS });
	return recent(data, now);
}

/** GET /api/klhk-ispu/region/[region]: recent KLH station readings for one province. */
export async function handleKlhkRequest(request: Request, param: string, fetchFn: typeof fetch = fetch): Promise<Response> {
	if (isCrossSite(request)) return fail('invalid_request', 403);
	// REGIONS holds provinces only; island groups live in ISLANDS and have no KLH page.
	const region = REGIONS.find((r) => r.id === param)?.id;
	if (!region) return fail('invalid_request', 404);
	try {
		return respond({ data: await fetchKlhkProvince(region, fetchFn) }, 200, EDGE_CACHE_CONTROL);
	} catch (error) {
		return fail(error instanceof KlhkError ? error.code : 'upstream_error');
	}
}
