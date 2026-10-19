/**
 * Google Maps Platform Service Specific Terms, Air Quality API 2.2: current conditions and hourly
 * forecasts may be cached for one hour, after which they must be deleted. Every cache layer
 * (server memory plus Cloudflare) together stays inside it.
 */
export const GOOGLE_MAX_AGE_MS = 60 * 60_000;

/** Heatmap server and HTTP browser copies share this deadline; their ages do not add up. */
export const HEATMAP_TILE_MAX_AGE_MS = 30 * 60_000;
/**
 * Decoded tiles may be reused for five minutes from the start of their browser request. Even
 * an HTTP-cached tile already 30 minutes old stays within 35 minutes across all heatmap layers.
 */
export const HEATMAP_FALLBACK_MAX_AGE_MS = 5 * 60_000;

/** How long Cloudflare may serve the dashboard HTML and the region stream (s-maxage, seconds). */
export const EDGE_MAX_AGE_S = 60;

/**
 * Server entries end five minutes early, so an entry served at the last moment and then kept at
 * the edge for EDGE_MAX_AGE_S is still younger than Google's hour, with room for a slow render.
 */
export const SERVER_MAX_AGE_MS = GOOGLE_MAX_AGE_MS - 5 * 60_000;

/** Shared caches (Cloudflare) may keep the response briefly; browsers always revalidate. */
export const EDGE_CACHE_CONTROL = `public, max-age=0, s-maxage=${EDGE_MAX_AGE_S}`;
