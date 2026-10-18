import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/server/env';

// Replaces public/robots.txt so the sitemap line can carry the absolute origin.
export default function robots(): MetadataRoute.Robots {
	return { rules: { userAgent: '*', allow: '/' }, sitemap: new URL('/sitemap.xml', siteUrl()).href };
}
