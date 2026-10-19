import 'server-only';
import type { Metadata } from 'next';
import { DEFAULT_LOCALE, LIVE_LOCALES, localizePath, type Locale } from './config';
import { en } from './dictionaries/en';
import { id, type Dictionary } from './dictionaries/id';

// Server-only, so the client bundle never carries both languages; layouts hand the active one down.
const DICTIONARIES: Record<Locale, Dictionary> = { id, en };

export function getDictionary(locale: Locale): Dictionary {
	return DICTIONARIES[locale];
}

/** Canonical for this locale plus hreflang links to every live translation of the same page. */
export function localeAlternates(path: string, locale: Locale): Metadata['alternates'] {
	const canonical = localizePath(path, locale);
	if (LIVE_LOCALES.length < 2) return { canonical };
	const languages = Object.fromEntries(LIVE_LOCALES.map((l) => [l, localizePath(path, l)]));
	return { canonical, languages: { ...languages, 'x-default': localizePath(path, DEFAULT_LOCALE) } };
}
