import type { LegalSection } from '../legal-sections';

/** English translation of the Indonesian original, which prevails if the two differ. */
export const PRIVACY_EN: LegalSection[] = [
	{
		title: 'Data processing',
		body: (
			<>
				Niskala only processes location coordinates to fetch air quality data. For a selected city, the coordinates sent
				are those of its reference point. After &quot;Use device location&quot; is selected, the browser requests location
				permission. Device coordinates are then rounded to about 100 metres before they are sent.
			</>
		)
	},
	{
		title: 'Where the data goes',
		body: (
			<>
				Coordinates are sent to the Niskala server and passed on to the Google Maps Platform Air Quality API to fetch current
				air conditions. Google&apos;s processing is subject to the{' '}
				<a href="https://policies.google.com/privacy" rel="noopener noreferrer">
					Google Privacy Policy
				</a>
				.
			</>
		)
	},
	{
		title: 'The Map page',
		body: (
			<>
				The map loads directly from Google Maps in the browser, so Google receives technical data such as the IP address and
				may use cookies under its own policy. A selected point on the map is rounded to about 100 metres, then sent through
				the Niskala server to Google to fetch air quality data. The server fetches hotspot data from NASA FIRMS and wind data
				from Open-Meteo without sending user data to either provider.
			</>
		)
	},
	{
		title: 'Storage on the device',
		body: (
			<>
				The browser stores the last selected region, or the nearest region after &quot;Use device location&quot; is selected,
				so Overview opens on that region. The browser&apos;s local storage (localStorage) contains only the region name,
				for example Riau, without coordinates. This data is not sent to the server and is not a cookie. To remove it,
				clear the site data in the browser settings.
			</>
		)
	},
	{
		title: 'Data collection limits',
		body: (
			<>
				Niskala does not store coordinates or searches, set its own cookies, require an account, or use analytics or
				advertising. Server logs record only technical information such as the error type and request duration, without
				coordinates.
			</>
		)
	},
	{
		title: 'Location permission',
		body: (
			<>
				Location permission is only requested after &quot;Use device location&quot; is selected. Permission can be revoked
				at any time in the browser settings. Selecting a city from the list remains available without location permission.
			</>
		)
	}
];
