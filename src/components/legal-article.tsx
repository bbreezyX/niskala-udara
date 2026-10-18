/** Long-form text page: readable measure, spaced headings, underlined links. */
export function LegalArticle({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
	return (
		<article className="mx-auto grid max-w-3xl gap-4 px-4 pt-10 sm:px-6 [&_a]:text-primary [&_a]:underline [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:text-foreground/85">
			<header className="mb-2">
				<h1 className="font-display text-4xl leading-none tracking-[-0.02em] sm:text-5xl">{title}</h1>
				<p className="mt-2 text-sm text-muted-foreground">Terakhir diperbarui: {updated}</p>
			</header>
			{children}
		</article>
	);
}
