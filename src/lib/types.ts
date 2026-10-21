export interface Coordinates {
	latitude: number;
	longitude: number;
}

export const POLLUTANT_CODES = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'] as const;
export type PollutantCode = (typeof POLLUTANT_CODES)[number];

export interface PollutantReading {
	code: PollutantCode;
	value: number;
	/** Unit enum exactly as returned by Google, e.g. "MICROGRAMS_PER_CUBIC_METER". */
	units: string;
}

/** An index picked from the response by code: Universal AQI ("uaqi") or Indonesia's ISPU ("idn_menlhk"). */
export interface UniversalAqi {
	displayName: string;
	aqi: number;
	aqiDisplay: string;
	category: string | null;
	dominantPollutant: string | null;
	/** CSS color from the API, used only for a small indicator. */
	color: string | null;
}

/** Population groups Google writes health advice for, in the order they are offered in the UI. */
export const HEALTH_GROUPS = [
	'generalPopulation',
	'children',
	'elderly',
	'pregnantWomen',
	'lungDiseasePopulation',
	'heartDiseasePopulation',
	'athletes'
] as const;
export type HealthGroup = (typeof HEALTH_GROUPS)[number];

export interface AirQualityData {
	/** Timestamp of the data itself (ISO 8601, UTC), not of the request. */
	dataTime: string;
	index: UniversalAqi;
	/**
	 * Indonesia's ISPU as Google computes it from its model (higher is worse, unlike UAQI). Only current
	 * conditions ask for it, and Google omits it outside Indonesia.
	 */
	ispu?: UniversalAqi;
	pollutants: PollutantReading[];
	/** Google's advice per group, verbatim; groups Google left out are absent. */
	recommendations: Partial<Record<HealthGroup, string>>;
}

export type ApiErrorCode =
	| 'invalid_request'
	| 'not_configured'
	| 'not_authorized'
	| 'quota_exceeded'
	| 'location_unsupported'
	| 'no_data'
	| 'timeout'
	| 'upstream_error';

export type ApiResponse<T> = { data: T } | { error: { code: ApiErrorCode } };

/** One location's results as the server streams them; each promise settles to data or an error, never rejects. */
export interface StreamedCity {
	current: Promise<ApiResponse<AirQualityData>>;
	forecast: Promise<ApiResponse<AirQualityData[]>>;
}

/** What the dashboard page streams for the region in its URL, keyed by city id. */
export interface RegionStream {
	region: string;
	cities: Record<string, StreamedCity>;
}

/** One line of GET /api/air-quality/region/[region] (NDJSON), sent as soon as that part is ready. */
export type RegionLine =
	| { id: string; part: 'current'; result: ApiResponse<AirQualityData> }
	| { id: string; part: 'forecast'; result: ApiResponse<AirQualityData[]> };

/** A NASA FIRMS VIIRS thermal anomaly: a likely fire, not a confirmed one. */
export interface Hotspot {
	latitude: number;
	longitude: number;
	/** Satellite overpass time (ISO 8601, UTC). */
	acquiredAt: string;
	satellite: string;
	confidence: 'low' | 'nominal' | 'high';
	/** Fire radiative power in MW. */
	frp: number | null;
}

export interface FireData {
	hotspots: Hotspot[];
	windowHours: number;
	/** When the server fetched FIRMS, not when the satellites passed over. */
	fetchedAt: string;
	sources: string[];
	missingSources: string[];
}

/** Wind 10 m above ground for one hour, on a regular latitude/longitude grid. */
export interface WindData {
	grid: { west: number; south: number; step: number; columns: number; rows: number };
	/** Eastward and northward components in m/s, row by row from the south-west corner. */
	u: number[];
	v: number[];
	/** Start of the forecast hour these values are for (ISO 8601, UTC). */
	validAt: string;
	/** When the server fetched the model run, not when it was computed. */
	fetchedAt: string;
}

/** One sample of a smoke trace's path, going back in time from the place. */
export interface TracePoint {
	latitude: number;
	longitude: number;
	hoursBack: number;
	/** Distance travelled along the path from the place, in km. */
	distanceKm: number;
	/** How far either side of the path the air may have passed, in km. */
	radiusKm: number;
}

/** A FIRMS hotspot inside a smoke trace's corridor. */
export interface TraceHotspot {
	latitude: number;
	longitude: number;
	frp: number | null;
	acquiredAt: string;
	/** Roughly how long ago the traced air passed over it. */
	hoursBack: number;
}

/** Corridor hotspots burning as one contiguous area, summarised from the place's point of view. */
export interface FireGroup {
	latitude: number;
	longitude: number;
	count: number;
	totalFrp: number;
	distanceKm: number;
	/** Compass bearing from the place to the group. */
	bearing: number;
	hoursBack: number;
}

export type TraceLevel = 'none' | 'light' | 'heavy';
