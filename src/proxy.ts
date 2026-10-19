import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LIVE_LOCALES, splitLocale } from '@/lib/i18n/config';

/**
 * Pages live under app/[lang]. Indonesian keeps the bare URLs (rewritten to /id internally), English sits
 * under /en. No cookie and no Accept-Language redirect: the URL alone picks the language, so a shared link
 * opens as sent, crawlers see every version, and the privacy promise of "no cookies of our own" holds.
 */
export function proxy(request: NextRequest) {
	const { prefix, path } = splitLocale(request.nextUrl.pathname);
	const url = request.nextUrl.clone();

	if (!prefix) {
		url.pathname = `/${DEFAULT_LOCALE}${path === '/' ? '' : path}`;
		return NextResponse.rewrite(url);
	}
	// /id/... duplicates the bare URL; send it there for good. A locale not yet live redirects temporarily.
	if (prefix === DEFAULT_LOCALE || !LIVE_LOCALES.includes(prefix)) {
		url.pathname = path;
		return NextResponse.redirect(url, prefix === DEFAULT_LOCALE ? 308 : 307);
	}
	return NextResponse.next();
}

export const config = {
	// API routes, build assets, and files with an extension (robots.txt, sitemap.xml, images) skip locales.
	matcher: ['/((?!api|_next|.*\\..*).*)']
};
