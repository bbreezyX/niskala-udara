// Speculation Rules prerendering (Chromium) is not in TypeScript's DOM types yet.
declare global {
	interface Document {
		readonly prerendering?: boolean;
	}
}

/**
 * Resolves once the page is actually shown. A page prerendered by speculation rules (the language switch
 * prepares the other language on hover) runs its scripts early; waiting here keeps it from spending
 * Google API quota on a page the reader may never open. Ordinary pages resolve at once.
 */
export function whenActivated(): Promise<void> {
	if (typeof document === 'undefined' || !document.prerendering) return Promise.resolve();
	return new Promise((resolve) => document.addEventListener('prerenderingchange', () => resolve(), { once: true }));
}
