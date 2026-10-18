'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export type Locale = 'id' | 'en';

/** Each name is written in its own language, so a reader finds theirs without knowing the current one. */
const LOCALES = {
	id: { code: 'ID', name: 'Bahasa Indonesia', next: 'en' },
	en: { code: 'EN', name: 'English', next: 'id' }
} as const;

const SPRING = { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 } as const;

/**
 * One button that shows the active language and flips to the other on press. The code rolls vertically
 * like a split-flap, so the change reads as the same control turning over rather than a new one appearing.
 */
export function LanguageSwitch({ value, onChange }: { value: Locale; onChange: (next: Locale) => void }) {
	const reduceMotion = useReducedMotion();
	const current = LOCALES[value];
	const next = LOCALES[current.next];
	const offset = reduceMotion ? 0 : '110%';

	return (
		<button
			type="button"
			onClick={() => onChange(current.next)}
			aria-label={`${current.name}. Ganti ke ${next.name}`}
			title={`Ganti ke ${next.name}`}
			className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[13px] font-bold tracking-wide text-foreground outline-none transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.92] max-[379px]:size-8"
		>
			<AnimatePresence initial={false} mode="popLayout">
				<motion.span
					key={value}
					lang={value}
					initial={{ y: offset, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: reduceMotion ? 0 : '-110%', opacity: 0 }}
					transition={reduceMotion ? { duration: 0.15 } : SPRING}
					className="col-start-1 row-start-1"
				>
					{current.code}
				</motion.span>
			</AnimatePresence>
		</button>
	);
}
