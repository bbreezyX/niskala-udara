import type { NextConfig } from 'next';
import { EDGE_CACHE_CONTROL } from './src/lib/config/cache';

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
	}
};

export default nextConfig;
