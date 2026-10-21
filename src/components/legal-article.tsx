import { dateTimeFormat } from '@/lib/date-format';
import { fill, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/server';

const UPDATED_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };

/** Long-form text page: readable measure, spaced headings, underlined links. `updated` is an ISO date. */
export function LegalArticle({
	locale,
	title,
	updated,
	children
}: {
	locale: Locale;
	title: string;
	updated: string;
	children: React.ReactNode;
}) {
	const { legal } = getDictionary(locale);
	const date = dateTimeFormat(locale, UPDATED_FORMAT).format(new Date(updated));

	return (
		<article className="body-copy mx-auto grid max-w-3xl gap-4 px-4 pt-10 text-foreground/85 sm:px-6 [&_a]:text-primary [&_a]:underline [&_h2]:mt-5 [&_p]:max-w-prose">
			<header className="mb-2">
				<h1 className="page-title">{title}</h1>
				<p className="meta-copy mt-3 text-muted-foreground">{fill(legal.updated, { date })}</p>
				{legal.translationNote && <p className="body-copy mt-4 rounded-xl bg-muted px-4 py-3 text-muted-foreground">{legal.translationNote}</p>}
			</header>
			{children}
		</article>
	);
}
