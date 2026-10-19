import 'server-only';

const optional = (value: string | undefined) => value?.trim() || undefined;

/** Server-only key for the Google Air Quality API. Without it the app reports that the data source is not configured. */
export const airQualityKey = () => optional(process.env.GOOGLE_AIR_QUALITY_API_KEY);

/** Public origin used for canonical URLs and the sitemap, e.g. https://niskala.id. */
export const siteUrl = () => optional(process.env.SITE_URL) ?? 'http://localhost:3000';

/** Server-only NASA FIRMS MAP_KEY. Without it the map hides the hotspot layer. */
export const firmsKey = () => optional(process.env.FIRMS_MAP_KEY);

/**
 * Browser key for the Maps JavaScript API. It is sent to browsers, so restrict it to your
 * domains (HTTP referrers) and to the Maps JavaScript API only.
 */
export const mapsBrowserKey = () => optional(process.env.PUBLIC_GOOGLE_MAPS_API_KEY);

/**
 * Optional Open-Meteo commercial key. Without it the free API is used, which only allows
 * non-commercial use (no ads or subscriptions on the site).
 */
export const openMeteoKey = () => optional(process.env.OPEN_METEO_API_KEY);
