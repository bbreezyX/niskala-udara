'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Command as CommandPrimitive } from 'cmdk';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { LIVE_LOCALES, splitLocale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { CommandList } from '@/components/ui/command';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { BrandMark } from './brand-mark';
import { CityResults, filterCities } from './city-search';
import { LanguageSwitch } from './language-switch';
import { Link } from './link';
import { useDictionary, useLocale, useLocalePath } from './locale-provider';

// Only shown once a second language is live, so production never offers a version that is not ready.
const SHOW_LANGUAGE_SWITCH = LIVE_LOCALES.length > 1;

const NAV = [
	{ href: '/', key: 'home' },
	{ href: '/map', key: 'map' },
	{ href: '/history', key: 'history' }
] as const;

/** One spring for every capsule change, so resizing, the indicator, and the name fold move as one object. */
const SPRING = { type: 'spring', stiffness: 420, damping: 36, mass: 0.8 } as const;

/** Width folds on the spring; opacity settles faster so half-clipped text never lingers. */
const FOLD = { ...SPRING, opacity: { duration: 0.16 } } as const;

/**
 * Nav ⇄ search morph: one width change on a critically damped spring, so it lands without a slow tail.
 * The outgoing content fades first and the incoming one follows, so the two never sit half-visible together.
 */
const MORPH = { type: 'spring', duration: 0.3, bounce: 0 } as const;
const FADE_OUT = { duration: 0.08, ease: [0.23, 1, 0.32, 1] } as const;
const FADE_IN = { duration: 0.16, delay: 0.06, ease: [0.23, 1, 0.32, 1] } as const;

/** Press feedback shared by every capsule control; transform only, so it never shifts layout. */
const PRESS = 'transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96]';

/** Detail pages belong to the section they were opened from: city pages to Pantauan, map points to Peta. */
function isActive(href: string, pathname: string) {
	if (href === '/') return pathname === '/' || (pathname.startsWith('/location/') && pathname !== '/location/point');
	if (href === '/map') return pathname === '/map' || pathname === '/location/point';
	return pathname === href;
}

function subscribeScroll(callback: () => void) {
	window.addEventListener('scroll', callback, { passive: true });
	return () => window.removeEventListener('scroll', callback);
}

/**
 * Floating capsule: brand, sections, and search in one surface. It compacts on scroll (the name folds
 * away), the active section indicator slides on a spring, and search opens inside the capsule.
 */
