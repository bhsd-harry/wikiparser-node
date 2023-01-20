import Token from '../src';
import Title from '../lib/title';

declare global {
	interface Parser {
		config: ParserConfig;
		minConfig: ParserConfig;

		readonly MAX_STAGE: number;

		/** 获取设置 */
		getConfig(): ParserConfig;

		/**
		 * 规范化页面标题
		 * @param {string} title 标题（含或不含命名空间前缀）
		 * @param {number} defaultNs 命名空间
		 * @param {boolean} include 无用参数
		 * @param {boolean} halfParsed 是否是半解析状态
		 */
		normalizeTitle(
			title: string, defaultNs?: number, include?: boolean, config?: ParserConfig, halfParsed?: boolean
		): Title;
		/**
		 * 解析wikitext
		 * @param {string|Token} wikitext wikitext
		 * @param {boolean} include 是否嵌入
		 * @param {number} maxStage 最大解析层级
		 */
		parse(wikitext: string|Token, include?: boolean, maxStage?: number, config?: ParserConfig): Token;

		run<T>(callback: () => T): T;

		/**
		 * 生成语法错误
		 * @param {string} wikitext wikitext
		 * @param {boolean} include 是否嵌入
		 */
		lint(wikitext: string, include?: boolean, config?: ParserConfig): LintError[];

		/**
		 * @param {string} msg 消息
		 * @param {...*} args 更多信息
		 */
		debug(msg: string, ...args: *[]): void;
		/**
		 * 总是输出到console.error
		 * @param {string} msg 消息
		 * @param {...*} args 更多信息
		 */
		error(msg: string, ...args: *[]): void;
	}
}

export {};
