import { useRef } from 'react';

/** Height the list wants under its trigger before opening; less than this and the page scrolls first. */
const ROOM_PX = 360;

/**
 * Keeps a popover list opening downward, also on phones. Radix would flip it above the trigger when
 * space runs short (often once the keyboard opens), so instead: the page scrolls to make room, the list
 * caps itself to the space left (`--radix-popover-content-available-height`), and touch screens do not
 * focus the search field on open, so no keyboard covers the list. Tapping the field still searches.
 */
export function useDropdownBelow() {
	const triggerRef = useRef<HTMLButtonElement>(null);
	const commandRef = useRef<HTMLDivElement>(null);

	function makeRoom() {
		const trigger = triggerRef.current;
		if (!trigger) return;
		const room = window.innerHeight - trigger.getBoundingClientRect().bottom;
		if (room >= ROOM_PX) return;
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollBy({ top: ROOM_PX - room, behavior: reduced ? 'auto' : 'smooth' });
	}

	const contentProps = {
		side: 'bottom',
		avoidCollisions: false,
		collisionPadding: 16,
		onOpenAutoFocus: (event: Event) => {
			if (!window.matchMedia('(pointer: coarse)').matches) return;
			event.preventDefault();
			// Focus stays inside the popover for screen readers, without raising the keyboard.
			commandRef.current?.focus();
		}
	} as const;

	return { triggerRef, commandRef, makeRoom, contentProps };
}
