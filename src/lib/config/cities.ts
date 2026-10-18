/**
 * Locations shown in the app. Each one is a single reference point, not an average:
 * the city center for a kota, the regency seat (ibu kota kabupaten) for a kabupaten.
 * Add or edit entries here; `timeZone` must be an IANA zone so data times show WIB/WITA/WIT.
 * The first region is the default on the dashboard.
 */
export const REGIONS = [
	{ id: 'jambi', name: 'Provinsi Jambi' },
	{ id: 'jawa-bali', name: 'Jawa & Bali' }
] as const;

export type RegionId = (typeof REGIONS)[number]['id'];

export interface City {
	id: string;
	name: string;
	region: RegionId;
	kind: 'kota' | 'kabupaten';
	/** Where the reference point sits, shown to users. */
	point: string;
	latitude: number;
	longitude: number;
	timeZone: string;
}

// Jambi points: settlement nodes from OpenStreetMap (Nominatim), checked 19 Oct 2026.
export const CITIES: readonly City[] = [
	{ id: 'kota-jambi', name: 'Kota Jambi', region: 'jambi', kind: 'kota', point: 'pusat kota', latitude: -1.6297, longitude: 103.6078, timeZone: 'Asia/Jakarta' },
	{ id: 'sungai-penuh', name: 'Sungai Penuh', region: 'jambi', kind: 'kota', point: 'pusat kota', latitude: -2.0612, longitude: 101.3986, timeZone: 'Asia/Jakarta' },
	{ id: 'batanghari', name: 'Batanghari', region: 'jambi', kind: 'kabupaten', point: 'Muara Bulian', latitude: -1.7143, longitude: 103.2616, timeZone: 'Asia/Jakarta' },
	{ id: 'bungo', name: 'Bungo', region: 'jambi', kind: 'kabupaten', point: 'Muara Bungo', latitude: -1.5161, longitude: 102.1188, timeZone: 'Asia/Jakarta' },
	{ id: 'kerinci', name: 'Kerinci', region: 'jambi', kind: 'kabupaten', point: 'Siulak', latitude: -1.935, longitude: 101.3421, timeZone: 'Asia/Jakarta' },
	{ id: 'merangin', name: 'Merangin', region: 'jambi', kind: 'kabupaten', point: 'Bangko', latitude: -2.06, longitude: 102.2742, timeZone: 'Asia/Jakarta' },
	{ id: 'muaro-jambi', name: 'Muaro Jambi', region: 'jambi', kind: 'kabupaten', point: 'Sengeti', latitude: -1.4495, longitude: 103.5161, timeZone: 'Asia/Jakarta' },
	{ id: 'sarolangun', name: 'Sarolangun', region: 'jambi', kind: 'kabupaten', point: 'Sarolangun', latitude: -2.3031, longitude: 102.7191, timeZone: 'Asia/Jakarta' },
	{ id: 'tanjung-jabung-barat', name: 'Tanjung Jabung Barat', region: 'jambi', kind: 'kabupaten', point: 'Kuala Tungkal', latitude: -0.8265, longitude: 103.4612, timeZone: 'Asia/Jakarta' },
	{ id: 'tanjung-jabung-timur', name: 'Tanjung Jabung Timur', region: 'jambi', kind: 'kabupaten', point: 'Muara Sabak', latitude: -1.206, longitude: 103.7903, timeZone: 'Asia/Jakarta' },
	{ id: 'tebo', name: 'Tebo', region: 'jambi', kind: 'kabupaten', point: 'Muara Tebo', latitude: -1.4853, longitude: 102.4417, timeZone: 'Asia/Jakarta' },

	{ id: 'jakarta', name: 'Jakarta', region: 'jawa-bali', kind: 'kota', point: 'pusat kota', latitude: -6.1754, longitude: 106.8272, timeZone: 'Asia/Jakarta' },
	{ id: 'bandung', name: 'Bandung', region: 'jawa-bali', kind: 'kota', point: 'pusat kota', latitude: -6.9175, longitude: 107.6191, timeZone: 'Asia/Jakarta' },
	{ id: 'surabaya', name: 'Surabaya', region: 'jawa-bali', kind: 'kota', point: 'pusat kota', latitude: -7.2575, longitude: 112.7521, timeZone: 'Asia/Jakarta' },
	{ id: 'yogyakarta', name: 'Yogyakarta', region: 'jawa-bali', kind: 'kota', point: 'pusat kota', latitude: -7.7829, longitude: 110.3671, timeZone: 'Asia/Jakarta' },
	{ id: 'denpasar', name: 'Denpasar', region: 'jawa-bali', kind: 'kota', point: 'pusat kota', latitude: -8.6705, longitude: 115.2126, timeZone: 'Asia/Makassar' }
];

/** e.g. "Kabupaten · titik di Muara Bulian" or "Kota · titik di pusat kota". */
export function cityNote(city: City): string {
	return `${city.kind === 'kota' ? 'Kota' : 'Kabupaten'} · titik di ${city.point}`;
}

export function citiesInRegion(region: RegionId): City[] {
	return CITIES.filter((city) => city.region === region);
}
