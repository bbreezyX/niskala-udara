import { useSyncExternalStore } from 'react';
import { REGIONS, type RegionId } from '@/lib/config/cities';

/**
 * The overview region last picked on this device, so Pantauan opens there next time. Only the region
 * id is kept, in localStorage: never coordinates, never sent to the server, and no cookie.
 */
const KEY = 'niskala.region';

export function rememberedRegion(): RegionId | null {
	try {
		const value = window.localStorage.getItem(KEY);
		return REGIONS.find((region) => region.id === value)?.id ?? null;
	} catch {
		// Storage can be disabled or blocked (private mode, site data off); the default region applies.
		return null;
	}
}

export function rememberRegion(region: RegionId) {
	try {
		window.localStorage.setItem(KEY, region);
	} catch {
		// Not remembering is harmless: the next visit opens the default region.
	}
}

const noSubscription = () => () => {};

/** The remembered region for rendering: null on the server and during hydration, then the stored value. */
export function useRememberedRegion(): RegionId | null {
	return useSyncExternalStore(noSubscription, rememberedRegion, () => null);
}
