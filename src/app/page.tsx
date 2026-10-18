import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Dashboard } from '@/components/dashboard';
import { airQualityKey } from '@/lib/server/env';

// ?region= only filters the same page, so every variant points search engines at the root.
export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
	// Read the key at request time, not build time. Only a boolean leaves the server.
	await connection();
	return <Dashboard configured={Boolean(airQualityKey())} />;
}
