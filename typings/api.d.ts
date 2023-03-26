declare global {
	interface MediaWikiRevision {
		content: string;
		contentmodel: string;
	}
	interface MediaWikiPage {
		title: string;
		ns: number;
		revisions: MediaWikiRevision[];
	};
}

export {};
