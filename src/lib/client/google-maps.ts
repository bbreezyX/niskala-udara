/**
 * Loads the Maps JavaScript API once, using Google's async loading pattern, with labels in the page language.
 * A prerendered page waits until it is shown, since each map load is billed.
 * Rejects on network failure and on key rejection (Google's `gm_authFailure` hook).
 */
import type { Locale } from '@/lib/i18n/config';
import { whenActivated } from './activation';

let loading: Promise<void> | null = null;

declare global {
	interface Window {
		gm_authFailure?: () => void;
		__niskalaMapsReady?: () => void;
	}
}

export class MapsLoadError extends Error {
	constructor(readonly reason: 'network' | 'auth') {
		super(`Google Maps failed to load: ${reason}`);
	}
}

export function loadGoogleMaps(apiKey: string, language: Locale): Promise<void> {
	if (loading) return loading;
	loading = whenActivated().then(() => new Promise<void>((resolve, reject) => {
		window.__niskalaMapsReady = () => resolve();
		window.gm_authFailure = () => reject(new MapsLoadError('auth'));

		const params = new URLSearchParams({
			key: apiKey,
			v: 'weekly',
			loading: 'async',
			language,
			region: 'ID',
			callback: '__niskalaMapsReady'
		});
		const script = document.createElement('script');
		script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
		script.async = true;
		script.onerror = () => {
			loading = null;
			script.remove();
			reject(new MapsLoadError('network'));
		};
		document.head.append(script);
	}));
	return loading;
}

/** Called later by Google if the key is rejected after the script already loaded. */
export function onMapsAuthFailure(handler: () => void) {
	window.gm_authFailure = handler;
}
