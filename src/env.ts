import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value?.trim() || undefined;

export const variables = defineEnvVars({
	GOOGLE_AIR_QUALITY_API_KEY: {
		description:
			'Server-only API key for the Google Air Quality API. Optional at startup: without it the app reports that the data source is not configured.',
		schema: optional
	},
	FIRMS_MAP_KEY: {
		description: 'Server-only NASA FIRMS MAP_KEY for hotspot data. Optional: without it the map hides the hotspot layer.',
		schema: optional
	},
	PUBLIC_GOOGLE_MAPS_API_KEY: {
		public: true,
		description:
			'Browser key for the Maps JavaScript API. Sent to browsers, so restrict it to your domains (HTTP referrers) and to the Maps JavaScript API only.',
		schema: optional
	}
});
