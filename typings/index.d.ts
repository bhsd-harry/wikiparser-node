import Token from '../src';
import $ from '../tool';

declare global {
	interface Parser {
		warning: boolean;
		debugging: boolean;

		/** 默认输出到console.warn */
		warn(msg: string, ...args: any[]): void;
		/** 默认不输出到console.debug */
		debug(msg: string, ...args: any[]): void;
		/** 总是输出到console.error */
		error(msg: string, ...args: any[]): void;
		/** 总是输出到console.info */
		info(msg: string, ...args: any[]): void;

		running: boolean;

		run<T>(callback: () => T): T;

		/** 只储存导出各个Class的文件路径 */
		classes: Record<string, string>;
		mixins: Record<string, string>;
		parsers: Record<string, string>;
		/** 清除各模块的缓存 */
		clearCache(): void;

		readonly aliases: string[][];

		config: string;
		getConfig(): ParserConfig;

		isInterwiki(title: string): RegExpMatchArray;
		normalizeTitle(title: string, defaultNs?: number): string;

		readonly MAX_STAGE: number;
		parse(wikitext: string|Token, include?: boolean, maxStage?: number, config?: ParserConfig): Token;

		getTool(): typeof $;
	}
}

export {};
