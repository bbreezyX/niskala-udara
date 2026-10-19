'use client';

import { House, Map as MapIcon } from 'lucide-react';
import { ErrorScene } from '@/components/error-scene';
import { Link } from '@/components/link';
import { useDictionary } from '@/components/locale-provider';
import { Button } from '@/components/ui/button';

/** Unknown URLs (via [...missing]) and notFound() calls, such as an unknown city id. */
export default function NotFound() {
	const t = useDictionary();
	return (
		<ErrorScene code="404" title={t.errorPage.notFound.title} description={t.errorPage.notFound.description}>
			<Button asChild size="lg" className="h-11 rounded-full px-5">
				<Link href="/">
					<House data-icon="inline-start" />
					{t.common.backToOverview}
				</Link>
			</Button>
			<Button asChild size="lg" variant="outline" className="h-11 rounded-full bg-card px-5">
				<Link href="/map">
					<MapIcon data-icon="inline-start" />
					{t.nav.map}
				</Link>
			</Button>
		</ErrorScene>
	);
}
