import type { Metadata } from 'next';
import { connection } from 'next/server';
import { PointDetail } from '@/components/location-sources';
import { airQualityKey } from '@/lib/server/env';

export const metadata: Metadata = { title: 'Titik di peta', robots: { index: false } };

export default async function PointPage() {
	await connection();
	return <PointDetail configured={Boolean(airQualityKey())} />;
}
