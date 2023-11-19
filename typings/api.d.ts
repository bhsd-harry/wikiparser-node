declare global {
	interface MediaWikiPage {
		title: string;
		ns: number;
		revisions?: {
			content: string;
			contentmodel: string;
		}[];
	}
	interface MediaWikiResponse {
		query: {
			pages: MediaWikiPage[];
		};
	}
}

export {};
