/**
 * Google Maps Platform Service Specific Terms, Air Quality API 2.2: current conditions and hourly
 * forecasts may be cached for one hour, after which they must be deleted. Every cache layer
 * (server memory plus Cloudflare) together stays inside it.
 */
export const GOOGLE_MAX_AGE_MS = 60 * 60_000;

/** How long Cloudflare may serve the dashboard HTML and the region stream (s-maxage, seconds). */
export const EDGE_MAX_AGE_S = 60;

/**
 * Server entries end five minutes early, so an entry served at the last moment and then kept at
 * the edge for EDGE_MAX_AGE_S is still younger than Google's hour, with room for a slow render.
 */
export const SERVER_MAX_AGE_MS = GOOGLE_MAX_AGE_MS - 5 * 60_000;

/** Shared caches (Cloudflare) may keep the response briefly; browsers always revalidate. */
export const EDGE_CACHE_CONTROL = `public, max-age=0, s-maxage=${EDGE_MAX_AGE_S}`;
