import type { MetadataRoute } from 'next';
import { CITIES } from '@/lib/config/cities';
import { siteUrl } from '@/lib/server/env';

// /location/me and /location/point are per-visitor pages and stay out (they are noindex).
const PAGES = ['/', '/map', '/history', '/about', '/privacy', '/terms'];

export default function sitemap(): MetadataRoute.Sitemap {
	const origin = siteUrl();
	return [...PAGES, ...CITIES.map((c) => `/location/${c.id}`)].map((path) => ({ url: new URL(path, origin).href }));
}
