import { FIRMS_MAP_KEY, GOOGLE_AIR_QUALITY_API_KEY } from '$app/env/private';
import type { PageServerLoad } from './$types';

// Only booleans leave the server, so the UI can say honestly which data sources are missing.
export const load: PageServerLoad = () => ({
	airQualityConfigured: Boolean(GOOGLE_AIR_QUALITY_API_KEY),
	firesConfigured: Boolean(FIRMS_MAP_KEY)
});
