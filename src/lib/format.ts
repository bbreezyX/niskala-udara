import type { ApiErrorCode, PollutantCode } from './types.ts';

export const POLLUTANT_LABELS: Record<PollutantCode, string> = {
	pm25: 'PM2.5',
	pm10: 'PM10',
	o3: 'O₃',
	no2: 'NO₂',
	so2: 'SO₂',
	co: 'CO'
};

export function pollutantLabel(code: string): string {
	return POLLUTANT_LABELS[code as PollutantCode] ?? code.toUpperCase();
}

const UNIT_LABELS: Record<string, string> = {
	MICROGRAMS_PER_CUBIC_METER: 'µg/m³',
	PARTS_PER_BILLION: 'ppb'
};

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
