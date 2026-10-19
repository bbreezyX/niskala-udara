import type { Metadata } from 'next';
import { connection } from 'next/server';
import { DeviceDetail } from '@/components/location-sources';
import { airQualityKey } from '@/lib/server/env';
import { toLocale } from '@/lib/i18n/config';
import { getDictionary, localeAlternates } from '@/lib/i18n/server';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const locale = toLocale((await params).lang);
	const page = getDictionary(locale).pages.locationMe;
	return {
		title: page.title,
		robots: { index: false }
	};
}

export default async function DevicePage() {
	await connection();
	return <DeviceDetail configured={Boolean(airQualityKey())} />;
}
