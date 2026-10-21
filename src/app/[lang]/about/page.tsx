import type { Metadata } from 'next';
import { AboutEn } from '@/content/about/en';
import { AboutId } from '@/content/about/id';
import { toLocale } from '@/lib/i18n/config';
import { getDictionary, localeAlternates } from '@/lib/i18n/server';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const locale = toLocale((await params).lang);
	const page = getDictionary(locale).pages.about;
	return {
		title: page.title,
		description: page.description,
		alternates: localeAlternates('/about', locale)
	};
}

const CONTENT = { id: AboutId, en: AboutEn };

export default async function AboutPage({ params }: Props) {
	const locale = toLocale((await params).lang);
	const Content = CONTENT[locale];
	return (
		<article className="body-copy mx-auto grid max-w-3xl gap-12 px-4 pt-10 text-foreground/85 sm:px-6 md:pt-14 [&_p]:max-w-prose">
			<Content bandNames={getDictionary(locale).aqi.bands} />
		</article>
	);
}
