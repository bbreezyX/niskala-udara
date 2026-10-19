import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import { AppHeader } from '@/components/app-header';
import { Providers } from '@/components/providers';
import { SiteFooter } from '@/components/site-footer';
import { siteUrl } from '@/lib/server/env';
import './globals.css';

// Gambetta gives display titles their editorial character; Plus Jakarta Sans keeps UI and AQI data
// readable, with tabular figures. Gambetta is self-hosted under the ITF Free Font License.
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta', display: 'swap' });
const gambetta = localFont({
	src: [
		{ path: './fonts/gambetta/Gambetta-Regular.woff2', weight: '400', style: 'normal' },
		{ path: './fonts/gambetta/Gambetta-Italic.woff2', weight: '400', style: 'italic' }
	],
	variable: '--font-gambetta',
	adjustFontFallback: 'Times New Roman',
	display: 'swap'
});

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl()),
	title: { default: 'Niskala · Kualitas udara di sekitarmu', template: '%s · Niskala' },
	description:
		'Pantau kualitas udara terkini, kadar polutan, prakiraan, dan rekomendasi kesehatan di kota-kota Indonesia.',
	icons: { icon: '/images/brand/niskala-udara-atmosfer.png' }
};

export const viewport: Viewport = { themeColor: '#F8FAFD' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="id" className={`${plusJakarta.variable} ${gambetta.variable}`}>
			<body className="flex min-h-dvh flex-col">
				<a
					href="#konten"
					className="sr-only z-50 rounded-lg bg-card px-4 py-2 shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
				>
					Lewati ke konten
				</a>
				<Providers>
					<AppHeader />
					<main id="konten" tabIndex={-1} className="flex-1 outline-none">
						{children}
					</main>
					<SiteFooter />
				</Providers>
			</body>
		</html>
	);
}
