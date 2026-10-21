import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Plus_Jakarta_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import { AppHeader } from '@/components/app-header';
import { InstallApp } from '@/components/install-app';
import { Providers } from '@/components/providers';
import { SiteFooter } from '@/components/site-footer';
import { isLocale, LOCALES, localizePath, toLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/server';
import { siteUrl } from '@/lib/server/env';
import '../globals.css';

// Gambetta gives display titles their editorial character; Plus Jakarta Sans keeps UI and AQI data
// readable, with tabular figures. Gambetta is self-hosted under the ITF Free Font License.
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta', display: 'swap' });
const gambetta = localFont({
	src: [
		{ path: '../fonts/gambetta/Gambetta-Regular.woff2', weight: '400', style: 'normal' },
		{ path: '../fonts/gambetta/Gambetta-Italic.woff2', weight: '400', style: 'italic' }
	],
	variable: '--font-gambetta',
	adjustFontFallback: 'Times New Roman',
	display: 'swap'
});

type Props = { children: React.ReactNode; params: Promise<{ lang: string }> };

// Every locale is known at build time, so anything else under the first segment is a 404.
export function generateStaticParams() {
	return LOCALES.map((lang) => ({ lang }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
	const locale = toLocale((await params).lang);
	const { meta } = getDictionary(locale);
	return {
		metadataBase: new URL(siteUrl()),
		applicationName: 'Niskala',
		manifest: localizePath('/manifest.webmanifest', locale),
		title: { default: meta.title, template: '%s · Niskala' },
		description: meta.description,
		appleWebApp: { capable: true, title: 'Niskala', statusBarStyle: 'default' },
		icons: {
			icon: '/images/brand/niskala-udara-atmosfer.png',
			apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
		}
	};
}

export const viewport: Viewport = { themeColor: '#F8FAFD', viewportFit: 'cover' };

export default async function RootLayout({ children, params }: Props) {
	const { lang } = await params;
	if (!isLocale(lang)) notFound();
	const dictionary = getDictionary(lang);

	return (
		<html lang={lang} className={`${plusJakarta.variable} ${gambetta.variable}`}>
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
					<InstallApp />
				</Providers>
			</body>
		</html>
	);
}
