import type { NextConfig } from 'next';
import { EDGE_CACHE_CONTROL } from './src/lib/config/cache';
import { DEFAULT_LOCALE, LOCALES } from './src/lib/i18n/config';

// Indonesian slugs from before the switch to English. Keep these for at least a year so old links still work.
const LEGACY_PATHS: [string, string][] = [
	['/peta', '/map'],
	['/riwayat', '/history'],
	['/tentang', '/about'],
	['/privasi', '/privacy'],
	['/ketentuan', '/terms'],
	['/lokasi/saya', '/location/me'],
	['/lokasi/titik', '/location/point'],
	['/lokasi/:id', '/location/:id']
];

const nextConfig: NextConfig = {
	poweredByHeader: false,
	async headers() {
		return [
			{
				// The dashboard is the same for every visitor, so Cloudflare may serve it for EDGE_MAX_AGE_S
				// instead of each view being rendered here. Client navigations (RSC payloads) are left out:
				// Cloudflare ignores `Vary`, and must never serve one in place of the HTML.
				source: '/',
				missing: [
					{ type: 'header', key: 'rsc' },
					{ type: 'query', key: '_rsc' }
				],
				headers: [{ key: 'Cache-Control', value: EDGE_CACHE_CONTROL }]
			}
		];
	},
	async redirects() {
		return LEGACY_PATHS.map(([source, destination]) => ({ source, destination, permanent: true }));
	},
	async rewrites() {
		// Indonesian keeps the bare URLs; pages live under app/[lang], so bare paths are served from /id.
		// Done here rather than in src/proxy.ts: a proxy rewrite is an absolute URL, and behind Caddy
		// (-H 127.0.0.1, X-Forwarded-Proto: https) Next saw https://localhost as a foreign origin and tried
		// to fetch it over TLS. Config rewrites stay internal. afterFiles runs after static routes and public
		// files but before dynamic ones, so /map reaches /id/map instead of matching [lang]=map.
		const prefixed = [...LOCALES, 'api', '_next'].join('|');
		return {
			beforeFiles: [],
			afterFiles: [
				{ source: '/', destination: `/${DEFAULT_LOCALE}` },
				{ source: `/:path((?!(?:${prefixed})(?:/|$)).+)`, destination: `/${DEFAULT_LOCALE}/:path` }
			],
			fallback: []
		};
	}
};

export default nextConfig;
