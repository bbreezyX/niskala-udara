import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Plus_Jakarta_Sans } from 'next/font/google';
import { AppHeader } from '@/components/app-header';
import { Providers } from '@/components/providers';
import { SiteFooter } from '@/components/site-footer';
import { siteUrl } from '@/lib/server/env';
import './globals.css';

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
		<html lang="id" className={`${plusJakarta.variable} ${instrumentSerif.variable}`}>
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