export function AppHeader() {
	// Section matching works on the path without its locale prefix, so /en/map and /map light up the same tab.
	const pathname = splitLocale(usePathname()).path;
	const router = useRouter();
	const locale = useLocale();
	const t = useDictionary();
	const localize = useLocalePath();
	const scrolled = useSyncExternalStore(subscribeScroll, () => window.scrollY > 8, () => false);
	const [searching, setSearching] = useState(false);
	const [query, setQuery] = useState('');
	const capsule = useRef<HTMLDivElement>(null);
	const header = useRef<HTMLElement>(null);
	const navRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const reduceMotion = useReducedMotion();
	// Nav and search share one slot; its width springs between their natural widths. Measured, because
	// both are intrinsic (the nav's labels, the field's viewport clamp) and change across breakpoints.
	const [widths, setWidths] = useState<{ nav: number; search: number } | null>(null);
	useLayoutEffect(() => {
		const nav = navRef.current;
		const search = searchRef.current;
		if (!nav || !search) return;
		const measure = () => setWidths({ nav: nav.offsetWidth, search: search.offsetWidth });
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(nav);
		observer.observe(search);
		return () => observer.disconnect();
	}, []);
	useEffect(() => {
		if (searching) inputRef.current?.focus();
	}, [searching]);
	// The indicator moves on click, not when the route finishes loading (Peta can take a moment), and
	// falls back to the pathname once navigation lands or the user goes back.
	const [pending, setPending] = useState<string | null>(null);
	const [landedPath, setLandedPath] = useState(pathname);
	if (landedPath !== pathname) {
		setLandedPath(pathname);
		setPending(null);
	}
	const target = pending ?? pathname;

	function onNavClick(event: React.MouseEvent, href: string) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		if (href !== pathname) setPending(href);
	}

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				setSearching((value) => !value);
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, []);

	function openSearch(next: boolean) {
		setSearching(next);
		if (!next) setQuery('');
	}

	function go(href: string) {
		openSearch(false);
		router.push(localize(href));
	}

	return (
		<header ref={header} className="pointer-events-none sticky top-0 z-40 flex justify-center px-4 pt-3">
			<CommandPrimitive filter={filterCities} loop label={t.search.label} className="contents">
				<Popover open={searching} onOpenChange={openSearch}>
					{/* Anchored to the full-width header, not the resizing capsule, so results never shimmer sideways mid-morph. */}
					<PopoverAnchor virtualRef={header} />
					<div
						ref={capsule}
						className={cn(
							'pointer-events-auto flex items-center rounded-full border bg-card/90 p-1.5 backdrop-blur-md transition-shadow duration-300 [view-transition-name:site-header]',
							scrolled || searching ? 'shadow-lg shadow-foreground/10' : 'shadow-sm'
						)}
					>
						<Link
							href="/"
							aria-label={t.nav.brandHome}
							onClick={(event) => onNavClick(event, '/')}
							className={cn('flex shrink-0 items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50', PRESS)}
						>
								<BrandMark className="size-9 shrink-0 object-contain max-[379px]:size-8" />
								<AnimatePresence initial={false}>
									{!scrolled && (
										<motion.span
											key="name"
											initial={{ opacity: 0, width: 0 }}
											animate={{ opacity: 1, width: 'auto' }}
											exit={{ opacity: 0, width: 0 }}
											transition={FOLD}
											className="hidden overflow-hidden md:block"
										>
											{/* Spacing lives inside the clipped box, so it folds away with the name instead of snapping. */}
											<span className="block px-2 font-display text-xl leading-none whitespace-nowrap">Niskala</span>
										</motion.span>
									)}
								</AnimatePresence>
							</Link>

						{/*
						  Nav and search share one slot that springs between their natural widths. Only this slot reflows,
						  so the capsule border and radius stay crisp; the two contents crossfade in place on top of it.
						*/}
						<motion.div
							initial={false}
							animate={widths ? { width: searching ? widths.search : widths.nav } : undefined}
							transition={reduceMotion ? { duration: 0 } : MORPH}
							className="relative overflow-hidden"
						>
							<motion.nav
								ref={navRef}
								aria-label={t.nav.label}
								inert={searching}
								initial={false}
								animate={{ opacity: searching ? 0 : 1 }}
								transition={searching ? FADE_OUT : FADE_IN}
								className="w-max px-1.5 max-[379px]:px-1"
							>
								<ul className="flex items-center rounded-full bg-muted p-1 max-[379px]:p-0.5">
									{NAV.map(({ href, key }) => {
										const active = isActive(href, target);
										return (
											<li key={href}>
												<Link
													href={href}
													aria-current={isActive(href, pathname) ? 'page' : undefined}
													onClick={(event) => onNavClick(event, href)}
													className={cn(
														'relative flex h-8 items-center rounded-full px-3.5 text-sm font-semibold outline-none transition-[color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96] max-[379px]:px-2.5 max-[379px]:text-[13px] sm:px-4',
														active ? 'text-background' : 'text-muted-foreground hover:text-foreground'
													)}
												>
													{active && (
														<motion.span
															layoutId="nav-active"
															transition={SPRING}
															className="absolute inset-0 rounded-full bg-foreground"
														/>
													)}
													<span className="relative">{t.nav[key]}</span>
												</Link>
											</li>
										);
									})}
								</ul>
							</motion.nav>

							{/* Sizes the open slot: the field's own width rule, measured once instead of mirrored in JS. */}
							<div ref={searchRef} aria-hidden="true" className="invisible absolute top-0 left-0 box-content h-0 w-[min(22rem,calc(100vw-9rem))] px-1.5 max-[379px]:px-1" />
							{/* The field stretches with the slot, so it stays a whole pill at every frame instead of being clipped. */}
							<motion.div
								inert={!searching}
								initial={false}
								animate={{ opacity: searching ? 1 : 0 }}
								transition={searching ? FADE_IN : FADE_OUT}
								className="absolute inset-0 flex items-center px-1.5 max-[379px]:px-1"
							>
								<div className="flex h-9 w-full items-center gap-2 rounded-full bg-muted px-3">
									<Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
									<CommandPrimitive.Input
										ref={inputRef}
										value={query}
										onValueChange={setQuery}
										placeholder={t.search.placeholder}
										aria-label={t.search.inputLabel}
										className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
									/>
								</div>
							</motion.div>
						</motion.div>

						<button
							type="button"
							onClick={() => openSearch(!searching)}
							aria-label={searching ? t.search.close : t.search.open}
							aria-expanded={searching}
							title={searching ? undefined : t.search.open}
							className="grid size-9 shrink-0 place-items-center rounded-full bg-muted max-[379px]:size-8 text-muted-foreground outline-none transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.92]"
						>
							{searching ? <X className="size-4.5" aria-hidden="true" /> : <Search className="size-4.5" aria-hidden="true" />}
						</button>

						{/* Below 360px the capsule has no room left; small screens need the footer for this once it ships. */}
						{SHOW_LANGUAGE_SWITCH && (
							<div className="ml-1.5 shrink-0 max-[379px]:ml-1 max-[359px]:hidden">
								<LanguageSwitch value={locale} path={pathname} />
							</div>
						)}
					</div>
					<PopoverContent
						align="center"
						sideOffset={10}
						className="w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-3xl p-1 duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
						onOpenAutoFocus={(event) => event.preventDefault()}
						onInteractOutside={(event) => {
							// Clicks inside the capsule (the field, the close button) are handled there.
							if (capsule.current?.contains(event.target as Node)) event.preventDefault();
						}}
					>
						{/*
						  cmdk measures its results into --cmdk-list-height; easing toward it keeps the card from snapping
						  between 428px and one row on each keystroke. A transition, so fast typing retargets mid-flight.
						*/}
						<CommandList className="h-[min(var(--cmdk-list-height),420px,60vh)] max-h-[min(420px,60vh)] transition-[height] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none">
							<CityResults onGo={go} />
						</CommandList>
					</PopoverContent>
				</Popover>
			</CommandPrimitive>
		</header>
	);
}
