export function PageIntro({ title, lead }: { title: string; lead?: string }) {
	return (
		<header>
			<h1 className="font-display text-4xl leading-none tracking-[-0.02em] sm:text-5xl">{title}</h1>
			{lead && <p className="mt-2 text-muted-foreground sm:text-lg">{lead}</p>}
		</header>
	);
}
