'use client';

import { MotionConfig } from 'motion/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';
import { LocaleProvider } from './locale-provider';

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
			<MotionConfig reducedMotion="user">
				<TooltipProvider>{children}</TooltipProvider>
			</MotionConfig>
		</LocaleProvider>
	);
}
