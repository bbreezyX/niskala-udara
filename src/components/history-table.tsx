'use client';

import { ChevronDown } from 'lucide-react';
import { aqiBand } from '@/lib/aqi';
import type { City } from '@/lib/config/cities';
import { formatDay, formatHour, pollutantLabel } from '@/lib/format';
import type { HourSlot } from '@/lib/history';
import { fill } from '@/lib/i18n/config';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDictionary, useLocale } from './locale-provider';

interface Props {
	slots: HourSlot[];
	city: City;
	/** `t` of the selected slot. */
	selected: number;
	onSelect: (t: number) => void;
}

/** Every hour as numbers, closed by default: the exact values, and the keyboard way to pick an hour. */
export function HoursTable({ slots, city, selected, onSelect }: Props) {
	const t = useDictionary();
	const { columns } = t.history;
	const count = slots.filter((slot) => slot.hour).length;

	return (
		// min-w-0: as a grid item the table's width would otherwise widen the whole page on a phone.
		<details className="group min-w-0 rounded-2xl bg-card px-5 ring-1 ring-foreground/10 sm:px-6">
			<summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
				{fill(t.history.table.summary, { n: String(count) })}
				<ChevronDown
					aria-hidden="true"
					className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
				/>
			</summary>
			<div className="pb-5">
				<Table className="text-sm">
					<TableCaption className="sr-only">{fill(t.history.caption, { name: city.name })}</TableCaption>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="text-xs font-semibold text-muted-foreground">{columns.hour}</TableHead>
							<TableHead className="text-xs font-semibold text-muted-foreground">{columns.aqi}</TableHead>
							<TableHead className="text-xs font-semibold text-muted-foreground">{columns.category}</TableHead>
							<TableHead className="text-xs font-semibold text-muted-foreground max-sm:hidden">{columns.pollutant}</TableHead>
							<TableHead>
								<span className="sr-only">{t.history.table.show}</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{slots.toReversed().map((slot) => (
							<HourRow key={slot.t} slot={slot} timeZone={city.timeZone} isSelected={slot.t === selected} onSelect={onSelect} />
						))}
					</TableBody>
				</Table>
			</div>
		</details>
	);
}

function HourRow({
	slot,
	timeZone,
	isSelected,
	onSelect
}: {
	slot: HourSlot;
	timeZone: string;
	isSelected: boolean;
	onSelect: (t: number) => void;
}) {
	const locale = useLocale();
	const t = useDictionary();
	const iso = new Date(slot.t).toISOString();
	const hourText = formatHour(iso, timeZone, locale);
	const dayText = formatDay(iso, timeZone, locale);
	const when = (
		<span className="grid leading-tight">
			<span className="font-semibold tabular-nums">{hourText}</span>
			<span className="text-xs text-muted-foreground">{dayText}</span>
		</span>
	);

	if (!slot.hour) {
		return (
			<TableRow className="hover:bg-transparent">
				<TableCell>{when}</TableCell>
				<TableCell colSpan={4} className="text-muted-foreground">
					{t.history.table.noData}
				</TableCell>
			</TableRow>
		);
	}

	const { index } = slot.hour;
	return (
		<TableRow data-state={isSelected ? 'selected' : undefined}>
			<TableCell>{when}</TableCell>
			<TableCell className="font-semibold tabular-nums">{index.aqiDisplay}</TableCell>
			<TableCell>{t.aqi.bands[aqiBand(index.aqi).key]}</TableCell>
			<TableCell className="max-sm:hidden">{index.dominantPollutant ? pollutantLabel(index.dominantPollutant) : '–'}</TableCell>
			<TableCell className="text-right">
				<Button
					variant="ghost"
					aria-pressed={isSelected}
					aria-label={fill(t.history.showHour, { time: `${hourText}, ${dayText}` })}
					onClick={() => onSelect(slot.t)}
				>
					{t.history.table.show}
				</Button>
			</TableCell>
		</TableRow>
	);
}
