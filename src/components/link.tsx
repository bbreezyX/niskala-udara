'use client';

import NextLink from 'next/link';
import { useLocalePath } from './locale-provider';

/** next/link that keeps the reader in their language: internal string hrefs gain the active locale prefix. */
export function Link({ href, ...props }: React.ComponentProps<typeof NextLink>) {
	const localize = useLocalePath();
	return <NextLink href={typeof href === 'string' ? localize(href) : href} {...props} />;
}
