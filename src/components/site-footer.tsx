import { Link } from './link';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';
import { BrandMark } from './brand-mark';

function columns(t: Dictionary) {
	return [
		{
			title: t.footer.pages,
			links: [
				{ href: '/', label: t.nav.home },
				{ href: '/map', label: t.nav.map },
				{ href: '/history', label: t.nav.history }
			]
		},
		{
			title: t.footer.information,
			links: [
				{ href: '/about', label: t.footer.about },
				{ href: '/privacy', label: t.footer.privacy },
				{ href: '/terms', label: t.footer.terms }
			]
		}
	];
}

/**
 * Mirrors the dashboard hero: a sky panel with the brand in a bottom-right notch, so the page opens
 * and closes with the same shape. The line explains the name: "niskala" means intangible, unseen.
 */
export function SiteFooter({ dictionary: t }: { dictionary: Dictionary }) {
	return (
		<footer className="page-frame mt-16 pb-6">
			<div className="relative rounded-[20px] bg-sky sm:rounded-[28px]">
				<div className="grid gap-10 px-6 pt-10 pb-20 sm:px-10 md:grid-cols-[auto_minmax(0,1fr)] md:gap-16 md:pt-14 md:pb-20">
					<div className="grid grid-cols-2 content-start gap-x-10 gap-y-8 text-sm">
						{columns(t).map((column) => (
							<nav key={column.title} aria-label={column.title}>
								<h2 className="mb-3 text-sm font-semibold text-secondary-foreground/70">{column.title}</h2>
								<ul className="grid gap-1">
									{column.links.map((link) => (
										<li key={link.href}>
											<Link
												href={link.href}
												className="inline-flex min-h-8 items-center text-secondary-foreground underline-offset-4 hover:underline"
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</nav>
						))}
						<div className="col-span-2">
							<h2 className="mb-3 text-sm font-semibold text-secondary-foreground/70">{t.footer.dataSources}</h2>
							<p className="leading-relaxed text-secondary-foreground">
								{t.footer.airQualitySource}
								<br />
								{t.footer.hotspotSource}{' '}
								<a
									href="https://firms.modaps.eosdis.nasa.gov/"
									rel="noopener noreferrer"
									className="underline underline-offset-4"
								>
									NASA FIRMS
								</a>{' '}
								(LANCE/ESDIS)
								<br />
								{t.footer.windSource}{' '}
								<a href="https://open-meteo.com/" rel="noopener noreferrer" className="underline underline-offset-4">
									Open-Meteo
								</a>{' '}
								(CC BY 4.0)
							</p>
						</div>
					</div>

					<p className="max-w-[21ch] font-display text-[1.75rem] leading-[1.1] tracking-[-0.01em] text-secondary-foreground sm:text-4xl md:justify-self-end lg:text-[clamp(2.5rem,3.9vw,3rem)]">
						<span className="block">{t.footer.taglineLead} <em lang="id">niskala</em>{t.footer.taglineAfterName}</span>{' '}
						<span className="block text-balance">{t.footer.taglineClosing}</span>
					</p>
				</div>

				{/* Notch: page background with concave fillets, holding the brand. */}
				<div className="absolute right-0 bottom-0 flex items-center gap-2 rounded-tl-[20px] bg-background pt-2 pl-4">
					<span aria-hidden="true" className="absolute right-0 bottom-full size-5 bg-[radial-gradient(circle_at_0_0,transparent_19.5px,var(--background)_20px)]" />
					<span aria-hidden="true" className="absolute right-full bottom-0 size-5 bg-[radial-gradient(circle_at_0_0,transparent_19.5px,var(--background)_20px)]" />
					<BrandMark className="size-8 shrink-0 object-contain" />
					<span className="flex items-baseline gap-3">
						<span className="font-display text-2xl leading-none">Niskala</span>
						<span className="text-sm text-muted-foreground">© {new Date().getFullYear()}</span>
					</span>
				</div>
			</div>
		</footer>
	);
}
