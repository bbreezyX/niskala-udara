import type { LegalSection } from '../legal-sections';

/** English translation of the Indonesian original, which prevails if the two differ. */
export const PRIVACY_EN: LegalSection[] = [
	{
		title: 'Data we process',
		body: (
			<>
				Niskala only processes location coordinates to fetch air quality data. When you choose a city, the coordinates sent
				are that city&apos;s reference point. When you press &quot;Use my location&quot;, your browser asks for your permission
				first, and the device coordinates are then rounded to about 100 metres before they are sent.
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
				The map loads directly from Google Maps in your browser, so Google receives technical data such as your IP address and
				may use cookies under its own policy. A point you click on the map is rounded to about 100 metres, then sent through the
				Niskala server to Google to fetch its air quality. Hotspot data from NASA FIRMS and wind data from Open-Meteo are
				fetched by the server without any data about you.
			</>
		)
	},
	{
		title: 'What stays on your device',
		body: (
			<>
				So the overview opens on your region, your browser keeps the region you last picked, or the nearest one after you use
				&quot;Use my location&quot;. Only the region name (for example Riau) is kept, never coordinates, in the browser&apos;s
				local storage (localStorage). It is never sent to the server and is not a cookie. You can remove it by clearing this
				site&apos;s data in your browser settings.
			</>
		)
	},
	{
		title: "What we don't do",
		body: (
			<>
				We don&apos;t store your coordinates or searches, don&apos;t set cookies of our own, don&apos;t require an account, and
				don&apos;t use analytics or ads. Server logs record only technical information such as the type of error and how long
				a request took, never coordinates.
			</>
		)
	},
	{
		title: 'Location permission',
		body: (
			<>
				Location permission is only requested after you press the button, and you can revoke it at any time in your browser
				settings. Without it, you can still choose a city from the list.
			</>
		)
	}
];
