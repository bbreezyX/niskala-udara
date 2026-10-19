import { Suspense } from 'react';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Dashboard } from '@/components/dashboard';
import { DashboardSkeleton } from '@/components/dashboard-skeleton';
import { regionFromParam } from '@/lib/config/cities';
import { airQualityKey } from '@/lib/server/env';
import { loadRegion } from '@/lib/server/region-air-quality';
import { toLocale } from '@/lib/i18n/config';
import { localeAlternates } from '@/lib/i18n/server';
import type { RegionStream } from '@/lib/types';

// ?region= only filters the same page, so every variant points search engines at the root.
type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ region?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	return { alternates: localeAlternates('/', toLocale((await params).lang)) };
}

export default async function HomePage({ params, searchParams }: Props) {
	// Read the key at request time, not build time. Only a boolean leaves the server.
	await connection();
	const apiKey = airQualityKey();
	const locale = toLocale((await params).lang);
	const param = (await searchParams).region;
	const region = regionFromParam(typeof param === 'string' ? param : null);
	// Not awaited: the page goes out at once and each city's data streams in as it settles,
	// already part of the HTML when the server cache is warm.
	const initial: RegionStream | null = apiKey ? { region, cities: loadRegion(region, apiKey, fetch, locale) } : null;
	// Dashboard reads ?region= through useSearchParams. Rendered per request it never suspends, so the
	// skeleton is only a safety net should this page ever be prerendered.
	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<Dashboard configured={Boolean(apiKey)} initial={initial} />
		</Suspense>
	);
}
