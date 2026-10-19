'use client';

import { useEffect, useEffectEvent } from 'react';
import { MAP_TIME_ZONE, MAP_ZOOM } from '@/lib/config/map';
import type { HotspotLayer, HotspotStyle } from '@/lib/client/hotspot-layer';
import { formatAgo, formatDataTime, numberFormat } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';
import type { Hotspot } from '@/lib/types';
import { useDictionary, useLocale } from './locale-provider';

export const CONFIDENCE = {
	high: { color: '#b91c1c' },
	nominal: { color: '#ea580c' },
	low: { color: '#f59e0b' }
} as const;

export const LEVELS = Object.entries(CONFIDENCE) as [Hotspot['confidence'], (typeof CONFIDENCE)[Hotspot['confidence']]][];

const RANK = { low: 1, nominal: 2, high: 3 } as const;

export const hotspotStyle = ({ confidence }: Hotspot): HotspotStyle => ({
	color: CONFIDENCE[confidence].color,
	radius: confidence === 'high' ? 6 : 5,
	rank: RANK[confidence]
});

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

/**
 * Hotspot details for the InfoWindow, styled by `.hotspot-card` in globals.css.
 * Built with textContent: FIRMS values never become HTML.
 */
function hotspotContent(hotspot: Hotspot, locale: Locale, t: Dictionary['map'], onCheck: () => void): HTMLElement {
	const level = CONFIDENCE[hotspot.confidence];
	const root = element('div', 'hotspot-card');

	const chip = element('p', 'hotspot-card__level', t.confidence[hotspot.confidence]);
	chip.style.setProperty('--level', level.color);

	// Recency leads: a fire seen an hour ago matters more than one from yesterday.
	const time = element('time', 'hotspot-card__time');
	time.dateTime = hotspot.acquiredAt;
	time.append(
		element('span', 'hotspot-card__ago', formatAgo(hotspot.acquiredAt, locale)),
		element('span', 'hotspot-card__date', formatDataTime(hotspot.acquiredAt, MAP_TIME_ZONE, locale))
	);

	const facts = element('dl', 'hotspot-card__facts');
	const rows: [string, string][] = [
		[t.card.satellite, hotspot.satellite],
		[t.card.intensity, hotspot.frp === null ? '–' : `${numberFormat(locale, 1).format(hotspot.frp)} MW`]
	];
	for (const [label, value] of rows) facts.append(element('dt', '', label), element('dd', '', value));

	// A click on a hotspot opens this card instead of the point page, so the card offers it.
	const action = element('button', 'hotspot-card__action', t.card.check);
	action.type = 'button';
	action.addEventListener('click', onCheck);

	root.append(chip, time, facts, action);
	return root;
}

/**
 * Map clicks: a hotspot opens its card, anywhere else opens that point's page.
 * `hotspots` is null while the layer is hidden, so clicks then ignore it.
 */
export function useHotspotClicks(
	map: google.maps.Map | null,
	hotspots: HotspotLayer | null,
	onSelect: (latitude: number, longitude: number) => void
) {
	const locale = useLocale();
	const t = useDictionary();
	const title = t.map.card.title;

	// Read at event time, so new data, a toggled layer or a new route never re-binds the listeners.
	const hotspotAt = useEffectEvent((latLng: google.maps.LatLng, zoom: number, tolerance: number) =>
		hotspots?.hit(latLng.lat(), latLng.lng(), zoom, tolerance) ?? null
	);
	const select = useEffectEvent(onSelect);
	const cardFor = useEffectEvent((hotspot: Hotspot, close: () => void) =>
		hotspotContent(hotspot, locale, t.map, () => {
			close();
			onSelect(hotspot.latitude, hotspot.longitude);
		})
	);

	useEffect(() => {
		if (!map) return;
		// Hotspots are pixels on canvas tiles, so the map click finds them by distance.
		// Coarse pointers get a larger reach, closer to a 44 px touch target.
		const tolerance = window.matchMedia('(pointer: coarse)').matches ? 12 : 4;
		const find = (latLng: google.maps.LatLng) => hotspotAt(latLng, map.getZoom() ?? MAP_ZOOM.initial, tolerance);

		const infoWindow = new google.maps.InfoWindow({
			headerContent: Object.assign(document.createElement('h3'), { className: 'hotspot-card__title', textContent: title }),
			maxWidth: 280,
			// Lift the tail off the dot so the circle stays visible.
			pixelOffset: new google.maps.Size(0, -6)
		});
		let pointer = false;

		const click = map.addListener('click', (event: google.maps.MapMouseEvent) => {
			if (!event.latLng) return;
			const hotspot = find(event.latLng);
			if (!hotspot) {
				infoWindow.close();
				select(event.latLng.lat(), event.latLng.lng());
				return;
			}
			infoWindow.setContent(cardFor(hotspot, () => infoWindow.close()));
			infoWindow.setPosition({ lat: hotspot.latitude, lng: hotspot.longitude });
			infoWindow.open({ map });
		});
		const move = map.addListener('mousemove', (event: google.maps.MapMouseEvent) => {
			const over = Boolean(event.latLng && find(event.latLng));
			if (over === pointer) return;
			pointer = over;
			map.setOptions({ draggableCursor: over ? 'pointer' : null });
		});

		return () => {
			click.remove();
			move.remove();
			infoWindow.close();
			if (pointer) map.setOptions({ draggableCursor: null });
		};
	}, [map, title]);
}
