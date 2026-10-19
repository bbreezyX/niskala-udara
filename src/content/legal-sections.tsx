import { Fragment } from 'react';

/** One heading and its paragraph; the text lives in each language's content file, the markup only here. */
export interface LegalSection {
	title: string;
	body: React.ReactNode;
}

export function LegalSections({ sections }: { sections: readonly LegalSection[] }) {
	return sections.map(({ title, body }) => (
		<Fragment key={title}>
			<h2>{title}</h2>
			<p>{body}</p>
		</Fragment>
	));
}
