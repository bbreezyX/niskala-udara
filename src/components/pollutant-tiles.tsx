'use client';

import { useState } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { formatConcentration, POLLUTANT_LABELS, unitLabel } from '@/lib/format';
import { POLLUTANT_CODES, type PollutantCode, type PollutantReading } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDictionary, useLocale } from './locale-provider';

interface Props {
	pollutants: PollutantReading[];
	codes?: readonly PollutantCode[];
	size?: 'sm' | 'lg';
	className?: string;
}

export function PollutantTiles({ pollutants, codes = POLLUTANT_CODES, size = 'sm', className }: Props) {
	return (
		<dl
			className={cn(
				'grid',
				// Card summary: one outlined strip split by hairlines, instead of a box per reading.
				size === 'sm' ? 'grid-cols-4 divide-x rounded-xl border' : 'grid-cols-2 gap-2 @min-[400px]:grid-cols-3 @min-[860px]:grid-cols-6',
				className
			)}
		>
			{codes.map((code) => (
				<PollutantTile key={code} code={code} reading={pollutants.find((p) => p.code === code)} size={size} />
			))}
		</dl>
	);
}

/**
 * Each reading explains itself on hover, focus, or tap: what the code means, where it comes from,
 * and what the unit is. Tap support is manual because Radix tooltips close on press.
 */
function PollutantTile({ code, reading, size }: { code: PollutantCode; reading?: PollutantReading; size: 'sm' | 'lg' }) {
	const locale = useLocale();
	const { common } = useDictionary();
	const unit = reading ? unitLabel(reading.units) : '';

	return (
		<PollutantHint code={code} units={reading?.units}>
			<div
				className={cn(
					// Positioned so it sits above the card's stretched link and takes the tap itself.
					'relative grid cursor-help content-start gap-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
					size === 'sm'
						? 'min-w-0 px-3 py-2.5 first:rounded-l-[11px] last:rounded-r-[11px] hover:bg-muted/70 data-[state=delayed-open]:bg-muted/70 data-[state=instant-open]:bg-muted/70'
						: 'min-h-20 rounded-xl border bg-card p-3 hover:border-input'
				)}
			>
				<dt className="justify-self-start text-xs font-semibold text-muted-foreground underline decoration-muted-foreground/50 decoration-dotted underline-offset-[3px]">
					{POLLUTANT_LABELS[code]}
				</dt>
				<dd className="grid leading-tight">
					{reading ? (
						<>
							<span className={cn('font-semibold tabular-nums', size === 'sm' ? 'text-sm' : 'text-xl')}>
								{formatConcentration(reading.value, locale)}
							</span>
							{unit && <span className="text-xs text-muted-foreground">{unit}</span>}
						</>
					) : size === 'sm' ? (
						<>
							<span aria-hidden="true">–</span>
							<span className="sr-only">{common.dataNotAvailable}</span>
						</>
					) : (
						<span className="text-xs text-muted-foreground">{common.dataNotAvailable}</span>
					)}
				</dd>
			</div>
		</PollutantHint>
	);
}

/** Wraps one focusable element (the trigger) with the pollutant's explanation. */
export function PollutantHint({ code, units, children }: { code: PollutantCode; units?: string; children: React.ReactElement }) {
	const [open, setOpen] = useState(false);
	const { pollutants } = useDictionary();
	const info = pollutants.info[code];
	const unit = units ? unitLabel(units) : '';
	const unitText = units ? (pollutants.units[units] ?? '') : '';

	return (
		<TooltipPrimitive.Root open={open} onOpenChange={setOpen} delayDuration={200}>
			<TooltipPrimitive.Trigger
				asChild
				tabIndex={0}
				onPointerDown={(event) => event.preventDefault()}
				onClick={(event) => {
					event.preventDefault();
					setOpen(true);
				}}
			>
				{children}
			</TooltipPrimitive.Trigger>
			<TooltipPrimitive.Portal>
				<TooltipPrimitive.Content
					side="top"
					sideOffset={8}
					collisionPadding={16}
					className="z-50 grid w-72 max-w-[calc(100vw-32px)] origin-(--radix-tooltip-content-transform-origin) gap-2 rounded-2xl border bg-popover p-4 text-popover-foreground shadow-lg shadow-foreground/10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0"
				>
					<p className="flex items-baseline gap-2">
						<span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-semibold text-secondary-foreground">
							{POLLUTANT_LABELS[code]}
						</span>
						<span className="text-base font-semibold">{info.name}</span>
					</p>
					<p className="body-copy text-muted-foreground">{info.about}</p>
					<p className="body-copy">
						<span className="font-semibold">{pollutants.commonSources}</span>
						<span className="text-muted-foreground">{info.sources}</span>
					</p>
					{unit && unitText && (
						<p className="meta-copy border-t pt-2 text-muted-foreground">
							<span className="font-semibold text-foreground">{unit}</span> = {unitText}
						</p>
					)}
				</TooltipPrimitive.Content>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	);
}
