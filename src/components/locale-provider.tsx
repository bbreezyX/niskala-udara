'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { localizePath, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';

const LocaleContext = createContext<{ locale: Locale; dictionary: Dictionary } | null>(null);

export function LocaleProvider({
	locale,
	dictionary,
	children
}: {
	locale: Locale;
	dictionary: Dictionary;
	children: React.ReactNode;
}) {
	// Stable while the locale is, so a parent re-render does not re-render every consumer.
	const value = useMemo(() => ({ locale, dictionary }), [locale, dictionary]);
	return <LocaleContext value={value}>{children}</LocaleContext>;
}

function useLocaleContext() {
	const value = useContext(LocaleContext);
	if (!value) throw new Error('LocaleProvider is missing');
	return value;
}

export function useLocale(): Locale {
	return useLocaleContext().locale;
}

export function useDictionary(): Dictionary {
	return useLocaleContext().dictionary;
}

/** Prefixes internal paths for the active locale, for router.push and other non-Link navigation. */
export function useLocalePath(): (path: string) => string {
	const locale = useLocale();
	return useCallback((path: string) => localizePath(path, locale), [locale]);
}
