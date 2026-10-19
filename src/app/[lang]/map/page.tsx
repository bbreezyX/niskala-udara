import type { Metadata } from 'next';
import { connection } from 'next/server';
import { MapView } from '@/components/map-view';
import { PageIntro } from '@/components/page-intro';
import { firmsKey, mapsBrowserKey } from '@/lib/server/env';
import { toLocale } from '@/lib/i18n/config';
import { getDictionary, localeAlternates } from '@/lib/i18n/server';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const locale = toLocale((await params).lang);
	const page = getDictionary(locale).pages.map;
	return {
		title: page.title,
		description: page.description,
		alternates: localeAlternates('/map', locale)
	};
}

export default async function MapPage({ params }: Props) {
	const { pages } = getDictionary(toLocale((await params).lang));
	await connection();
	return (
		<div className="page-frame grid gap-6 pt-8 md:pt-10">
			<PageIntro title={pages.map.heading} />
			{/* The browser key is public by design; the server-only keys stay as booleans. */}
			<MapView mapsKey={mapsBrowserKey() ?? null} firesConfigured={Boolean(firmsKey())} />
		</div>
	);
}
