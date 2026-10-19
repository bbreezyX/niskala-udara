import { use } from 'react';
import type * as Recharts from 'recharts';

let pending: Promise<typeof Recharts> | undefined;

/** One download for every chart; the shared promise is what lets `use` read it again without suspending. */
function loadRecharts(): Promise<typeof Recharts> {
	pending ??= import('recharts');
	return pending;
}

/**
 * recharts is the heaviest client dependency, so it arrives with the first chart instead of with the page.
 * Suspends until loaded: render charts inside a <Suspense> whose fallback holds the chart's size.
 */
export function useRecharts(): typeof Recharts {
	return use(loadRecharts());
}
