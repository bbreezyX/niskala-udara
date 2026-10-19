'use client';

import { LazyMotion, MotionConfig } from 'motion/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';
import { LocaleProvider } from './locale-provider';

/** Motion's features arrive in their own chunk once the page has hydrated; until then elements render in their initial state. */
const loadMotionFeatures = () => import('./motion-features').then((features) => features.default);

export function Providers({
	locale,
	dictionary,
	children
}: {
	locale: Locale;
	dictionary: Dictionary;
	children: React.ReactNode;
}) {
	return (
		<LocaleProvider locale={locale} dictionary={dictionary}>
			{/* strict: a full `motion` component would quietly bring back the bundle this saves. */}
			<LazyMotion features={loadMotionFeatures} strict>
				<MotionConfig reducedMotion="user">
					<TooltipProvider>{children}</TooltipProvider>
				</MotionConfig>
			</LazyMotion>
		</LocaleProvider>
	);
}
