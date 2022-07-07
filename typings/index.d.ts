import Token from '../src';
import $ from '../tool';
import Title from '../lib/title';

declare global {
	interface Parser {
		running: boolean;

		run<T>(callback: () => T): T;

		config: string;
		getConfig(): ParserConfig;

		isInterwiki(title: string, config?: ParserConfig): RegExpMatchArray;
		normalizeTitle(
			title: string, defaultNs?: number, include?: boolean, config?: ParserConfig, halfParsed?: boolean
		): Title;

		readonly MAX_STAGE: number;
		parse(wikitext: string|Token, include?: boolean, maxStage?: number, config?: ParserConfig): Token;
	}
}

export {};
