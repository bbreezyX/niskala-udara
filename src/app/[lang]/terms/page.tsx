import type { Metadata } from 'next';
import { LegalArticle } from '@/components/legal-article';
import { TermsEn } from '@/content/terms/en';
import { TermsId } from '@/content/terms/id';
import { toLocale } from '@/lib/i18n/config';
import { getDictionary, localeAlternates } from '@/lib/i18n/server';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const locale = toLocale((await params).lang);
	const page = getDictionary(locale).pages.terms;
	return {
		title: page.title,
		alternates: localeAlternates('/terms', locale)
	};
}

const CONTENT = { id: TermsId, en: TermsEn };

export default async function TermsPage({ params }: Props) {
	const locale = toLocale((await params).lang);
	const Content = CONTENT[locale];
	return (
		<LegalArticle locale={locale} title={getDictionary(locale).pages.terms.heading} updated="2026-10-19">
			<Content />
		</LegalArticle>
	);
}
