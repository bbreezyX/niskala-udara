'use client';

import { useState } from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { HeartPulse, MapPin, TriangleAlert, type LucideIcon } from 'lucide-react';
import { aqiBandIndex } from '@/lib/aqi';
import { HEALTH_GROUPS, type HealthGroup } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useDictionary } from './locale-provider';

/** Long enough that three lines usually cut it off, so the full text sits behind "show more". */
const CLAMP_FROM = 180;

export function Recommendation({
	aqi,
	recommendations,
	className
}: {
	aqi: number;
	recommendations: Partial<Record<HealthGroup, string>>;
	className?: string;
}) {
	const { health } = useDictionary();
	const groups = HEALTH_GROUPS.filter((group) => recommendations[group]);
	const [picked, setPicked] = useState<HealthGroup>('generalPopulation');
	const [expanded, setExpanded] = useState(false);
	const group = groups.includes(picked) ? picked : groups[0];
	const text = group ? recommendations[group] : undefined;
	const long = (text?.length ?? 0) > CLAMP_FROM;

	return (
		<section aria-labelledby="health-advice" className={cn('grid gap-3 rounded-xl border p-4', className)}>
			<div>
				<p className="flex items-center gap-2 text-sm text-muted-foreground">
					<HeartPulse className="size-4 text-primary" aria-hidden="true" />
					{health.title}
				</p>
				<h3 id="health-advice" className="mt-1 text-lg leading-snug font-semibold">
					{health.headlines[aqiBandIndex(aqi)]}
				</h3>
			</div>
			{groups.length > 1 && (
				<ToggleGroupPrimitive.Root
					type="single"
					value={group}
					onValueChange={(next) => {
						if (!next) return;
						setPicked(next as HealthGroup);
						setExpanded(false);
					}}
					aria-label={health.groupsLabel}
					className="flex flex-wrap gap-1.5"
				>
					{groups.map((item) => (
						<ToggleGroupPrimitive.Item
							key={item}
							value={item}
							className="h-8 rounded-full border bg-card px-3 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
						>
							{health.groups[item]}
						</ToggleGroupPrimitive.Item>
					))}
				</ToggleGroupPrimitive.Root>
			)}
			{text ? (
				<div>
					<p className={cn('max-w-prose leading-relaxed', long && !expanded && 'line-clamp-3')}>{text}</p>
					{long && (
						<button
							type="button"
							onClick={() => setExpanded((value) => !value)}
							aria-expanded={expanded}
							className="mt-1 min-h-8 text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							{expanded ? health.less : health.more}
						</button>
					)}
				</div>
			) : (
				<p className="text-muted-foreground">{health.missing}</p>
			)}
		</section>
	);
}

/** Required by Google Maps Platform policies: keep the strings unlocalized and inside the data container. */
export function Attribution() {
	return (
		<p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-4 text-sm text-[#5e5e5e]">
			<span className="font-[Roboto,var(--font-sans)] whitespace-nowrap" translate="no">
				Google Maps
			</span>
			<span lang="en" translate="no">
				Source: Includes air quality data from Google
			</span>
		</p>
	);
}

interface StateMessageProps {
	title: string;
	description: string;
	/** `error` announces the message (role="alert"); the look stays neutral, since red means bad air here. */
	tone?: 'neutral' | 'error';
	/** Drawn where the number would be; null draws the "–" of a missing reading. */
	icon?: LucideIcon | null;
	children?: React.ReactNode;
	className?: string;
	/**
	 * `instrument`: a card with the AQI ring drawn empty, for a page that has no reading to show.
	 * `compact`: no frame, small glyph and text actions, for a gap inside a list.
	 * `plain`: the original card, kept for the map.
	 */
	variant?: 'instrument' | 'compact' | 'plain';
}

/** Same 270° ring as AqiGauge, in neutral grey: the instrument is here, the reading is not. */
function EmptyRing({ icon: Icon, large = false }: { icon: LucideIcon | null; large?: boolean }) {
	const ring = large ? 10 : 8;
	const mask = `radial-gradient(farthest-side, transparent calc(100% - ${ring}px), #000 calc(100% - ${ring - 1}px))`;
	return (
		<div aria-hidden="true" className={cn('relative grid shrink-0 place-items-center', large ? 'size-32' : 'size-24')}>
			<div
				className="absolute inset-0 rounded-full"
				style={{ background: 'conic-gradient(from 225deg, var(--input) 0deg 270deg, transparent 270deg)', mask, WebkitMask: mask }}
			/>
			{Icon ? (
				<Icon className="size-7 text-muted-foreground" />
			) : (
				<span className="grid justify-items-center leading-none">
					<span className={cn('font-bold text-muted-foreground/60', large ? 'text-4xl' : 'text-3xl')}>–</span>
					{large && <span className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground">AQI</span>}
				</span>
			)}
		</div>
	);
}

/**
 * No air quality data can be shown at all (the server has no data source). Only the site owner should
 * ever see it, so it keeps the technical wording; the empty ring carries the "AQI" label.
 */
export function DataUnavailable({ title, description, className }: { title: string; description: string; className?: string }) {
	return (
		<div className={cn('grid justify-items-center gap-5 rounded-[20px] border bg-card px-6 py-10 text-center sm:py-12', className)}>
			<EmptyRing icon={null} large />
			<div className="grid max-w-md gap-2">
				<h2 className="text-xl font-semibold">{title}</h2>
				<p className="text-muted-foreground">{description}</p>
			</div>
		</div>
	);
}

export function StateMessage({ title, description, tone = 'neutral', icon = null, children, className, variant = 'instrument' }: StateMessageProps) {
	const role = tone === 'error' ? 'alert' : undefined;

	if (variant === 'compact') {
		const Icon = icon;
		return (
			<div role={role} className={cn('grid justify-items-center gap-3 px-6 py-8 text-center', className)}>
				<span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
					{Icon ? <Icon className="size-5" /> : <span className="text-lg font-bold">–</span>}
				</span>
				<div className="grid max-w-xs gap-1">
					<h2 className="font-semibold">{title}</h2>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
				{children && <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">{children}</div>}
			</div>
		);
	}

	if (variant === 'instrument') {
		return (
			<div role={role} className={cn('grid justify-items-center gap-5 rounded-[20px] border bg-card px-6 py-10 text-center sm:py-12', className)}>
				<EmptyRing icon={icon} />
				<div className="grid max-w-md gap-2">
					<h2 className="text-lg font-semibold">{title}</h2>
					<p className="text-muted-foreground">{description}</p>
				</div>
				{/* Actions read as pills here, like the rest of the app's primary buttons. */}
				{children && (
					<div className="flex flex-wrap justify-center gap-2 **:data-[slot=button]:h-11 **:data-[slot=button]:rounded-full **:data-[slot=button]:px-5">
						{children}
					</div>
				)}
			</div>
		);
	}

	const Icon = icon ?? (tone === 'error' ? TriangleAlert : MapPin);
	return (
		<Empty className={cn('rounded-2xl border border-solid bg-card py-12', className)} role={role}>
			<EmptyHeader>
				<EmptyMedia
					variant="icon"
					className={cn('size-12 rounded-full', tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary')}
				>
					<Icon className="size-6" />
				</EmptyMedia>
				<EmptyTitle className="text-lg font-semibold">{title}</EmptyTitle>
				<EmptyDescription className="text-base">{description}</EmptyDescription>
			</EmptyHeader>
			{children && <EmptyContent>{children}</EmptyContent>}
		</Empty>
	);
}
