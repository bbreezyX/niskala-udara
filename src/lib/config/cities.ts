/**
 * Locations shown in the app. Each one is a single reference point, not an average:
 * the city center for a kota, the regency seat (ibu kota kabupaten) for a kabupaten.
 * Add or edit entries here; `timeZone` must be an IANA zone so data times show WIB/WITA/WIT.
 */
/** Island groups for the region picker, in display order. */
export const ISLANDS = [
	{ id: 'sumatra', name: 'Sumatra' },
	{ id: 'jawa', name: 'Jawa' },
	{ id: 'bali-nusa-tenggara', name: 'Bali & Nusa Tenggara' },
	{ id: 'kalimantan', name: 'Kalimantan' },
	{ id: 'sulawesi', name: 'Sulawesi' },
	{ id: 'maluku-papua', name: 'Maluku & Papua' }
] as const;

export type IslandId = (typeof ISLANDS)[number]['id'];

/** Provinces, in geographic order within each island group. */
export const REGIONS = [
	{ id: 'aceh', name: 'Aceh', island: 'sumatra' },
	{ id: 'sumatera-utara', name: 'Sumatera Utara', island: 'sumatra' },
	{ id: 'sumatera-barat', name: 'Sumatera Barat', island: 'sumatra' },
	{ id: 'riau', name: 'Riau', island: 'sumatra' },
	{ id: 'kepulauan-riau', name: 'Kepulauan Riau', island: 'sumatra' },
	{ id: 'jambi', name: 'Jambi', island: 'sumatra' },
	{ id: 'sumatera-selatan', name: 'Sumatera Selatan', island: 'sumatra' },
	{ id: 'bangka-belitung', name: 'Kepulauan Bangka Belitung', island: 'sumatra' },
	{ id: 'bengkulu', name: 'Bengkulu', island: 'sumatra' },
	{ id: 'lampung', name: 'Lampung', island: 'sumatra' },
	{ id: 'dki-jakarta', name: 'DKI Jakarta', island: 'jawa' },
	{ id: 'banten', name: 'Banten', island: 'jawa' },
	{ id: 'jawa-barat', name: 'Jawa Barat', island: 'jawa' },
	{ id: 'jawa-tengah', name: 'Jawa Tengah', island: 'jawa' },
	{ id: 'di-yogyakarta', name: 'DI Yogyakarta', island: 'jawa' },
	{ id: 'jawa-timur', name: 'Jawa Timur', island: 'jawa' },
	{ id: 'bali', name: 'Bali', island: 'bali-nusa-tenggara' },
	{ id: 'nusa-tenggara-barat', name: 'Nusa Tenggara Barat', island: 'bali-nusa-tenggara' },
	{ id: 'nusa-tenggara-timur', name: 'Nusa Tenggara Timur', island: 'bali-nusa-tenggara' },
	{ id: 'kalimantan-barat', name: 'Kalimantan Barat', island: 'kalimantan' },
	{ id: 'kalimantan-tengah', name: 'Kalimantan Tengah', island: 'kalimantan' },
	{ id: 'kalimantan-selatan', name: 'Kalimantan Selatan', island: 'kalimantan' },
	{ id: 'kalimantan-timur', name: 'Kalimantan Timur', island: 'kalimantan' },
	{ id: 'kalimantan-utara', name: 'Kalimantan Utara', island: 'kalimantan' },
	{ id: 'sulawesi-utara', name: 'Sulawesi Utara', island: 'sulawesi' },
	{ id: 'gorontalo', name: 'Gorontalo', island: 'sulawesi' },
	{ id: 'sulawesi-tengah', name: 'Sulawesi Tengah', island: 'sulawesi' },
	{ id: 'sulawesi-barat', name: 'Sulawesi Barat', island: 'sulawesi' },
	{ id: 'sulawesi-selatan', name: 'Sulawesi Selatan', island: 'sulawesi' },
	{ id: 'sulawesi-tenggara', name: 'Sulawesi Tenggara', island: 'sulawesi' },
	{ id: 'maluku', name: 'Maluku', island: 'maluku-papua' },
	{ id: 'maluku-utara', name: 'Maluku Utara', island: 'maluku-papua' },
	{ id: 'papua-barat-daya', name: 'Papua Barat Daya', island: 'maluku-papua' },
	{ id: 'papua-barat', name: 'Papua Barat', island: 'maluku-papua' },
	{ id: 'papua-tengah', name: 'Papua Tengah', island: 'maluku-papua' },
	{ id: 'papua-pegunungan', name: 'Papua Pegunungan', island: 'maluku-papua' },
	{ id: 'papua', name: 'Papua', island: 'maluku-papua' },
	{ id: 'papua-selatan', name: 'Papua Selatan', island: 'maluku-papua' }
] as const satisfies readonly { id: string; name: string; island: IslandId }[];

