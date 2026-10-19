import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { toLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/server';

/*
 * The root layout sits under [lang], so Next has no app-wide not-found for unmatched URLs. Catching them
 * here renders [lang]/not-found.tsx inside the layout: header, footer, fonts, and the reader's language.
 */
type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	return { title: getDictionary(toLocale((await params).lang)).errorPage.notFound.title };
}

export default function MissingPage() {
	notFound();
}
