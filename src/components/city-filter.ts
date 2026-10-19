/** Substring match on the name and reference point: fuzzy matching surfaces unrelated places. */
export function filterCities(_: string, query: string, keywords: string[] = []) {
	const needle = query.trim().toLocaleLowerCase('id');
	return keywords.some((keyword) => keyword.toLocaleLowerCase('id').includes(needle)) ? 1 : 0;
}
