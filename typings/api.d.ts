declare global {
	interface MediaWikiPage {
		readonly pageid: number;
		readonly title: string;
		readonly ns: number;
		readonly revisions?: {
			readonly content: string;
			readonly contentmodel: string;
		}[];
	}
	interface SimplePage extends Pick<MediaWikiPage, 'pageid' | 'title' | 'ns'> {
		readonly content: string;
	}
	interface MediaWikiResponse {
		readonly query: {
			readonly pages: MediaWikiPage[];
		};
	}
}

export {};
