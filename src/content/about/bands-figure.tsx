import { AQI_BANDS, UAQI_GRADIENT } from '@/lib/aqi';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';

const RANGES = AQI_BANDS.map((band, i) => ({ ...band, max: (AQI_BANDS[i + 1]?.min ?? 101) - 1 }));

/** The UAQI scale with its five bands; the caption is the language-specific part. */
export function BandsFigure({ names, children }: { names: Dictionary['aqi']['bands']; children: React.ReactNode }) {
	return (
		<figure className="m-0 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
			<div className="h-3 rounded-full" style={{ background: UAQI_GRADIENT }} aria-hidden="true" />
			<div className="meta-copy mt-1.5 flex justify-between text-muted-foreground tabular-nums" aria-hidden="true">
				<span>0</span>
				<span>50</span>
				<span>100</span>
			</div>
			<dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
				{RANGES.map(({ key, icon: Icon, ink, min, max }) => (
					<div key={min} className="grid content-start gap-1 rounded-xl bg-muted/60 p-3">
						<dt className="flex items-center gap-1.5 text-sm font-semibold">
							<Icon className="size-4 shrink-0" style={{ color: ink }} aria-hidden="true" />
							{names[key]}
						</dt>
						<dd className="text-sm text-muted-foreground tabular-nums">
							{min}–{max}
						</dd>
					</div>
				))}
			</dl>
			<figcaption className="meta-copy mt-4 text-muted-foreground">{children}</figcaption>
		</figure>
	);
}
