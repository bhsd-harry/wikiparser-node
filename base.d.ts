export interface Config {
	ext: string[];
	html: [string[], string[], string[]];
	namespaces: Record<string, string>;
	nsid: Record<string, number>;
	parserFunction: [Record<string, string>, string[], string[], string[]];
	doubleUnderscore: [string[], string[]];
	protocol: string;
	img: Record<string, string>;
	variants: string[];
	interwiki: string[];
	excludes?: string[];
	conversionTable?: [string, string][];
	redirects?: [string, string][];
}

export interface LintError {
	message: string;
	severity: 'error' | 'warning';
	startIndex: number;
	endIndex: number;
	startLine: number;
	startCol: number;
	endLine: number;
	endCol: number;
	excerpt: string;
}

export interface ParserBase {
	config: string | Config;
	i18n: string | Record<string, string> | undefined;

	/** @private */
	getConfig(): Config;
}
