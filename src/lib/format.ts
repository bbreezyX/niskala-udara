import { INTL_LOCALES, type Locale } from './i18n/config';
import type { ApiErrorCode, PollutantCode } from './types';

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

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Cached per locale and options, since formatters are built often in render. */
export function numberFormat(locale: Locale, maximumFractionDigits: number): Intl.NumberFormat {
	const key = `${locale}:${maximumFractionDigits}`;
	let format = numberFormats.get(key);
	if (!format) {
		format = new Intl.NumberFormat(INTL_LOCALES[locale], { maximumFractionDigits });
		numberFormats.set(key, format);
	}
	return format;
}

export function formatConcentration(value: number, locale: Locale): string {
	return numberFormat(locale, Math.abs(value) < 10 ? 2 : 1).format(value);
}

/** e.g. "18 Okt 2026, 16.00 WIB" / "18 Oct 2026, 16:00 WIB" in the location's own time zone. */
export function formatDataTime(iso: string, timeZone: string, locale: Locale): string {
	const date = new Date(iso);
	const text = new Intl.DateTimeFormat(INTL_LOCALES[locale], {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone
	}).format(date);
	return `${text} ${timeZoneLabel(timeZone, date)}`;
}

const JUST_NOW: Record<Locale, string> = { id: 'baru saja', en: 'just now' };

/** Time since an observation, e.g. "9 jam yang lalu" / "9 hours ago". */
export function formatAgo(iso: string, locale: Locale, now = Date.now()): string {
	const relativeTime = new Intl.RelativeTimeFormat(INTL_LOCALES[locale], { numeric: 'auto' });
	const minutes = Math.floor((now - Date.parse(iso)) / 60_000);
	if (minutes < 1) return JUST_NOW[locale];
	if (minutes < 60) return relativeTime.format(-minutes, 'minute');
	const hours = Math.floor(minutes / 60);
	return hours < 48 ? relativeTime.format(-hours, 'hour') : relativeTime.format(-Math.floor(hours / 24), 'day');
}

/** Hour label in the location's time zone, e.g. "16.00" / "16:00". */
export function formatHour(iso: string, timeZone: string, locale: Locale): string {
	return new Intl.DateTimeFormat(INTL_LOCALES[locale], { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(iso));
}

/** Hour of day without a date, e.g. "17.00" / "17:00"; 24 wraps to midnight. */
export function formatHourOfDay(hour: number, locale: Locale): string {
	return new Intl.DateTimeFormat(INTL_LOCALES[locale], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(
		Date.UTC(2000, 0, 1, hour % 24)
	);
}

/** Short day label in the location's time zone, e.g. "Sab, 18 Okt" / "Sat 18 Oct". */
export function formatDay(iso: string, timeZone: string, locale: Locale): string {
	return new Intl.DateTimeFormat(INTL_LOCALES[locale], { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(
		new Date(iso)
	);
}

/**
 * Time-zone abbreviation for a zone, e.g. "WIB". Always read in Indonesian: English Intl would print
 * "GMT+7", while WIB/WITA/WIT is what Indonesia's English-language press and readers use too.
 */
export function timeZoneLabel(timeZone: string, at = new Date()): string {
	return (
		new Intl.DateTimeFormat('id-ID', { timeZone, timeZoneName: 'short' })
			.formatToParts(at)
			.find((part) => part.type === 'timeZoneName')?.value ?? timeZone
	);
}

/** Request time on the user's device, e.g. "16.23 WIB" / "16:23 WIB". */
export function formatClock(date: Date, locale: Locale): string {
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const text = new Intl.DateTimeFormat(INTL_LOCALES[locale], { hour: '2-digit', minute: '2-digit' }).format(date);
	return `${text} ${timeZoneLabel(timeZone, date)}`;
}

export type ClientErrorCode = ApiErrorCode | 'network';
