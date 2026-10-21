'use client';

import { Moon, Sun } from 'lucide-react';
import { aqiBand, bandEdge } from '@/lib/aqi';
import type { HistoryRange } from '@/lib/coordinates';
import { formatHourOfDay } from '@/lib/format';
import { tendency as partsOf, type DailyPattern, type PatternWindow } from '@/lib/history';
import { fill } from '@/lib/i18n/config';
import { useDictionary, useLocale } from './locale-provider';

/** When in the day the air tends to be cleanest and most polluted, across every day in the range. */
export function PatternTile({ pattern, range }: { pattern: DailyPattern | null; range: HistoryRange }) {
	const t = useDictionary();
	const copy = t.history.pattern;
	const parts = pattern ? partsOf(pattern) : null;
	const tendency = parts ? fill(copy.tendency, { best: copy.parts[parts.best], worst: copy.parts[parts.worst] }) : '';

	return (
		<section aria-labelledby="history-pattern" className="grid content-start gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
			<div className="grid gap-1">
				<h2 id="history-pattern" className="panel-title">
					{copy.title}
				</h2>
				<p className="body-copy text-pretty text-muted-foreground">
					{fill(copy.lead, { n: String(range) })} {tendency}
				</p>
			</div>
			{pattern ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<WindowCard span={pattern.best} label={copy.cleanest} />
					<WindowCard span={pattern.worst} label={copy.dirtiest} />
				</div>
			) : (
				<p className="body-copy">{copy.none}</p>
			)}
		</section>
	);
}

function WindowCard({ span, label }: { span: PatternWindow; label: string }) {
	const locale = useLocale();
	const t = useDictionary();
	const band = aqiBand(span.avg);
	// The icon follows the clock, not the verdict: a clean window can fall at night.
	const Icon = span.startHour >= 6 && span.startHour < 18 ? Sun : Moon;

	return (
		<div className="flex gap-3.5 rounded-xl bg-muted p-4">
			<span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-card text-primary ring-1 ring-foreground/10">
				<Icon className="size-5" />
			</span>
			<div className="grid min-w-0 gap-0.5">
				<p className="text-sm text-muted-foreground">{label}</p>
				<p className="text-2xl font-semibold tabular-nums">
					{formatHourOfDay(span.startHour, locale)}–{formatHourOfDay(span.startHour + 2, locale)}
				</p>
				<p className="flex items-center gap-2 text-sm">
					<span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: band.fill, boxShadow: bandEdge(band) }} />
					{fill(t.history.pattern.average, { avg: String(span.avg), band: t.aqi.bands[band.key] })}
				</p>
			</div>
		</div>
	);
}
