import { Link } from '@/components/link';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';
import { AboutHeader, AboutSection } from './about-section';
import { BandsFigure } from './bands-figure';

export function AboutEn({ bandNames }: { bandNames: Dictionary['aqi']['bands'] }) {
	return (
		<>
			<AboutHeader title="About Niskala">
				Air is <em lang="id">niskala</em>: unseen. Niskala makes it readable, with current air quality, a 24-hour
				forecast, and hourly history for cities across Indonesia. No account, no ads.
			</AboutHeader>

			<AboutSection id="reading-aqi" title="How to read the AQI number">
				<p className="max-w-prose">
					The main number in this app is Google&apos;s <strong className="font-semibold text-foreground">Universal AQI</strong>.
					It is calculated from the levels of several pollutants on a 0–100 scale:{' '}
					<strong className="font-semibold text-foreground">the higher the number, the better the air</strong>. Category
					names and health advice come directly from Google.
				</p>

				<BandsFigure names={bandNames}>
					Universal AQI category bands. The colours follow the colour Google sends for each number.
				</BandsFigure>
			</AboutSection>

			<AboutSection id="bukan-ispu" title="Universal AQI is not ISPU">
				<p className="max-w-prose">
					ISPU, the Indonesian government&apos;s official index, gets worse as its number rises. The two indexes run in
					opposite directions on different scales, so don&apos;t compare their numbers directly. An AQI of 80 here means
					excellent air; an ISPU of 80 means moderate air.
				</p>
			</AboutSection>

			<AboutSection id="sumber-data" title="Data sources">
				<p className="max-w-prose">
					Current conditions, forecasts, history, and the air quality heatmap come from the Google Maps Platform Air
					Quality API. Hotspot data on the Map page comes from{' '}
					<a href="https://firms.modaps.eosdis.nasa.gov/" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
						NASA FIRMS
					</a>{' '}
					(VIIRS satellites): heat anomalies that are not necessarily fires.
				</p>
				<p className="max-w-prose">
					Each city uses a single reference point: the city centre for a city (<em lang="id">kota</em>), and the regency
					seat for a regency (<em lang="id">kabupaten</em>). Conditions elsewhere in the same area may differ.
				</p>
			</AboutSection>

			<AboutSection id="batasan" title="Limits">
				<p className="max-w-prose">
					The data are hourly model estimates, not readings from one instrument at that point, and may be delayed or
					incomplete. Use them as a general picture, not as medical advice. For health decisions, follow health
					professionals and official information from your local government.
				</p>
				<p className="max-w-prose">
					How we handle location is explained in the{' '}
					<Link href="/privacy" className="text-primary underline underline-offset-4">
						Privacy Policy
					</Link>
					, and the rules of use in the{' '}
					<Link href="/terms" className="text-primary underline underline-offset-4">
						Terms of Use
					</Link>
					.
				</p>
			</AboutSection>
		</>
	);
}
