import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { CityDetail } from '@/components/location-sources';
import { CITIES } from '@/lib/config/cities';
import { airQualityKey } from '@/lib/server/env';
import { fill, toLocale } from '@/lib/i18n/config';
import { getDictionary, localeAlternates } from '@/lib/i18n/server';

type Params = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { lang, id } = await params;
	const locale = toLocale(lang);
	const city = CITIES.find((c) => c.id === id);
	return city
		? {
				title: city.name,
				description: fill(getDictionary(locale).pages.city.description, { name: city.name }),
				alternates: localeAlternates(`/location/${city.id}`, locale)
			}
		: {};
}

export default async function CityPage({ params }: Params) {
	const { id } = await params;
	if (!CITIES.some((c) => c.id === id)) notFound();
	await connection();
	return <CityDetail cityId={id} configured={Boolean(airQualityKey())} />;
}
