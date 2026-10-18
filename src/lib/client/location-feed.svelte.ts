import { cityNote, type City, type RegionId } from '#lib/config/cities.ts';
import type { AirQualityData, Coordinates } from '#lib/types.ts';
import { pending, postJson, toRemote, type Remote } from './api.ts';

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

/** Current conditions plus the 24-hour forecast for one location. */
export class LocationFeed {
	readonly location: WatchLocation;
	current = $state<Remote<AirQualityData>>({ status: 'idle' });
	forecast = $state<Remote<AirQualityData[]>>({ status: 'idle' });
	/** When the request was made on this device; distinct from the data's own timestamp. */
	fetchedAt = $state<Date | null>(null);
	#controller: AbortController | null = null;

	constructor(location: WatchLocation) {
		this.location = location;
	}

	get busy(): boolean {
		return this.current.status === 'loading' || (this.current.status === 'success' && this.current.refreshing);
	}

	async load() {
		// A newer load always wins; the aborted one resolves to null and is ignored.
		this.#controller?.abort();
		const controller = new AbortController();
		this.#controller = controller;
		this.current = pending(this.current);
		this.forecast = pending(this.forecast);

		const body = this.location.coordinates;
		const [current, forecast] = await Promise.all([
			postJson<AirQualityData>('/api/air-quality', body, controller.signal),
			postJson<AirQualityData[]>('/api/air-quality/forecast', body, controller.signal)
		]);
		if (!current || !forecast) return;

		this.current = toRemote(current);
		this.forecast = toRemote(forecast);
		if (current.ok) this.fetchedAt = new Date();
	}

	dispose() {
		this.#controller?.abort();
	}
}
