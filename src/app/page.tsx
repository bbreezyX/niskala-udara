import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Dashboard } from '@/components/dashboard';
import { regionFromParam } from '@/lib/config/cities';
import { airQualityKey } from '@/lib/server/env';
import { loadRegion } from '@/lib/server/region-air-quality';
import type { RegionStream } from '@/lib/types';

// ?region= only filters the same page, so every variant points search engines at the root.
export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ region?: string | string[] }> }) {
	// Read the key at request time, not build time. Only a boolean leaves the server.
	await connection();
	const apiKey = airQualityKey();
	const param = (await searchParams).region;
	const region = regionFromParam(typeof param === 'string' ? param : null);
	// Not awaited: the page goes out at once and each city's data streams in as it settles,
	// already part of the HTML when the server cache is warm.
	const initial: RegionStream | null = apiKey ? { region, cities: loadRegion(region, apiKey) } : null;
	return <Dashboard configured={Boolean(apiKey)} initial={initial} />;
}
