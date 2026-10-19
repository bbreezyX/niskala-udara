'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import { cityNote, type City, type RegionId } from '@/lib/config/cities';
import type { ClientErrorCode } from '@/lib/format';
import type { AirQualityData, Coordinates, RegionLine } from '@/lib/types';
import { fromApi, pending, postJson, toRemote, type Remote, type Result } from './api';

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

/** A result for one half of a feed; the two halves arrive independently. */
export type PartResult =
	| { part: 'current'; result: Result<AirQualityData> }
	| { part: 'forecast'; result: Result<AirQualityData[]> };

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

	/** Starts a load: a newer one always wins, and results of the superseded one are ignored. */
	#begin(): AbortController {
		this.#controller?.abort();
		const controller = new AbortController();
		this.#controller = controller;
		this.#set({ current: pending(this.#state.current), forecast: pending(this.#state.forecast) });
		return controller;
	}

	#receive(controller: AbortController, { part, result }: PartResult) {
		if (this.#controller !== controller || controller.signal.aborted) return;
		if (part === 'current') {
			this.#set({ current: toRemote(result), fetchedAt: result.ok ? new Date() : this.#state.fetchedAt });
		} else {
			this.#set({ forecast: toRemote(result) });
		}
	}

	/** Current conditions show as soon as they arrive; the slower forecast fills in after. */
	async load() {
		const controller = this.#begin();
		const body = this.location.coordinates;
		await Promise.all([
			postJson<AirQualityData>('/api/air-quality', body, controller.signal).then(
				(result) => result && this.#receive(controller, { part: 'current', result })
			),
			postJson<AirQualityData[]>('/api/air-quality/forecast', body, controller.signal).then(
				(result) => result && this.#receive(controller, { part: 'forecast', result })
			)
		]);
	}

	/** Starts a load whose results come from elsewhere (the region stream); the receiver ignores them once superseded. */
	beginExternal(): (result: PartResult) => void {
		const controller = this.#begin();
		return (result) => this.#receive(controller, result);
	}

	/** Takes a result the server streamed with the page, unless this half already has data or is loading. */
	seed({ part, result }: PartResult) {
		if (this.#state[part].status !== 'idle') return;
		if (part === 'current') this.#set({ current: toRemote(result), fetchedAt: result.ok ? new Date() : null });
		else this.#set({ forecast: toRemote(result) });
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

/** Longer than the server needs at worst (10 s per Google call, all in parallel). */
const REGION_TIMEOUT_MS = 20_000;
const regionControllers = new Map<RegionId, AbortController>();

/**
 * Loads a whole region with one streamed request (GET /api/air-quality/region/[region]) and hands each
 * line to its feed as it arrives, so cards fill in one by one. A newer load of the same region aborts this one.
 */
export async function loadRegion(region: RegionId, feeds: readonly LocationFeed[]) {
	regionControllers.get(region)?.abort();
	const controller = new AbortController();
	regionControllers.set(region, controller);
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, REGION_TIMEOUT_MS);

	const waiting = new Map(feeds.map((feed) => [feed.location.key, { receive: feed.beginExternal(), parts: new Set(['current', 'forecast'] as const) }]));
	const deliver = (line: RegionLine) => {
		const target = waiting.get(`city:${line.id}`);
		if (!target?.parts.delete(line.part)) return;
		target.receive(line.part === 'current' ? { part: 'current', result: fromApi(line.result) } : { part: 'forecast', result: fromApi(line.result) });
	};
	/** Anything the stream did not deliver gets this error, so no card is left loading. */
	const failRest = (code: ClientErrorCode) => {
		for (const { receive, parts } of waiting.values()) {
			for (const part of parts) receive({ part, result: { ok: false, code } });
		}
	};

	try {
		const response = await fetch(`/api/air-quality/region/${region}`, { signal: controller.signal });
		if (!response.ok || !response.body) {
			const json = (await response.json().catch(() => null)) as { error?: { code?: ClientErrorCode } } | null;
			failRest(json?.error?.code ?? 'upstream_error');
			return;
		}
		const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
		let buffer = '';
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			buffer += value;
			let newline: number;
			while ((newline = buffer.indexOf('\n')) >= 0) {
				const line = buffer.slice(0, newline);
				buffer = buffer.slice(newline + 1);
				if (line) deliver(JSON.parse(line) as RegionLine);
			}
		}
		failRest('upstream_error');
	} catch {
		// A newer load of this region aborted us; its own receivers take over.
		if (controller.signal.aborted && !timedOut) return;
		failRest(timedOut ? 'timeout' : 'network');
	} finally {
		clearTimeout(timer);
		if (regionControllers.get(region) === controller) regionControllers.delete(region);
	}
}

const IDLE: FeedState ={ current: { status: 'idle' }, forecast: { status: 'idle' }, fetchedAt: null };
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
