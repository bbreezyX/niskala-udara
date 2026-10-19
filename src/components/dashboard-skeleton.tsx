import { Skeleton } from '@/components/ui/skeleton';

/**
 * Stand-in for the dashboard while it waits on the URL's search params. Same sky panel and card grid
 * boxes, so the page does not jump when the real one replaces it.
 */
export function DashboardSkeleton() {
	return (
		<div aria-busy="true">
			<div className="page-frame pt-5">
				<div className="rounded-[20px] bg-linear-to-b from-sky to-sky/60 px-5 pt-10 pb-10 sm:rounded-[28px] sm:px-10 md:pt-14 lg:pb-28">
					<Skeleton className="h-12 w-64 max-w-full rounded-xl bg-card/60 sm:h-15 lg:h-18" />
					<Skeleton className="mt-3 h-6 w-80 max-w-full rounded-full bg-card/60 sm:h-7" />
					<Skeleton className="mt-6 h-11 w-48 rounded-full bg-card/60" />
				</div>
			</div>
			<div className="page-frame pt-6 lg:pt-12">
				<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-5">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-72 rounded-2xl" />
					))}
				</div>
			</div>
		</div>
	);
}
