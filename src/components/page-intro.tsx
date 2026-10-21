export function PageIntro({ title, lead }: { title: string; lead?: string }) {
	return (
		<header>
			<h1 className="page-title">{title}</h1>
			{lead && <p className="body-copy mt-3 max-w-prose text-pretty text-muted-foreground sm:text-lg">{lead}</p>}
		</header>
	);
}
