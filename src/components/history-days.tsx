'use client';

import type { CSSProperties } from 'react';
import { aqiBand, UAQI_GRADIENT } from '@/lib/aqi';
import { formatDay } from '@/lib/format';
import type { DayCell, DayRow } from '@/lib/history';
import { cn } from '@/lib/utils';
import { useDictionary, useLocale } from './locale-provider';

const GAP_FILL = 'repeating-linear-gradient(45deg, var(--surface-hover) 0 3px, var(--card) 3px 6px)';

/** Hours outside the range draw only an outline (a class), so they need no fill. */
function cellStyle(cell: DayCell): CSSProperties | undefined {
	if (cell === 'outside') return undefined;
	return { background: cell === 'gap' ? GAP_FILL : cell.color };
}

/** One ribbon per calendar day, so days can be compared at a glance. */
export function DaysTile({ rows, timeZone }: { rows: DayRow[]; timeZone: string }) {
	const t = useDictionary();
	const copy = t.history.days;

	return (
		<section aria-labelledby="history-days" className="flex flex-col gap-3.5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
			<div className="flex items-baseline justify-between gap-3">
				<h2 id="history-days" className="text-sm font-semibold text-muted-foreground">
					{copy.title}
				</h2>
				<span aria-hidden="true" className="text-sm text-muted-foreground">
					{copy.average}
				</span>
			</div>
			<ul className="grid gap-2.5">
				{rows.map((row) => (
					<DayLine key={row.key} row={row} timeZone={timeZone} />
				))}
			</ul>
			{/* Aligned to the ribbon column: the day label (5rem) and the average (2rem) each sit behind a 0.75rem gap. */}
			<div aria-hidden="true" className="-mt-1 mr-11 ml-[5.75rem] flex justify-between text-xs text-muted-foreground tabular-nums">
				<span>00</span>
				<span>06</span>
				<span>12</span>
				<span>18</span>
				<span>24</span>
			</div>
			<div aria-hidden="true" className="mt-auto flex items-center gap-2.5 text-xs text-muted-foreground">
				<span>{t.aqi.bands.poor}</span>
				<span className="h-1.5 flex-1 rounded-full" style={{ background: UAQI_GRADIENT }} />
				<span>{t.aqi.bands.excellent}</span>
			</div>
		</section>
	);
}

function DayLine({ row, timeZone }: { row: DayRow; timeZone: string }) {
	const locale = useLocale();
	const t = useDictionary();
	const day = formatDay(new Date(row.t).toISOString(), timeZone, locale);
	const cells = row.cells.map((cell, hour) => ({ hour, cell }));

	return (
		<li className="flex items-center gap-3">
			<span aria-hidden="true" className="w-20 shrink-0 text-sm font-semibold">
				{day}
			</span>
			<span aria-hidden="true" className="grid h-5 min-w-0 flex-1 grid-cols-24 gap-0.5">
				{cells.map(({ hour, cell }) => (
					<span key={hour} className={cn('rounded-[3px]', cell === 'outside' && 'ring-1 ring-border ring-inset')} style={cellStyle(cell)} />
				))}
			</span>
			<span
				aria-hidden="true"
				className={cn('w-8 shrink-0 text-right font-semibold tabular-nums', row.avg === null && 'text-muted-foreground')}
				style={row.avg === null ? undefined : { color: aqiBand(row.avg).ink }}
			>
				{row.avg ?? '–'}
			</span>
			<span className="sr-only">
				{day}: {t.history.days.average} {row.avg ?? t.common.notAvailable}
			</span>
		</li>
	);
}
