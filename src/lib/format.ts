import type { ApiErrorCode, PollutantCode } from './types';

export const POLLUTANT_LABELS: Record<PollutantCode, string> = {
	pm25: 'PM2.5',
	pm10: 'PM10',
	o3: 'O₃',
	no2: 'NO₂',
	so2: 'SO₂',
	co: 'CO'
};

/** Plain-language explanations for readers who do not know the pollutant codes. */
export const POLLUTANT_INFO: Record<PollutantCode, { name: string; about: string; sources: string }> = {
	pm25: {
		name: 'Partikel halus',
		about: 'Debu sangat halus, lebih kecil dari 2,5 mikrometer, sekitar 1/30 tebal rambut. Bisa masuk dalam ke paru-paru hingga aliran darah.',
		sources: 'Asap kebakaran hutan dan lahan, kendaraan, pembakaran sampah.'
	},
	pm10: {
		name: 'Partikel kasar',
		about: 'Debu berukuran sampai 10 mikrometer. Tertahan di hidung dan saluran napas atas, bisa memicu batuk dan iritasi.',
		sources: 'Debu jalan, konstruksi, asap pembakaran.'
	},
	no2: {
		name: 'Nitrogen dioksida',
		about: 'Gas dari pembakaran bahan bakar. Mengiritasi saluran napas, terutama bagi penderita asma.',
		sources: 'Kendaraan bermotor, pembangkit listrik, industri.'
	},
	o3: {
		name: 'Ozon permukaan',
		about: 'Gas yang terbentuk saat polutan lain bereaksi di bawah sinar matahari, biasanya naik di siang hari. Bisa membuat dada terasa sesak.',
		sources: 'Asap kendaraan dan industri yang bereaksi dengan sinar matahari.'
	},
	so2: {
		name: 'Sulfur dioksida',
		about: 'Gas berbau tajam dari pembakaran bahan bakar yang mengandung belerang. Mengiritasi mata dan saluran napas.',
		sources: 'Pembangkit listrik batu bara, industri, gunung api.'
	},
	co: {
		name: 'Karbon monoksida',
		about: 'Gas tak berwarna dan tak berbau dari pembakaran yang tidak sempurna. Mengurangi kemampuan darah membawa oksigen.',
		sources: 'Kendaraan, kebakaran, genset dan kompor.'
	}
};

export function pollutantLabel(code: string): string {
	return POLLUTANT_LABELS[code as PollutantCode] ?? code.toUpperCase();
}

const UNIT_LABELS: Record<string, string> = {
	MICROGRAMS_PER_CUBIC_METER: 'µg/m³',
	PARTS_PER_BILLION: 'ppb'
};

const UNIT_NAMES: Record<string, string> = {
	MICROGRAMS_PER_CUBIC_METER: 'mikrogram per meter kubik udara',
	PARTS_PER_BILLION: 'bagian per miliar bagian udara'
};

export function unitName(units: string): string {
	return UNIT_NAMES[units] ?? '';
}

/** Unknown or unspecified units render as nothing rather than a guess. */
export function unitLabel(units: string): string {
	return UNIT_LABELS[units] ?? '';
}

const smallNumber = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const largeNumber = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

export function formatConcentration(value: number): string {
	return (Math.abs(value) < 10 ? smallNumber : largeNumber).format(value);
}

/** e.g. "18 Okt 2026, 16.00 WIB" in the location's own time zone. */
export function formatDataTime(iso: string, timeZone: string): string {
	return new Intl.DateTimeFormat('id-ID', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone,
		timeZoneName: 'short'
	}).format(new Date(iso));
}

/** Hour label in the location's time zone, e.g. "16.00". */
export function formatHour(iso: string, timeZone: string): string {
	return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(iso));
}

/** Short day label in the location's time zone, e.g. "Sab, 18 Okt". */
export function formatDay(iso: string, timeZone: string): string {
	return new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(
		new Date(iso)
	);
}

/** Time-zone abbreviation for a zone, e.g. "WIB". */
export function timeZoneLabel(timeZone: string, at = new Date()): string {
	return (
		new Intl.DateTimeFormat('id-ID', { timeZone, timeZoneName: 'short' })
			.formatToParts(at)
			.find((part) => part.type === 'timeZoneName')?.value ?? timeZone
	);
}

/** Request time on the user's device, e.g. "16.23 WIB". */
export function formatClock(date: Date): string {
	return new Intl.DateTimeFormat('id-ID', {
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short'
	}).format(date);
}

export type ClientErrorCode = ApiErrorCode | 'network';

export const ERROR_MESSAGES: Record<ClientErrorCode, { title: string; description: string }> = {
	not_configured: {
		title: 'Sumber data belum dikonfigurasi',
		description: 'Server belum memiliki kunci akses ke data kualitas udara, jadi belum ada angka yang bisa ditampilkan.'
	},
	not_authorized: {
		title: 'Akses ke sumber data ditolak',
		description: 'Server tidak diizinkan mengambil data kualitas udara saat ini.'
	},
	quota_exceeded: {
		title: 'Batas permintaan tercapai',
		description: 'Terlalu banyak permintaan dalam waktu singkat. Coba lagi beberapa saat lagi.'
	},
	location_unsupported: {
		title: 'Lokasi belum didukung',
		description: 'Data kualitas udara tidak tersedia untuk lokasi ini. Coba pilih kota lain.'
	},
	no_data: {
		title: 'Data belum tersedia',
		description: 'Sumber data tidak mengirim nilai kualitas udara untuk lokasi ini.'
	},
	timeout: {
		title: 'Waktu permintaan habis',
		description: 'Sumber data terlalu lama merespons.'
	},
	upstream_error: {
		title: 'Data gagal dimuat',
		description: 'Terjadi gangguan saat mengambil data kualitas udara.'
	},
	invalid_request: {
		title: 'Permintaan tidak valid',
		description: 'Lokasi yang dikirim tidak dapat diproses.'
	},
	network: {
		title: 'Tidak dapat terhubung',
		description: 'Periksa koneksi internetmu, lalu coba lagi.'
	}
};
