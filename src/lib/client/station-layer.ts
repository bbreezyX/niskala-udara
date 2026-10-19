import { ispuBand } from '@/lib/ispu';
import type { KlhkStation } from '@/lib/server/klhk-ispu';

/** Below this zoom the numbers shrink to dots, so Java's dense stations do not pile up into a wall of digits. */
const COMPACT_BELOW_ZOOM = 7;

// The ::before ring widens a dot's touch area without making it look bigger.
const MARKER =
	"absolute top-0 left-0 grid h-6 min-w-7 cursor-pointer place-items-center rounded-full border-2 border-white px-1.5 text-xs font-semibold tabular-nums shadow-md outline-none before:absolute before:-inset-1.5 before:content-[''] focus-visible:ring-3 focus-visible:ring-ring/60 data-compact:h-3.5 data-compact:min-w-3.5 data-compact:border data-compact:px-0 data-compact:text-[0px]";

/**
 * KLH/BPLH stations as real buttons over the map: focusable, labelled for screen readers, and kept out of the
 * map's own click (which opens the point page). Built lazily because google.maps only exists once loaded.
 */
export function createStationOverlay(
	stations: readonly KlhkStation[],
	label: (station: KlhkStation) => string,
	onSelect: (station: KlhkStation) => void
): google.maps.OverlayView {
	class StationOverlay extends google.maps.OverlayView {
		private readonly root = document.createElement('div');
		private readonly markers: [KlhkStation, HTMLButtonElement][] = [];

		onAdd() {
			// Worst readings last, so they sit on top where markers overlap.
			for (const station of stations.toSorted((a, b) => a.ispu - b.ispu)) {
				const band = ispuBand(station.ispu);
				const button = document.createElement('button');
				button.type = 'button';
				button.className = MARKER;
				button.textContent = String(station.ispu);
				button.style.background = band.color;
				button.style.color = band.onColor;
				button.setAttribute('aria-label', label(station));
				button.addEventListener('click', () => onSelect(station));
				this.root.append(button);
				this.markers.push([station, button]);
			}
			google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.root);
			this.getPanes()?.overlayMouseTarget.append(this.root);
		}

		onRemove() {
			this.root.remove();
			this.root.replaceChildren();
			this.markers.length = 0;
		}

		/** Google calls this on every pan and zoom step. */
		draw() {
			const projection = this.getProjection();
			if (!projection) return;
			const compact = ((this.getMap() as google.maps.Map | null)?.getZoom() ?? 0) < COMPACT_BELOW_ZOOM;
			for (const [{ position }, button] of this.markers) {
				if (!position) continue;
				const point = projection.fromLatLngToDivPixel(new google.maps.LatLng(position.latitude, position.longitude));
				if (!point) continue;
				button.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
				button.toggleAttribute('data-compact', compact);
			}
		}
	}
	return new StationOverlay();
}
