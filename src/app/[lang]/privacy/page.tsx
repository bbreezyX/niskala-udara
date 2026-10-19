import type { Metadata } from 'next';
import { LegalArticle } from '@/components/legal-article';
import { LegalSections } from '@/content/legal-sections';
import { PRIVACY_EN } from '@/content/privacy/en';
import { PRIVACY_ID } from '@/content/privacy/id';
import { toLocale } from '@/lib/i18n/config';
import { getDictionary, localeAlternates } from '@/lib/i18n/server';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const locale = toLocale((await params).lang);
	const page = getDictionary(locale).pages.privacy;
	return {
		title: page.title,
		alternates: localeAlternates('/privacy', locale)
	};
}

const CONTENT = { id: PRIVACY_ID, en: PRIVACY_EN };

export default async function PrivacyPage({ params }: Props) {
	const locale = toLocale((await params).lang);
	return (
		<LegalArticle locale={locale} title={getDictionary(locale).pages.privacy.heading} updated="2026-10-19">
			<LegalSections sections={CONTENT[locale]} />
		</LegalArticle>
	);
}
