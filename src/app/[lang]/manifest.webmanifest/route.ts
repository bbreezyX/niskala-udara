import type { MetadataRoute } from 'next';
import { INTL_LOCALES, isLocale, localizePath } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/server';

export const dynamic = 'force-static';

/** Each language has its own launch URL, while one manifest id keeps this a single installed app. */
export async function GET(_request: Request, { params }: { params: Promise<{ lang: string }> }) {
	const { lang } = await params;
	if (!isLocale(lang)) return new Response(null, { status: 404 });

	const manifest: MetadataRoute.Manifest = {
		id: '/',
		name: 'Niskala',
		short_name: 'Niskala',
		description: getDictionary(lang).meta.description,
		lang: INTL_LOCALES[lang],
		start_url: localizePath('/', lang),
		scope: '/',
		display: 'standalone',
		background_color: '#f8fafd',
		theme_color: '#f8fafd',
		categories: ['weather', 'utilities'],
		prefer_related_applications: false,
		icons: [
			{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
		]
	};

	return Response.json(manifest, {
		headers: {
			'Content-Type': 'application/manifest+json',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
