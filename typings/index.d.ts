import Token from '../src';
import Title from '../lib/title';

declare global {
	interface Parser {
		running: boolean;

		run<T>(callback: () => T): T;

		config: ParserConfig;
		/** 获取设置 */
		getConfig(): ParserConfig;

		/**
		 * 规范化页面标题
		 * @param {string} title 标题（含或不含命名空间前缀）
		 * @param {number} defaultNs 命名空间
		 */
		normalizeTitle(title: string, defaultNs?: number, config?: ParserConfig, halfParsed?: boolean): Title;

		readonly MAX_STAGE: number;
		/**
		 * 解析wikitext
		 * @param {string|Token} wikitext wikitext
		 * @param {boolean} include 是否嵌入
		 * @param {number} maxStage 最大解析层级
		 */
		parse(wikitext: string|Token, include?: boolean, maxStage?: number, config?: ParserConfig): Token;
		/**
		 * 以HTML格式显示wikitext
		 * @param {string} wikitext wikitext
		 * @param {boolean} include 是否嵌入
		 */
		print(wikitext: string, include?: boolean, config?: ParserConfig): string;
	}
}

export {};
