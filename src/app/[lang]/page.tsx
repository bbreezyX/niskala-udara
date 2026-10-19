import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Dashboard } from '@/components/dashboard';
import { airQualityKey } from '@/lib/server/env';
import { toLocale } from '@/lib/i18n/config';
import { localeAlternates } from '@/lib/i18n/server';

// ?region= only filters the same page, so every variant points search engines at the root.
type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	return { alternates: localeAlternates('/', toLocale((await params).lang)) };
}

export default async function HomePage() {
	// Read the key at request time, not build time. Only a boolean leaves the server.
	await connection();
	return <Dashboard configured={Boolean(airQualityKey())} />;
}
