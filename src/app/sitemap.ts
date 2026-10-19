import type { MetadataRoute } from 'next';
import { CITIES } from '@/lib/config/cities';
import { DEFAULT_LOCALE, LIVE_LOCALES, localizePath } from '@/lib/i18n/config';
import { siteUrl } from '@/lib/server/env';

// /location/me and /location/point are per-visitor pages and stay out (they are noindex).
const PAGES = ['/', '/map', '/history', '/about', '/privacy', '/terms'];

/** One entry per page per live locale, each listing its translations so search engines pair them. */
export default function sitemap(): MetadataRoute.Sitemap {
	const origin = siteUrl();
	const url = (path: string) => new URL(path, origin).href;
	const paths = [...PAGES, ...CITIES.map((c) => `/location/${c.id}`)];
	return paths.flatMap((path) => {
		const languages =
			LIVE_LOCALES.length > 1
				? Object.fromEntries([...LIVE_LOCALES.map((l) => [l, url(localizePath(path, l))]), ['x-default', url(localizePath(path, DEFAULT_LOCALE))]])
				: undefined;
		return LIVE_LOCALES.map((locale) => ({ url: url(localizePath(path, locale)), ...(languages && { alternates: { languages } }) }));
	});
}
