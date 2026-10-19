'use client';

import { m } from 'motion/react';
import { UAQI_STOPS } from '@/lib/aqi';
import { fill } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { useDictionary } from './locale-provider';

/** The ring covers 270°, open at the bottom, running from 0 (bottom left) to 100 (bottom right). */
const SWEEP = 270;
const START = 225;

const CONIC = `conic-gradient(from ${START}deg, ${UAQI_STOPS.map(([at, color]) => `${color} ${(at / 100) * SWEEP}deg`).join(', ')}, transparent ${SWEEP}deg)`;

const SIZES = {
	sm: { box: 'size-[72px]', ring: 7, number: 'text-xl', unit: 'text-[10px]' },
	md: { box: 'size-24 min-[400px]:size-28 sm:size-36', ring: 10, number: 'text-4xl sm:text-5xl', unit: 'text-xs' },
	lg: { box: 'size-48 sm:size-56', ring: 14, number: 'text-6xl sm:text-7xl', unit: 'text-sm' }
} as const;

interface Props {
	aqi: number;
	display: string;
	size?: keyof typeof SIZES;
	className?: string;
}

export function AqiGauge({ aqi, display, size = 'sm', className }: Props) {
	const { aqi: names } = useDictionary();
	const { box, ring, number, unit } = SIZES[size];
	const angle = START + (Math.min(100, Math.max(0, aqi)) / 100) * SWEEP;
	const mask = `radial-gradient(farthest-side, transparent calc(100% - ${ring}px), #000 calc(100% - ${ring}px + 1px))`;
	const knob = ring + 6;

	return (
		<div role="img" aria-label={fill(names.gauge, { value: display })} className={cn('relative grid shrink-0 place-items-center', box, className)}>
			<div aria-hidden="true" className="absolute inset-0 rounded-full" style={{ background: CONIC, mask, WebkitMask: mask }} />
			{/* Round caps at both ends of the arc. */}
			{[START, START + SWEEP].map((at, i) => (
				<div key={at} aria-hidden="true" className="absolute inset-0" style={{ transform: `rotate(${at}deg)` }}>
					<span
						className="absolute left-1/2 -translate-x-1/2 rounded-full"
						style={{ top: 0, width: ring, height: ring, background: i === 0 ? UAQI_STOPS[0][1] : UAQI_STOPS.at(-1)![1] }}
					/>
				</div>
			))}
			<m.div
				aria-hidden="true"
				className="absolute inset-0"
				initial={{ rotate: START }}
				animate={{ rotate: angle }}
				transition={{ type: 'spring', stiffness: 120, damping: 20 }}
			>
				<span
					className="absolute left-1/2 rounded-full border-[3px] border-white bg-foreground shadow-md"
					style={{ top: ring / 2, width: knob, height: knob, transform: 'translate(-50%, -50%)' }}
				/>
			</m.div>
			<span aria-hidden="true" className="relative grid justify-items-center leading-none">
				<span className={cn('font-bold tracking-tight tabular-nums', number)}>{display}</span>
				<span className={cn('mt-1 font-semibold tracking-wide text-muted-foreground', unit)}>AQI</span>
			</span>
		</div>
	);
}
