import { Link } from '@/components/link';
import type { LegalSection } from '../legal-sections';

/** English translation of the Indonesian original, which prevails if the two differ. */
export const TERMS_EN: LegalSection[] = [
	{
		title: 'The service',
		body: (
			<>
				Niskala shows estimated current air quality, pollutant levels, and general health advice for the location you choose.
				The service is free, needs no account, and is provided as is.
			</>
		)
	},
	{
		title: 'Data sources',
		body: (
			<>
				Air quality data comes from the Google Maps Platform Air Quality API and is shown unaltered. Hotspots come from NASA
				FIRMS, and wind on the map from Open-Meteo (CC BY 4.0). It is an hourly estimate and may be
				delayed, incomplete, or differ from conditions on the ground.
			</>
		)
	},
	{
		title: 'Not medical advice',
		body: (
			<>
				Information on this site is general. For health decisions, follow health professionals and official information from
				your local government.
			</>
		)
	},
	{
		title: "Google's terms",
		body: (
			<>
				By using Niskala, you are also bound by the{' '}
				<a href="https://maps.google.com/help/terms_maps/" rel="noopener noreferrer">
					Google Maps/Google Earth Additional Terms of Service
				</a>{' '}
				and the{' '}
				<a href="https://policies.google.com/privacy" rel="noopener noreferrer">
					Google Privacy Policy
				</a>
				. This site&apos;s use of Google Maps Platform is governed by the{' '}
				<a href="https://cloud.google.com/maps-platform/terms" rel="noopener noreferrer">
					Google Maps Platform Terms of Service
				</a>
				.
			</>
		)
	},
	{
		title: 'Privacy',
		body: (
			<>
				How we handle location is explained in the <Link href="/privacy">Privacy Policy</Link>.
			</>
		)
	}
];
