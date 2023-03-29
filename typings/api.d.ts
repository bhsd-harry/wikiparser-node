interface MediaWikiRevision {
	content: string;
	contentmodel: string;
}
export interface MediaWikiPage {
	title: string;
	ns: number;
	revisions: MediaWikiRevision[];
}
