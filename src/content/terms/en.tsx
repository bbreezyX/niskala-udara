import { Link } from '@/components/link';
import type { LegalSection } from '../legal-sections';

/** English translation of the Indonesian original, which prevails if the two differ. */
export const TERMS_EN: LegalSection[] = [
	{
		title: 'The Service',
		body: (
			<>
				Niskala displays estimated current air quality, pollutant levels, and general health advice for the selected location.
				The service is free, requires no account, and is provided as is.
			</>
		)
	},
	{
		title: 'Data Sources',
		body: (
			<>
				Air quality data comes from the Google Maps Platform Air Quality API and is shown unaltered. Hotspots come from NASA
				FIRMS, and wind on the map from Open-Meteo (CC BY 4.0). It is an hourly estimate and may be
				delayed, incomplete, or differ from conditions on the ground.
			</>
		)
	},
	{
		title: 'Not Medical Advice',
		body: (
			<>
				Information on this site is general. For health decisions, follow health professionals and official information from
				the relevant local government.
			</>
		)
	},
	{
		title: "Google's Terms",
		body: (
			<>
				Users of Niskala are also bound by the{' '}
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
				Location processing is explained in the <Link href="/privacy">Privacy Policy</Link>.
			</>
		)
	}
];
