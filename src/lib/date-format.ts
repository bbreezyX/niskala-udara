import { INTL_LOCALES, type Locale } from './i18n/config';

const dateFormats = new Map<string, Intl.DateTimeFormat>();

/** Cached per locale and options, since building a formatter costs far more than using one. */
export function dateTimeFormat(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
	const key = `${locale}:${JSON.stringify(options)}`;
	let format = dateFormats.get(key);
	if (!format) {
		format = new Intl.DateTimeFormat(INTL_LOCALES[locale], options);
		dateFormats.set(key, format);
	}
	return format;
}