export type RegionId = (typeof REGIONS)[number]['id'];

/** Shown when the URL names no region. */
export const DEFAULT_REGION: RegionId = 'jambi';

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

/*
 * Outside Jambi: every kota (from Wikidata, 19 Oct 2026) plus Jakarta and the province capitals that are
 * regency seats. Points: OpenStreetMap (Nominatim), cross-checked against Wikidata; the province capital comes first.
 */
export const CITIES: readonly City[] = [
	{ id: 'banda-aceh', name: 'Banda Aceh', region: 'aceh', kind: 'kota', point: 'pusat kota', latitude: 5.5528, longitude: 95.3193, timeZone: 'Asia/Jakarta' },
	{ id: 'langsa', name: 'Langsa', region: 'aceh', kind: 'kota', point: 'pusat kota', latitude: 4.4731, longitude: 97.9682, timeZone: 'Asia/Jakarta' },
	{ id: 'lhokseumawe', name: 'Lhokseumawe', region: 'aceh', kind: 'kota', point: 'pusat kota', latitude: 5.179, longitude: 97.1481, timeZone: 'Asia/Jakarta' },
	{ id: 'sabang', name: 'Sabang', region: 'aceh', kind: 'kota', point: 'pusat kota', latitude: 5.8927, longitude: 95.3226, timeZone: 'Asia/Jakarta' },
	{ id: 'subulussalam', name: 'Subulussalam', region: 'aceh', kind: 'kota', point: 'pusat kota', latitude: 2.6403, longitude: 98.0052, timeZone: 'Asia/Jakarta' },

	{ id: 'medan', name: 'Medan', region: 'sumatera-utara', kind: 'kota', point: 'pusat kota', latitude: 3.5895, longitude: 98.6742, timeZone: 'Asia/Jakarta' },
	{ id: 'binjai', name: 'Binjai', region: 'sumatera-utara', kind: 'kota', point: 'pusat kota', latitude: 3.6066, longitude: 98.4859, timeZone: 'Asia/Jakarta' },
	{ id: 'gunungsitoli', name: 'Gunungsitoli', region: 'sumatera-utara', kind: 'kota', point: 'pusat kota', latitude: 1.2896, longitude: 97.6131, timeZone: 'Asia/Jakarta' },
	{ id: 'padangsidimpuan', name: 'Padangsidimpuan', region: 'sumatera-utara', kind: 'kota', point: 'pusat kota', latitude: 1.3727, longitude: 99.2727, timeZone: 'Asia/Jakarta' },
	{ id: 'pematangsiantar', name: 'Pematangsiantar', region: 'sumatera-utara', kind: 'kota', point: 'pusat kota', latitude: 2.9589, longitude: 99.0654, timeZone: 'Asia/Jakarta' },
	{ id: 'sibolga', name: 'Sibolga', region: 'sumatera-utara', kind: 'kota', point: 'pusat kota', latitude: 1.737, longitude: 98.7846, timeZone: 'Asia/Jakarta' },
	{ id: 'tanjungbalai', name: 'Tanjungbalai', region: 'sumatera-utara', kind: 'kota', point: 'pusat kota', latitude: 2.9703, longitude: 99.8021, timeZone: 'Asia/Jakarta' },
	{ id: 'tebing-tinggi', name: 'Tebing Tinggi', region: 'sumatera-utara', kind: 'kota', point: 'pusat kota', latitude: 3.3179, longitude: 99.1613, timeZone: 'Asia/Jakarta' },

	{ id: 'padang', name: 'Padang', region: 'sumatera-barat', kind: 'kota', point: 'pusat kota', latitude: -0.9248, longitude: 100.3633, timeZone: 'Asia/Jakarta' },
	{ id: 'bukittinggi', name: 'Bukittinggi', region: 'sumatera-barat', kind: 'kota', point: 'pusat kota', latitude: -0.3052, longitude: 100.3695, timeZone: 'Asia/Jakarta' },
	{ id: 'padang-panjang', name: 'Padang Panjang', region: 'sumatera-barat', kind: 'kota', point: 'pusat kota', latitude: -0.4655, longitude: 100.3932, timeZone: 'Asia/Jakarta' },
	{ id: 'pariaman', name: 'Pariaman', region: 'sumatera-barat', kind: 'kota', point: 'pusat kota', latitude: -0.6264, longitude: 100.1178, timeZone: 'Asia/Jakarta' },
	{ id: 'payakumbuh', name: 'Payakumbuh', region: 'sumatera-barat', kind: 'kota', point: 'pusat kota', latitude: -0.2243, longitude: 100.6319, timeZone: 'Asia/Jakarta' },
	{ id: 'sawahlunto', name: 'Sawahlunto', region: 'sumatera-barat', kind: 'kota', point: 'pusat kota', latitude: -0.6818, longitude: 100.7786, timeZone: 'Asia/Jakarta' },
	{ id: 'solok', name: 'Solok', region: 'sumatera-barat', kind: 'kota', point: 'pusat kota', latitude: -0.7991, longitude: 100.653, timeZone: 'Asia/Jakarta' },

	{ id: 'pekanbaru', name: 'Pekanbaru', region: 'riau', kind: 'kota', point: 'pusat kota', latitude: 0.5262, longitude: 101.4516, timeZone: 'Asia/Jakarta' },
	{ id: 'dumai', name: 'Dumai', region: 'riau', kind: 'kota', point: 'pusat kota', latitude: 1.6632, longitude: 101.447, timeZone: 'Asia/Jakarta' },

	{ id: 'tanjungpinang', name: 'Tanjungpinang', region: 'kepulauan-riau', kind: 'kota', point: 'pusat kota', latitude: 0.9237, longitude: 104.4461, timeZone: 'Asia/Jakarta' },
	{ id: 'batam', name: 'Batam', region: 'kepulauan-riau', kind: 'kota', point: 'pusat kota', latitude: 1.1031, longitude: 104.0384, timeZone: 'Asia/Jakarta' },

	// Jambi: every kota and kabupaten. Points: settlement nodes from OpenStreetMap (Nominatim), checked 19 Oct 2026.
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

	{ id: 'palembang', name: 'Palembang', region: 'sumatera-selatan', kind: 'kota', point: 'pusat kota', latitude: -2.9888, longitude: 104.7569, timeZone: 'Asia/Jakarta' },
	{ id: 'lubuklinggau', name: 'Lubuklinggau', region: 'sumatera-selatan', kind: 'kota', point: 'pusat kota', latitude: -3.2917, longitude: 102.8702, timeZone: 'Asia/Jakarta' },
	{ id: 'pagar-alam', name: 'Pagar Alam', region: 'sumatera-selatan', kind: 'kota', point: 'pusat kota', latitude: -4.0212, longitude: 103.2517, timeZone: 'Asia/Jakarta' },
	{ id: 'prabumulih', name: 'Prabumulih', region: 'sumatera-selatan', kind: 'kota', point: 'pusat kota', latitude: -3.4383, longitude: 104.231, timeZone: 'Asia/Jakarta' },

	{ id: 'pangkalpinang', name: 'Pangkalpinang', region: 'bangka-belitung', kind: 'kota', point: 'pusat kota', latitude: -2.1207, longitude: 106.1135, timeZone: 'Asia/Jakarta' },

	{ id: 'kota-bengkulu', name: 'Kota Bengkulu', region: 'bengkulu', kind: 'kota', point: 'pusat kota', latitude: -3.7923, longitude: 102.2624, timeZone: 'Asia/Jakarta' },

	{ id: 'bandar-lampung', name: 'Bandar Lampung', region: 'lampung', kind: 'kota', point: 'pusat kota', latitude: -5.4294, longitude: 105.2626, timeZone: 'Asia/Jakarta' },
	{ id: 'metro', name: 'Metro', region: 'lampung', kind: 'kota', point: 'pusat kota', latitude: -5.1147, longitude: 105.3082, timeZone: 'Asia/Jakarta' },

	{ id: 'jakarta', name: 'Jakarta', region: 'dki-jakarta', kind: 'kota', point: 'pusat kota', latitude: -6.1754, longitude: 106.8272, timeZone: 'Asia/Jakarta' },

	{ id: 'serang', name: 'Serang', region: 'banten', kind: 'kota', point: 'pusat kota', latitude: -6.117, longitude: 106.1518, timeZone: 'Asia/Jakarta' },
	{ id: 'cilegon', name: 'Cilegon', region: 'banten', kind: 'kota', point: 'pusat kota', latitude: -6.0174, longitude: 106.0538, timeZone: 'Asia/Jakarta' },
	{ id: 'tangerang', name: 'Tangerang', region: 'banten', kind: 'kota', point: 'pusat kota', latitude: -6.1762, longitude: 106.6382, timeZone: 'Asia/Jakarta' },
	{ id: 'tangerang-selatan', name: 'Tangerang Selatan', region: 'banten', kind: 'kota', point: 'pusat kota', latitude: -6.3227, longitude: 106.7086, timeZone: 'Asia/Jakarta' },

	{ id: 'bandung', name: 'Bandung', region: 'jawa-barat', kind: 'kota', point: 'pusat kota', latitude: -6.9175, longitude: 107.6191, timeZone: 'Asia/Jakarta' },
	{ id: 'banjar', name: 'Banjar', region: 'jawa-barat', kind: 'kota', point: 'pusat kota', latitude: -7.3696, longitude: 108.5415, timeZone: 'Asia/Jakarta' },
	{ id: 'bekasi', name: 'Bekasi', region: 'jawa-barat', kind: 'kota', point: 'pusat kota', latitude: -6.235, longitude: 106.9945, timeZone: 'Asia/Jakarta' },
	{ id: 'bogor', name: 'Bogor', region: 'jawa-barat', kind: 'kota', point: 'pusat kota', latitude: -6.5964, longitude: 106.7973, timeZone: 'Asia/Jakarta' },
	{ id: 'cimahi', name: 'Cimahi', region: 'jawa-barat', kind: 'kota', point: 'pusat kota', latitude: -6.8732, longitude: 107.5423, timeZone: 'Asia/Jakarta' },
	{ id: 'cirebon', name: 'Cirebon', region: 'jawa-barat', kind: 'kota', point: 'pusat kota', latitude: -6.7137, longitude: 108.5608, timeZone: 'Asia/Jakarta' },
	{ id: 'depok', name: 'Depok', region: 'jawa-barat', kind: 'kota', point: 'pusat kota', latitude: -6.4072, longitude: 106.8158, timeZone: 'Asia/Jakarta' },
	{ id: 'sukabumi', name: 'Sukabumi', region: 'jawa-barat', kind: 'kota', point: 'pusat kota', latitude: -6.9199, longitude: 106.9265, timeZone: 'Asia/Jakarta' },
	{ id: 'tasikmalaya', name: 'Tasikmalaya', region: 'jawa-barat', kind: 'kota', point: 'pusat kota', latitude: -7.3262, longitude: 108.2201, timeZone: 'Asia/Jakarta' },

	{ id: 'semarang', name: 'Semarang', region: 'jawa-tengah', kind: 'kota', point: 'pusat kota', latitude: -6.9904, longitude: 110.4229, timeZone: 'Asia/Jakarta' },
	{ id: 'magelang', name: 'Magelang', region: 'jawa-tengah', kind: 'kota', point: 'pusat kota', latitude: -7.4771, longitude: 110.2182, timeZone: 'Asia/Jakarta' },
	{ id: 'pekalongan', name: 'Pekalongan', region: 'jawa-tengah', kind: 'kota', point: 'pusat kota', latitude: -6.8905, longitude: 109.6761, timeZone: 'Asia/Jakarta' },
	{ id: 'salatiga', name: 'Salatiga', region: 'jawa-tengah', kind: 'kota', point: 'pusat kota', latitude: -7.3199, longitude: 110.5034, timeZone: 'Asia/Jakarta' },
	{ id: 'surakarta', name: 'Surakarta', region: 'jawa-tengah', kind: 'kota', point: 'pusat kota', latitude: -7.5692, longitude: 110.8284, timeZone: 'Asia/Jakarta' },
	{ id: 'tegal', name: 'Tegal', region: 'jawa-tengah', kind: 'kota', point: 'pusat kota', latitude: -6.8674, longitude: 109.1378, timeZone: 'Asia/Jakarta' },

	{ id: 'yogyakarta', name: 'Yogyakarta', region: 'di-yogyakarta', kind: 'kota', point: 'pusat kota', latitude: -7.7829, longitude: 110.3671, timeZone: 'Asia/Jakarta' },

	{ id: 'surabaya', name: 'Surabaya', region: 'jawa-timur', kind: 'kota', point: 'pusat kota', latitude: -7.2575, longitude: 112.7521, timeZone: 'Asia/Jakarta' },
	{ id: 'batu', name: 'Batu', region: 'jawa-timur', kind: 'kota', point: 'pusat kota', latitude: -7.8712, longitude: 112.5269, timeZone: 'Asia/Jakarta' },
	{ id: 'blitar', name: 'Blitar', region: 'jawa-timur', kind: 'kota', point: 'pusat kota', latitude: -8.0982, longitude: 112.1651, timeZone: 'Asia/Jakarta' },
	{ id: 'kediri', name: 'Kediri', region: 'jawa-timur', kind: 'kota', point: 'pusat kota', latitude: -7.8111, longitude: 112.0046, timeZone: 'Asia/Jakarta' },
	{ id: 'madiun', name: 'Madiun', region: 'jawa-timur', kind: 'kota', point: 'pusat kota', latitude: -7.6291, longitude: 111.5169, timeZone: 'Asia/Jakarta' },
	{ id: 'malang', name: 'Malang', region: 'jawa-timur', kind: 'kota', point: 'pusat kota', latitude: -7.9771, longitude: 112.634, timeZone: 'Asia/Jakarta' },
	{ id: 'mojokerto', name: 'Mojokerto', region: 'jawa-timur', kind: 'kota', point: 'pusat kota', latitude: -7.4632, longitude: 112.432, timeZone: 'Asia/Jakarta' },
	{ id: 'pasuruan', name: 'Pasuruan', region: 'jawa-timur', kind: 'kota', point: 'pusat kota', latitude: -7.64, longitude: 112.9071, timeZone: 'Asia/Jakarta' },
	{ id: 'probolinggo', name: 'Probolinggo', region: 'jawa-timur', kind: 'kota', point: 'pusat kota', latitude: -7.7441, longitude: 113.2158, timeZone: 'Asia/Jakarta' },

	{ id: 'denpasar', name: 'Denpasar', region: 'bali', kind: 'kota', point: 'pusat kota', latitude: -8.6705, longitude: 115.2126, timeZone: 'Asia/Makassar' },

	{ id: 'mataram', name: 'Mataram', region: 'nusa-tenggara-barat', kind: 'kota', point: 'pusat kota', latitude: -8.5838, longitude: 116.1068, timeZone: 'Asia/Makassar' },
	{ id: 'bima', name: 'Bima', region: 'nusa-tenggara-barat', kind: 'kota', point: 'pusat kota', latitude: -8.4534, longitude: 118.7277, timeZone: 'Asia/Makassar' },

	{ id: 'kupang', name: 'Kupang', region: 'nusa-tenggara-timur', kind: 'kota', point: 'pusat kota', latitude: -10.1632, longitude: 123.6018, timeZone: 'Asia/Makassar' },

	{ id: 'pontianak', name: 'Pontianak', region: 'kalimantan-barat', kind: 'kota', point: 'pusat kota', latitude: -0.0227, longitude: 109.3447, timeZone: 'Asia/Pontianak' },
	{ id: 'singkawang', name: 'Singkawang', region: 'kalimantan-barat', kind: 'kota', point: 'pusat kota', latitude: 0.907, longitude: 108.989, timeZone: 'Asia/Pontianak' },

	{ id: 'palangka-raya', name: 'Palangka Raya', region: 'kalimantan-tengah', kind: 'kota', point: 'pusat kota', latitude: -2.2073, longitude: 113.9164, timeZone: 'Asia/Pontianak' },

	{ id: 'banjarbaru', name: 'Banjarbaru', region: 'kalimantan-selatan', kind: 'kota', point: 'pusat kota', latitude: -3.4431, longitude: 114.8308, timeZone: 'Asia/Makassar' },
	{ id: 'banjarmasin', name: 'Banjarmasin', region: 'kalimantan-selatan', kind: 'kota', point: 'pusat kota', latitude: -3.3187, longitude: 114.5926, timeZone: 'Asia/Makassar' },

	{ id: 'samarinda', name: 'Samarinda', region: 'kalimantan-timur', kind: 'kota', point: 'pusat kota', latitude: -0.5018, longitude: 117.1393, timeZone: 'Asia/Makassar' },
	{ id: 'balikpapan', name: 'Balikpapan', region: 'kalimantan-timur', kind: 'kota', point: 'pusat kota', latitude: -1.2399, longitude: 116.8593, timeZone: 'Asia/Makassar' },
	{ id: 'bontang', name: 'Bontang', region: 'kalimantan-timur', kind: 'kota', point: 'pusat kota', latitude: 0.1237, longitude: 117.4717, timeZone: 'Asia/Makassar' },

	{ id: 'bulungan', name: 'Bulungan', region: 'kalimantan-utara', kind: 'kabupaten', point: 'Tanjung Selor', latitude: 2.843, longitude: 117.3613, timeZone: 'Asia/Makassar' },
	{ id: 'tarakan', name: 'Tarakan', region: 'kalimantan-utara', kind: 'kota', point: 'pusat kota', latitude: 3.3, longitude: 117.633, timeZone: 'Asia/Makassar' },

	{ id: 'manado', name: 'Manado', region: 'sulawesi-utara', kind: 'kota', point: 'pusat kota', latitude: 1.49, longitude: 124.8408, timeZone: 'Asia/Makassar' },
	{ id: 'bitung', name: 'Bitung', region: 'sulawesi-utara', kind: 'kota', point: 'pusat kota', latitude: 1.4434, longitude: 125.1941, timeZone: 'Asia/Makassar' },
	{ id: 'kotamobagu', name: 'Kotamobagu', region: 'sulawesi-utara', kind: 'kota', point: 'pusat kota', latitude: 0.7407, longitude: 124.3125, timeZone: 'Asia/Makassar' },
	{ id: 'tomohon', name: 'Tomohon', region: 'sulawesi-utara', kind: 'kota', point: 'pusat kota', latitude: 1.3256, longitude: 124.8386, timeZone: 'Asia/Makassar' },

	{ id: 'kota-gorontalo', name: 'Kota Gorontalo', region: 'gorontalo', kind: 'kota', point: 'pusat kota', latitude: 0.5384, longitude: 123.0595, timeZone: 'Asia/Makassar' },

	{ id: 'palu', name: 'Palu', region: 'sulawesi-tengah', kind: 'kota', point: 'pusat kota', latitude: -0.8958, longitude: 119.868, timeZone: 'Asia/Makassar' },

	{ id: 'mamuju', name: 'Mamuju', region: 'sulawesi-barat', kind: 'kabupaten', point: 'Mamuju', latitude: -2.6747, longitude: 118.8863, timeZone: 'Asia/Makassar' },

	{ id: 'makassar', name: 'Makassar', region: 'sulawesi-selatan', kind: 'kota', point: 'pusat kota', latitude: -5.1343, longitude: 119.4124, timeZone: 'Asia/Makassar' },
	{ id: 'palopo', name: 'Palopo', region: 'sulawesi-selatan', kind: 'kota', point: 'pusat kota', latitude: -2.9996, longitude: 120.1921, timeZone: 'Asia/Makassar' },
	{ id: 'parepare', name: 'Parepare', region: 'sulawesi-selatan', kind: 'kota', point: 'pusat kota', latitude: -4.0057, longitude: 119.6236, timeZone: 'Asia/Makassar' },

	{ id: 'kendari', name: 'Kendari', region: 'sulawesi-tenggara', kind: 'kota', point: 'pusat kota', latitude: -3.9918, longitude: 122.518, timeZone: 'Asia/Makassar' },
	{ id: 'baubau', name: 'Baubau', region: 'sulawesi-tenggara', kind: 'kota', point: 'pusat kota', latitude: -5.462, longitude: 122.6058, timeZone: 'Asia/Makassar' },

	{ id: 'ambon', name: 'Ambon', region: 'maluku', kind: 'kota', point: 'pusat kota', latitude: -3.6959, longitude: 128.1788, timeZone: 'Asia/Jayapura' },
	{ id: 'tual', name: 'Tual', region: 'maluku', kind: 'kota', point: 'pusat kota', latitude: -5.639, longitude: 132.7429, timeZone: 'Asia/Jayapura' },

	{ id: 'ternate', name: 'Ternate', region: 'maluku-utara', kind: 'kota', point: 'pusat kota', latitude: 0.7852, longitude: 127.3832, timeZone: 'Asia/Jayapura' },
	{ id: 'tidore-kepulauan', name: 'Tidore Kepulauan', region: 'maluku-utara', kind: 'kota', point: 'Soasio', latitude: 0.6748, longitude: 127.4512, timeZone: 'Asia/Jayapura' },

	{ id: 'sorong', name: 'Sorong', region: 'papua-barat-daya', kind: 'kota', point: 'pusat kota', latitude: -0.8634, longitude: 131.2545, timeZone: 'Asia/Jayapura' },

	{ id: 'manokwari', name: 'Manokwari', region: 'papua-barat', kind: 'kabupaten', point: 'Manokwari', latitude: -0.8614, longitude: 134.0767, timeZone: 'Asia/Jayapura' },

	{ id: 'nabire', name: 'Nabire', region: 'papua-tengah', kind: 'kabupaten', point: 'Nabire', latitude: -3.3603, longitude: 135.5024, timeZone: 'Asia/Jayapura' },

	{ id: 'jayawijaya', name: 'Jayawijaya', region: 'papua-pegunungan', kind: 'kabupaten', point: 'Wamena', latitude: -4.0944, longitude: 138.9467, timeZone: 'Asia/Jayapura' },

	{ id: 'jayapura', name: 'Jayapura', region: 'papua', kind: 'kota', point: 'pusat kota', latitude: -2.5388, longitude: 140.7037, timeZone: 'Asia/Jayapura' },

	{ id: 'merauke', name: 'Merauke', region: 'papua-selatan', kind: 'kabupaten', point: 'Merauke', latitude: -8.4903, longitude: 140.3956, timeZone: 'Asia/Jayapura' }
];

/** e.g. "Kabupaten · titik di Muara Bulian" or "Kota · titik di pusat kota". */
export function cityNote(city: City): string {
	return `${city.kind === 'kota' ? 'Kota' : 'Kabupaten'} · titik di ${city.point}`;
}

export function citiesInRegion(region: RegionId): City[] {
	return CITIES.filter((city) => city.region === region);
}

/** Great-circle distance in km (haversine; good to well under 1% at these scales). */
function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
	const rad = Math.PI / 180;
	const dLat = (b.latitude - a.latitude) * rad;
	const dLon = (b.longitude - a.longitude) * rad;
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
	return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** The `count` locations closest to a point, nearest first. */
export function nearestCities(from: { latitude: number; longitude: number }, count: number): { city: City; km: number }[] {
	return CITIES.map((city) => ({ city, km: distanceKm(from, city) }))
		.toSorted((a, b) => a.km - b.km)
		.slice(0, count);
}
