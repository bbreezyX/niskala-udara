import Image from 'next/image';

/**
 * Full-page error state: the status code in the display serif over a paper-cut city fading into morning
 * mist. The code is decorative; the title is the page's heading. Mist, not smog: color that describes air
 * belongs to the AQI scale only.
 */
export function ErrorScene({
	code,
	title,
	description,
	children
}: {
	code: string;
	title: string;
	description: string;
	/** The page's actions, primary first. */
	children: React.ReactNode;
}) {
	return (
		// Fills the screen under the header (3.75rem); globals.css hides the footer and the header's sections.
		<div className="page-frame flex min-h-[calc(100dvh-3.75rem)] flex-col pt-3 pb-4 sm:pb-6">
			<section
				aria-labelledby="error-title"
				data-error-scene
				className="relative isolate grid min-h-[600px] flex-1 content-center justify-items-center overflow-hidden rounded-[20px] bg-sky px-6 pt-12 pb-76 text-center sm:rounded-[28px] sm:pb-[clamp(13rem,22vw,15rem)]"
			>
				<Image
					src="/images/errors/misty-city-paper-cut-v1.webp"
					alt=""
					fill
					loading="eager"
					// Phones crop the 16:10 image to a tall box, so it renders well over the box width.
					sizes="(max-width: 639px) 1400px, (max-width: 1280px) 100vw, 1232px"
					className="pointer-events-none -z-10 object-cover object-bottom"
				/>
				<p
					aria-hidden="true"
					className="bg-linear-to-b from-foreground from-30% to-sky-deep bg-clip-text font-display text-[clamp(7rem,min(30vw,26dvh),19rem)] leading-[0.78] tracking-[-0.04em] text-transparent tabular-nums"
				>
					{code}
				</p>
				<div className="mt-8 grid justify-items-center gap-6">
					<div className="grid max-w-xl justify-items-center gap-2">
						<h1 id="error-title" className="font-display text-4xl leading-[1.05] tracking-[-0.01em] text-balance sm:text-5xl">
							{title}
						</h1>
						<p className="max-w-md text-pretty text-muted-foreground">{description}</p>
					</div>
					<div className="flex flex-wrap justify-center gap-2">{children}</div>
				</div>
			</section>
		</div>
	);
}
