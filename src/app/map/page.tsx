import type { Metadata } from 'next';
import { connection } from 'next/server';
import { MapView } from '@/components/map-view';
import { PageIntro } from '@/components/page-intro';
import { firmsKey, mapsBrowserKey } from '@/lib/server/env';

export const metadata: Metadata = {
	title: 'Peta',
	alternates: { canonical: '/map' },
	description: 'Peta kualitas udara (Universal AQI) dan hotspot kebakaran 24 jam di sekitar Provinsi Jambi.'
};

export default async function MapPage() {
	await connection();
	return (
		<div className="mx-auto grid max-w-7xl gap-6 px-4 pt-8 sm:px-6 md:pt-10">
			<PageIntro title="Peta udara & hotspot" />
			{/* The browser key is public by design; the server-only keys stay as booleans. */}
			<MapView mapsKey={mapsBrowserKey() ?? null} firesConfigured={Boolean(firmsKey())} />
		</div>
	);
}
