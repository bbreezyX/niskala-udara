/** Shared markup for the About page, so each language file holds only its words. */
export function AboutHeader({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<header>
			<h1 className="page-title text-5xl sm:text-6xl">{title}</h1>
			<p className="body-copy mt-4 max-w-prose text-pretty sm:text-lg">{children}</p>
		</header>
	);
}

/** Section ids are shared across languages, so an anchor link works in either one. */
export function AboutSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
	return (
		<section aria-labelledby={id} className="grid gap-4">
			<h2 id={id} className="section-title">{title}</h2>
			{children}
		</section>
	);
}
