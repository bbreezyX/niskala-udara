'use client';

import { useEffect } from 'react';
import { House, RotateCw } from 'lucide-react';
import { ErrorScene } from '@/components/error-scene';
import { Link } from '@/components/link';
import { useDictionary } from '@/components/locale-provider';
import { Button } from '@/components/ui/button';

/** A page that threw while rendering. The header and footer stay, so the reader is never stranded. */
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
	const t = useDictionary();

	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<ErrorScene code="500" title={t.errorPage.failed.title} description={t.errorPage.failed.description}>
			<Button size="lg" className="h-11 rounded-full px-5" onClick={() => retry()}>
				<RotateCw data-icon="inline-start" />
				{t.common.retry}
			</Button>
			<Button asChild size="lg" variant="outline" className="h-11 rounded-full bg-card px-5">
				<Link href="/">
					<House data-icon="inline-start" />
					{t.common.backToOverview}
				</Link>
			</Button>
		</ErrorScene>
	);
}
