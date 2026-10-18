'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import { cityNote, type City, type RegionId } from '@/lib/config/cities';
import type { AirQualityData, Coordinates } from '@/lib/types';
import { pending, postJson, toRemote, type Remote } from './api';

export interface WatchLocation {
	key: string;
	name: string;
	note: string;
	coordinates: Coordinates;
	timeZone: string;
	/** null for the device's own location, which belongs to every region view. */
	region: RegionId | null;
}

export function cityLocation(city: City): WatchLocation {
	return {
		key: `city:${city.id}`,
		name: city.name,
		note: cityNote(city),
		coordinates: { latitude: city.latitude, longitude: city.longitude },
		timeZone: city.timeZone,
		region: city.region
	};
}

export interface FeedState {
	current: Remote<AirQualityData>;
	forecast: Remote<AirQualityData[]>;
	/** When the request was made on this device; distinct from the data's own timestamp. */
	fetchedAt: Date | null;
}

export function isBusy(state: FeedState): boolean {
	return state.current.status === 'loading' || (state.current.status === 'success' && state.current.refreshing);
}

/**
 * Current conditions plus the 24-hour forecast for one location, as an external store:
 * components read it with `useFeed`/`useFeeds`, and every update replaces the snapshot.
 */
export class LocationFeed {
	readonly location: WatchLocation;
	#state: FeedState = { current: { status: 'idle' }, forecast: { status: 'idle' }, fetchedAt: null };
	#listeners = new Set<() => void>();
	#controller: AbortController | null = null;

	constructor(location: WatchLocation) {
		this.location = location;
	}

	get state(): FeedState {
		return this.#state;
	}

	subscribe = (listener: () => void) => {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	};

	getSnapshot = () => this.#state;

	#set(next: Partial<FeedState>) {
		this.#state = { ...this.#state, ...next };
		this.#listeners.forEach((listener) => listener());
	}

	async load() {
		// A newer load always wins; the aborted one resolves to null and is ignored.
		this.#controller?.abort();
		const controller = new AbortController();
		this.#controller = controller;
		this.#set({ current: pending(this.#state.current), forecast: pending(this.#state.forecast) });

		const body = this.location.coordinates;
		const [current, forecast] = await Promise.all([
			postJson<AirQualityData>('/api/air-quality', body, controller.signal),
			postJson<AirQualityData[]>('/api/air-quality/forecast', body, controller.signal)
		]);
		if (!current || !forecast) return;

		this.#set({
			current: toRemote(current),
			forecast: toRemote(forecast),
			fetchedAt: current.ok ? new Date() : this.#state.fetchedAt
		});
	}

	/**
	 * Aborts an in-flight load and drops its pending state, so a later `load()` (for example
	 * after React Strict Mode's remount in development) starts from a settled state.
	 */
	dispose() {
		if (!this.#controller || this.#controller.signal.aborted) return;
		this.#controller.abort();
		const settle = <T,>(remote: Remote<T>): Remote<T> =>
			remote.status === 'loading' ? { status: 'idle' } : remote.status === 'success' ? { ...remote, refreshing: false } : remote;
		this.#set({ current: settle(this.#state.current), forecast: settle(this.#state.forecast) });
	}
}

/** Older data is reloaded when a page shows the location again; the refresh button covers anything sooner. */
const STALE_MS = 30 * 60_000;

/** True when a page showing this feed should start a load. */
export function needsLoad(feed: LocationFeed): boolean {
	const { current, fetchedAt } = feed.state;
	if (current.status === 'idle') return true;
	return current.status === 'success' && !current.refreshing && fetchedAt !== null && Date.now() - fetchedAt.getTime() > STALE_MS;
}

const cityFeeds = new Map<string, LocationFeed>();

/**
 * One feed per city for the whole browser session, shared by the dashboard and the detail page,
 * so moving between them does not ask Google again. Held in memory only, never persisted.
 */
export function cityFeed(city: City): LocationFeed {
	let feed = cityFeeds.get(city.id);
	if (!feed) {
		feed = new LocationFeed(cityLocation(city));
		// Server renders get a throwaway feed: it never loads there, and sharing it across requests would be wrong.
		if (typeof window !== 'undefined') cityFeeds.set(city.id, feed);
	}
	return feed;
}

const IDLE: FeedState = { current: { status: 'idle' }, forecast: { status: 'idle' }, fetchedAt: null };
const noop = () => () => {};

export function useFeed(feed: LocationFeed | null): FeedState {
	return useSyncExternalStore(feed?.subscribe ?? noop, feed?.getSnapshot ?? (() => IDLE), feed?.getSnapshot ?? (() => IDLE));
}

/** Snapshots for a list of feeds. `feeds` must be referentially stable (memoize it). */
export function useFeeds(feeds: readonly LocationFeed[]): FeedState[] {
	const cache = useRef<{ feeds: readonly LocationFeed[]; states: FeedState[] } | null>(null);

	const subscribe = useCallback(
		(listener: () => void) => {
			const unsubscribers = feeds.map((feed) => feed.subscribe(listener));
			return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
		},
		[feeds]
	);

	const getSnapshot = useCallback(() => {
		const states = feeds.map((feed) => feed.state);
		const cached = cache.current;
		if (cached && cached.feeds === feeds && states.every((state, i) => state === cached.states[i])) {
			return cached.states;
		}
		cache.current = { feeds, states };
		return states;
	}, [feeds]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
