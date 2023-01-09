import Token from '../src';
import $ from '../tool';
import Title from '../lib/title';

declare global {
	interface Parser {
		warning: boolean;
		debugging: boolean;

		/**
		 * 默认输出到console.warn
		 * @param {string} msg 消息
		 * @param {...any} args 更多信息
		 */
		warn(msg: string, ...args: any[]): void;
		/**
		 * 默认不输出到console.debug
		 * @param {string} msg 消息
		 * @param {...any} args 更多信息
		 */
		debug(msg: string, ...args: any[]): void;
		/**
		 * 总是输出到console.error
		 * @param {string} msg 消息
		 * @param {...any} args 更多信息
		 */
		error(msg: string, ...args: any[]): void;
		/**
		 * 总是输出到console.info
		 * @param {string} msg 消息
		 * @param {...any} args 更多信息
		 */
		info(msg: string, ...args: any[]): void;

		running: boolean;

		run<T>(callback: () => T): T;

		/** 只储存导出各个Class的文件路径 */
		classes: Record<string, string>;
		mixins: Record<string, string>;
		parsers: Record<string, string>;
		/** 清除各模块的缓存 */
		clearCache(): void;

		/**
		 * 打印函数定义
		 * @param {Function} f 待打印的函数
		 */
		log(f: Function): void;

		readonly aliases: string[][];

		config: string;
		/** 获取设置 */
		getConfig(): ParserConfig;

		/**
		 * 是否是跨维基链接
		 * @param {string} title 链接标题
		 */
		isInterwiki(title: string, config?: ParserConfig): RegExpMatchArray;
		/**
		 * 规范化页面标题
		 * @param {string} title 标题（含或不含命名空间前缀）
		 * @param {number} defaultNs 命名空间
		 * @param {boolean} include 是否嵌入
		 * @param {boolean} halfParsed 是否是半解析状态
		 */
		normalizeTitle(
			title: string, defaultNs?: number, include?: boolean, config?: ParserConfig, halfParsed?: boolean
		): Title;

		readonly MAX_STAGE: number;
		/**
		 * 解析wikitext
		 * @param {string|Token} wikitext wikitext
		 * @param {boolean} include 是否嵌入
		 * @param {number} maxStage 最大解析层级
		 */
		parse(wikitext: string|Token, include?: boolean, maxStage?: number, config?: ParserConfig): Token;
		/**
		 * 再次解析上次出错的wikitext
		 * @param {string} date 错误日期
		 */
		reparse(date: string): Token;

		getTool(): typeof $;

		readonly typeAliases: Record<string, string[]>;

		readonly promises: Promise<void>[];
	}
}

export {};
