declare global {
	interface MediaWikiPage {
		readonly title: string;
		readonly ns: number;
		readonly revisions?: {
			readonly content: string;
			readonly contentmodel: string;
		}[];
	}
	interface SimplePage extends Pick<MediaWikiPage, 'title' | 'ns'> {
		readonly content: string;
	}
	interface MediaWikiResponse {
		readonly query: {
			readonly pages: MediaWikiPage[];
		};
	}
}

export {};
