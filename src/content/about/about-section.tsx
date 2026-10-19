/** Shared markup for the About page, so each language file holds only its words. */
export function AboutHeader({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<header>
			<h1 className="font-display text-5xl leading-[1.1] tracking-[-0.02em] text-balance sm:text-6xl">{title}</h1>
			<p className="mt-4 max-w-prose text-lg">{children}</p>
		</header>
	);
}

/** Section ids are shared across languages, so an anchor link works in either one. */
export function AboutSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
	return (
		<section aria-labelledby={id} className="grid gap-4">
			<h2 id={id}>{title}</h2>
			{children}
		</section>
	);
}
