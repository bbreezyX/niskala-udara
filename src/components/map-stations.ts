'use client';

import { useEffect, useEffectEvent } from 'react';
import { timeZoneAt } from '@/lib/config/cities';
import { createStationOverlay } from '@/lib/client/station-layer';
import { formatAgo, formatDataTime } from '@/lib/format';
import { fill, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';
import { ispuBand } from '@/lib/ispu';
import type { KlhkStation } from '@/lib/server/klhk-ispu';
import { useDictionary, useLocale } from './locale-provider';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

/**
 * Station details for the InfoWindow. Shares the hotspot card's styles (`.hotspot-card` in globals.css), so the
 * map has one card design. Built with textContent: KLH values never become HTML.
 */
function stationContent(station: KlhkStation, locale: Locale, t: Dictionary, onCheck: () => void): HTMLElement {
	const band = ispuBand(station.ispu);
	const root = element('div', 'hotspot-card');

	const chip = element('p', 'hotspot-card__level', t.ispu.bands[band.key]);
	chip.style.setProperty('--level', band.color);

	const reading = element('div', 'hotspot-card__time');
	const zone = station.position ? timeZoneAt(station.position) : 'Asia/Jakarta';
	// Date and age on their own lines, so neither breaks mid-phrase in the narrow card.
	const time = element('time', 'hotspot-card__date', formatDataTime(station.observedAt, zone, locale));
	time.dateTime = station.observedAt;
	reading.append(
		element('span', 'hotspot-card__ago', `${t.ispu.label} ${station.ispu}`),
		time,
		element('span', 'hotspot-card__date', formatAgo(station.observedAt, locale))
	);

	root.append(chip, reading);
	if (station.criticalPollutant) {
		const facts = element('dl', 'hotspot-card__facts');
		facts.append(element('dt', '', t.map.stations.critical), element('dd', '', station.criticalPollutant));
		root.append(facts);
	}

	const action = element('button', 'hotspot-card__action', t.map.card.check);
	action.type = 'button';
	action.addEventListener('click', onCheck);
	root.append(action);
	return root;
}

/**
 * Draws KLH/BPLH stations while `show` is on. A station opens its card; the card's action opens the point page
 * for the station's position, like the hotspot card does.
 */
export function useStationLayer(
	map: google.maps.Map | null,
	stations: readonly KlhkStation[] | null,
	show: boolean,
	onSelect: (latitude: number, longitude: number) => void
) {
	const locale = useLocale();
	const t = useDictionary();

	// Read at event time, so a new language or route never rebuilds the markers.
	const label = useEffectEvent((station: KlhkStation) =>
		fill(t.map.stations.marker, { name: station.name, value: String(station.ispu), category: t.ispu.bands[ispuBand(station.ispu).key] })
	);
	const cardFor = useEffectEvent((station: KlhkStation, close: () => void) =>
		stationContent(station, locale, t, () => {
			close();
			if (station.position) onSelect(station.position.latitude, station.position.longitude);
		})
	);

	useEffect(() => {
		if (!map || !stations || !show) return;
		const infoWindow = new google.maps.InfoWindow({ maxWidth: 280, pixelOffset: new google.maps.Size(0, -12) });
		const overlay = createStationOverlay(stations, label, (station) => {
			if (!station.position) return;
			infoWindow.setHeaderContent(Object.assign(document.createElement('h3'), { className: 'hotspot-card__title', textContent: station.name }));
			infoWindow.setContent(cardFor(station, () => infoWindow.close()));
			infoWindow.setPosition({ lat: station.position.latitude, lng: station.position.longitude });
			infoWindow.open({ map });
		});
		overlay.setMap(map);
		// A click elsewhere on the map opens a point page or a hotspot card; this card should not linger over it.
		const click = map.addListener('click', () => infoWindow.close());
		return () => {
			click.remove();
			infoWindow.close();
			overlay.setMap(null);
		};
	}, [map, stations, show]);
}
