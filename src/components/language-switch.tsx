'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { fill, localizePath, type Locale } from '@/lib/i18n/config';
import { useDictionary } from './locale-provider';

/** Each name is written in its own language, so a reader finds theirs without knowing the current one. */
const LOCALES = {
	id: { code: 'ID', name: 'Bahasa Indonesia', next: 'en' },
	en: { code: 'EN', name: 'English', next: 'id' }
} as const;

const SPRING = { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 } as const;

/** Hover this long before preparing the other language, so a pointer passing over the header costs nothing. */
const HOVER_INTENT_MS = 120;

const prerendered = new Set<string>();

/**
 * Asks the browser to prerender a URL in the background (Speculation Rules; Chromium only, a no-op elsewhere),
 * so the click switches near-instantly. The prerendered page holds its API and Maps calls until it is shown.
 */
function prerender(url: string) {
	if (prerendered.has(url) || !HTMLScriptElement.supports?.('speculationrules')) return;
	prerendered.add(url);
	const script = document.createElement('script');
	script.type = 'speculationrules';
	script.textContent = JSON.stringify({ prerender: [{ urls: [url], eagerness: 'immediate' }] });
	document.head.append(script);
}

/**
 * Shows the active language and links to this same page in the other one. A link, not a toggle: the
 * language lives in the URL, so it works without JavaScript, opens in a new tab, and is shareable.
 * Each language has its own root layout, so the switch is a full page load. Three things soften it: the page is
 * prerendered on hover or focus, the documents crossfade (cross-document view transition, globals.css), and the
 * code flips on press (rolling vertically like a split-flap) so the change starts before the new page lands.
 */
export function LanguageSwitch({ value, path }: { value: Locale; path: string }) {
	const reduceMotion = useReducedMotion();
	const { languageSwitch } = useDictionary();
	const [shown, setShown] = useState<Locale>(value);
	const current = LOCALES[value];
	const next = LOCALES[current.next];
	const href = localizePath(path, current.next);
	const offset = reduceMotion ? 0 : '110%';
	const label = fill(languageSwitch.switchTo, { name: next.name });
	const hoverTimer = useRef<number | undefined>(undefined);

	// Query (?region=) and hash (map point coordinates) belong to the page, so they carry over. Read at the
	// moment of use, so the prerendered URL and the one navigated to always match.
	const target = () => href + window.location.search + window.location.hash;

	function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		setShown(current.next);
		window.location.assign(target());
	}

	return (
		<a
			href={href}
			hrefLang={current.next}
			onClick={onClick}
			onPointerEnter={() => {
				hoverTimer.current = window.setTimeout(() => prerender(target()), HOVER_INTENT_MS);
			}}
			onPointerLeave={() => window.clearTimeout(hoverTimer.current)}
			onFocus={() => prerender(target())}
			aria-label={`${current.name}. ${label}`}
			title={label}
			className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[13px] font-bold tracking-wide text-foreground outline-none transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.92] max-[379px]:size-8"
		>
			<AnimatePresence initial={false} mode="popLayout">
				<m.span
					key={shown}
					lang={shown}
					initial={{ y: offset, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: reduceMotion ? 0 : '-110%', opacity: 0 }}
					transition={reduceMotion ? { duration: 0.15 } : SPRING}
					className="col-start-1 row-start-1"
				>
					{LOCALES[shown].code}
				</m.span>
			</AnimatePresence>
		</a>
	);
}
