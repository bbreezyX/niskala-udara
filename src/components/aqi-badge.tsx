'use client';

import { aqiBand, tint } from '@/lib/aqi';
import { cn } from '@/lib/utils';
import { useDictionary } from './locale-provider';

interface Props {
	aqi: number;
	category: string | null;
	color: string | null;
	className?: string;
}

/** Google's category text on a tint of Google's color, with an icon for the UAQI band. */
export function AqiBadge({ aqi, category, color, className }: Props) {
	const { aqi: names } = useDictionary();
	const band = aqiBand(aqi);
	const Icon = band.icon;

	return (
		<span
			className={cn(
				'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-foreground',
				className
			)}
			style={{ background: tint(color) }}
		>
			<Icon className="size-4 shrink-0" style={{ color: band.ink }} aria-hidden="true" />
			<span className="truncate">{category ?? names.bands[band.key]}</span>
		</span>
	);
}
