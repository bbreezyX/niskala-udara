/** English translation of the Indonesian original, which prevails if the two differ. */
export function PrivacyEn() {
	return (
		<>
			<h2>Data we process</h2>
			<p>
				Niskala only processes location coordinates to fetch air quality data. When you choose a city, the coordinates sent
				are that city&apos;s reference point. When you press &quot;Use my location&quot;, your browser asks for your permission
				first, and the device coordinates are then rounded to about 100 metres before they are sent.
			</p>

			<h2>Where the data goes</h2>
			<p>
				Coordinates are sent to the Niskala server and passed on to the Google Maps Platform Air Quality API to fetch current
				air conditions. Google&apos;s processing is subject to the{' '}
				<a href="https://policies.google.com/privacy" rel="noopener noreferrer">
					Google Privacy Policy
				</a>
				.
			</p>

			<h2>The Map page</h2>
			<p>
				The map loads directly from Google Maps in your browser, so Google receives technical data such as your IP address and
				may use cookies under its own policy. A point you click on the map is rounded to about 100 metres, then sent through the
				Niskala server to Google to fetch its air quality. Hotspot data is fetched by the server from NASA FIRMS without any
				data about you.
			</p>

			<h2>What we don&apos;t do</h2>
			<p>
				We don&apos;t store your coordinates or searches, don&apos;t set cookies of our own, don&apos;t require an account, and
				don&apos;t use analytics or ads. Server logs record only technical information such as the type of error and how long
				a request took, never coordinates.
			</p>

			<h2>Location permission</h2>
			<p>
				Location permission is only requested after you press the button, and you can revoke it at any time in your browser
				settings. Without it, you can still choose a city from the list.
			</p>
		</>
	);
}
