import { GOOGLE_AIR_QUALITY_API_KEY } from '$app/env/private';
import type { PageServerLoad } from './$types';

// Only a boolean leaves the server, so the UI can say honestly that the data source is not set up.
export const load: PageServerLoad = () => ({ configured: Boolean(GOOGLE_AIR_QUALITY_API_KEY) });
