import type { Metadata } from 'next';
import { connection } from 'next/server';
import { DeviceDetail } from '@/components/location-sources';
import { airQualityKey } from '@/lib/server/env';

export const metadata: Metadata = { title: 'Lokasi saya', robots: { index: false } };

export default async function DevicePage() {
	await connection();
	return <DeviceDetail configured={Boolean(airQualityKey())} />;
}
