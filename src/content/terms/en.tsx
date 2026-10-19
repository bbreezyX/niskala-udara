import { Link } from '@/components/link';

/** English translation of the Indonesian original, which prevails if the two differ. */
export function TermsEn() {
	return (
		<>
			<h2>The service</h2>
			<p>
				Niskala shows estimated current air quality, pollutant levels, and general health advice for the location you choose.
				The service is free, needs no account, and is provided as is.
			</p>

			<h2>Data sources</h2>
			<p>
				Data comes from the Google Maps Platform Air Quality API and is shown unaltered. It is an hourly estimate and may be
				delayed, incomplete, or differ from conditions on the ground.
			</p>

			<h2>Not medical advice</h2>
			<p>
				Information on this site is general. For health decisions, follow health professionals and official information from
				your local government.
			</p>

			<h2>Google&apos;s terms</h2>
			<p>
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
			</p>

			<h2>Privacy</h2>
			<p>
				How we handle location is explained in the <Link href="/privacy">Privacy Policy</Link>.
			</p>
		</>
	);
}
