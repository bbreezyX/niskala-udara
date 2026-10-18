import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { CityDetail } from '@/components/location-sources';
import { CITIES } from '@/lib/config/cities';
import { airQualityKey } from '@/lib/server/env';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { id } = await params;
	const city = CITIES.find((c) => c.id === id);
	return city
		? {
				title: city.name,
				description: `Kualitas udara terkini, tren 24 jam, prakiraan, dan kadar polutan di ${city.name}.`,
				alternates: { canonical: `/location/${city.id}` }
			}
		: {};
}

export default async function CityPage({ params }: Params) {
	const { id } = await params;
	if (!CITIES.some((c) => c.id === id)) notFound();
	await connection();
	return <CityDetail cityId={id} configured={Boolean(airQualityKey())} />;
}
