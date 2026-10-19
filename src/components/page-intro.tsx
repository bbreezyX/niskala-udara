export function PageIntro({ title, lead }: { title: string; lead?: string }) {
	return (
		<header>
			<h1 className="font-display text-4xl leading-[1.1] tracking-[-0.02em] text-balance sm:text-5xl">{title}</h1>
			{lead && <p className="mt-2 text-muted-foreground sm:text-lg">{lead}</p>}
		</header>
	);
}
