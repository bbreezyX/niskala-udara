export const LOCALES = ['id', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Indonesian stays on the bare paths every existing link and canonical already uses; others get a prefix. */
export const DEFAULT_LOCALE: Locale = 'id';

/**
 * Locales readers can reach. A locale left out here is a draft: the proxy sends its URLs back to the
 * Indonesian page, the switch hides, and hreflang and the sitemap skip it, so nothing half-done ships.
 */
export const LIVE_LOCALES: readonly Locale[] = LOCALES;

/**
 * BCP 47 tags for Intl. British English gives the 24-hour clock and day-month order Indonesian readers
 * already see in the Indonesian version, where US English would switch to AM/PM and month-first dates.
 */
export const INTL_LOCALES: Record<Locale, string> = { id: 'id-ID', en: 'en-GB' };

export function isLocale(value: string): value is Locale {
	return (LOCALES as readonly string[]).includes(value);
}

/** For route params: the layout already rejects unknown values, so this only narrows the type. */
export function toLocale(value: string): Locale {
	return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Splits a URL pathname into its explicit locale prefix (null when bare) and the path without it. */
export function splitLocale(pathname: string): { prefix: Locale | null; path: string } {
	const segment = pathname.split('/')[1] ?? '';
	if (!isLocale(segment)) return { prefix: null, path: pathname };
	return { prefix: segment, path: pathname.slice(segment.length + 1) || '/' };
}

/** Prefixes an internal path ("/map", "/?region=x", "/location/point#1,2") for a locale. Other hrefs pass through. */
export function localizePath(path: string, locale: Locale): string {
	if (!path.startsWith('/') || path.startsWith('//')) return path;
	const bare = splitLocale(path).path;
	if (locale === DEFAULT_LOCALE) return bare;
	// "/" and "/?x" sit on the prefix itself, so the result is "/en" rather than "/en/".
	return bare === '/' || bare.startsWith('/?') || bare.startsWith('/#') ? `/${locale}${bare.slice(1)}` : `/${locale}${bare}`;
}

/** A count-dependent string. Indonesian uses the same text for both; English picks by Intl plural rules. */
export interface Plural {
	one: string;
	other: string;
}

/** Picks the plural form for `n` and fills {n} plus any other placeholders. */
export function plural(entry: Plural, n: number, locale: Locale, values: Record<string, string> = {}): string {
	const form = new Intl.PluralRules(INTL_LOCALES[locale]).select(n) === 'one' ? 'one' : 'other';
	return fill(entry[form], { n: String(n), ...values });
}

/** Fills {name}-style placeholders. Dictionaries hold plain strings so they can cross into client components. */
export function fill(template: string, values: Record<string, string>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
