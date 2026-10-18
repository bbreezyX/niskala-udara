import type { NextConfig } from 'next';

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
	async redirects() {
		return LEGACY_PATHS.map(([source, destination]) => ({ source, destination, permanent: true }));
	}
};

export default nextConfig;
