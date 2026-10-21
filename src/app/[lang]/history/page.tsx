import type { Metadata } from 'next';
import { connection } from 'next/server';
import { HistoryView } from '@/components/history-view';
import { airQualityKey } from '@/lib/server/env';
import { toLocale } from '@/lib/i18n/config';
import { getDictionary, localeAlternates } from '@/lib/i18n/server';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const locale = toLocale((await params).lang);
	const page = getDictionary(locale).pages.history;
	return {
		title: page.title,
		description: page.description,
		alternates: localeAlternates('/history', locale)
	};
}

export default async function HistoryPage({ params }: Props) {
	const { pages } = getDictionary(toLocale((await params).lang));
	await connection();
	return (
		<div className="page-frame grid gap-6 pt-8 md:pt-10">
			<HistoryView configured={Boolean(airQualityKey())} title={pages.history.heading} />
		</div>
	);
}
