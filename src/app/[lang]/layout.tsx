import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Instrument_Serif, Plus_Jakarta_Sans } from 'next/font/google';
import { AppHeader } from '@/components/app-header';
import { Providers } from '@/components/providers';
import { SiteFooter } from '@/components/site-footer';
import { isLocale, LOCALES, toLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/server';
import { siteUrl } from '@/lib/server/env';
import '../globals.css';

// Type system modeled on america.gov: a high-contrast serif for display titles over a sans for UI
// and body. Its faces (Rhymes, Helvetica Now) are commercial, so these are OFL stand-ins. Plus Jakarta
// Sans (Tokotype, Bandung) was drawn for Jakarta's city identity and has tabular figures for AQI data.
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta', display: 'swap' });
const instrumentSerif = Instrument_Serif({
	subsets: ['latin'],
	weight: '400',
	variable: '--font-instrument-serif',
	display: 'swap'
});

type Props = { children: React.ReactNode; params: Promise<{ lang: string }> };

// Every locale is known at build time, so anything else under the first segment is a 404.
export function generateStaticParams() {
	return LOCALES.map((lang) => ({ lang }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
	const { meta } = getDictionary(toLocale((await params).lang));
	return {
		metadataBase: new URL(siteUrl()),
		title: { default: meta.title, template: '%s · Niskala' },
		description: meta.description,
		icons: { icon: '/images/brand/niskala-udara-atmosfer.png' }
	};
}

export const viewport: Viewport = { themeColor: '#F8FAFD' };

export default async function RootLayout({ children, params }: Props) {
	const { lang } = await params;
	if (!isLocale(lang)) notFound();
	const dictionary = getDictionary(lang);

	return (
		<html lang={lang} className={`${plusJakarta.variable} ${instrumentSerif.variable}`}>
			<body className="flex min-h-dvh flex-col">
				<a
					href="#konten"
					className="sr-only z-50 rounded-lg bg-card px-4 py-2 shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
				>
					{dictionary.skipToContent}
				</a>
				<Providers locale={lang} dictionary={dictionary}>
					<AppHeader />
					<main id="konten" tabIndex={-1} className="flex-1 outline-none">
						{children}
					</main>
					<SiteFooter dictionary={dictionary} />
				</Providers>
			</body>
		</html>
	);
}
