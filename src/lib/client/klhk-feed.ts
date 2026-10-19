'use client';

import { useSyncExternalStore } from 'react';
import type { RegionId } from '@/lib/config/cities';
import type { KlhkProvinceData, KlhkStation } from '@/lib/server/klhk-ispu';
import { getJson } from './api';
import type { WatchLocation } from './location-feed';

/** The server keeps each KLH page for 20 minutes; asking sooner would return the same copy. */
const REFRESH_MS = 20 * 60_000;

type RegionState = { status: 'loading' } | { status: 'done'; data: KlhkProvinceData | null; at: number };

const LOADING: RegionState = { status: 'loading' };
const NONE: RegionState = { status: 'done', data: null, at: 0 };
const states = new Map<RegionId, RegionState>();
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

/** One request per province for the session, shared by every card and the detail page. */
function load(region: RegionId) {
	const state = states.get(region);
	if (state?.status === 'loading' || (state?.status === 'done' && Date.now() - state.at < REFRESH_MS)) return;
	states.set(region, LOADING);
	emit();
	void getJson<KlhkProvinceData>(`/api/klhk-ispu/region/${region}`, new AbortController().signal).then((result) => {
		// A failure means no station reading, so the chip falls back to Google's ISPU.
		states.set(region, { status: 'done', data: result?.ok ? result.data : null, at: Date.now() });
		emit();
	});
}

/** City feeds are keyed "city:<id>"; the device's own location and map points have no city. */
function cityIdOf(location: WatchLocation): string | null {
	return location.key.startsWith('city:') ? location.key.slice('city:'.length) : null;
}

/**
 * The KLH/BPLH station reading for a city: undefined while loading, null when none is current (no station,
 * offline, or KLH unreachable). With several stations in one city the highest reading is shown, so the
 * chip never sounds calmer than the worst part of town.
 */
export function useKlhkStation(location: WatchLocation): KlhkStation | null | undefined {
	const cityId = cityIdOf(location);
	const region = cityId ? location.region : null;
	const state = useSyncExternalStore(
		(onChange) => {
			listeners.add(onChange);
			if (region) load(region);
			return () => listeners.delete(onChange);
		},
		() => (region ? (states.get(region) ?? LOADING) : NONE),
		() => (region ? LOADING : NONE)
	);
	if (state.status === 'loading') return undefined;
	const matches = state.data?.stations.filter((s) => s.cityId === cityId) ?? [];
	return matches.reduce<KlhkStation | null>((worst, s) => (worst && worst.ispu >= s.ispu ? worst : s), null);
}
