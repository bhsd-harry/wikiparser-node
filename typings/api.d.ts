declare global {
	interface MediaWikiPage {
		readonly title: string;
		readonly ns: number;
		readonly revisions?: {
			content: string;
			contentmodel: string;
		}[];
	}
	interface MediaWikiResponse {
		readonly query: {
			pages: MediaWikiPage[];
		};
	}
}

export {};
