import Token from '../src';
import $ from '../tool';
import Title from '../lib/title';

declare global {
	interface Parser {
		config: string|ParserConfig;

		readonly MAX_STAGE: number;

		warning: boolean;
		debugging: boolean;
		running: boolean;

		/** 只储存导出各个Class的文件路径 */
		classes: Record<string, string>;
		mixins: Record<string, string>;
		parsers: Record<string, string>;
		tool: {$: string};

		readonly aliases: string[][];
		readonly typeAliases: Record<string, string[]>;

		readonly promises: Promise<void>[];

		/** 获取设置 */
		getConfig(): ParserConfig;

		/**
		 * 规范化页面标题
		 * @param title 标题（含或不含命名空间前缀）
		 * @param defaultNs 命名空间
		 * @param include 是否嵌入
		 * @param halfParsed 是否是半解析状态
		 * @param decode 是否需要解码
		 * @param selfLink 是否允许selfLink
		 */
		normalizeTitle(
			title: string,
			defaultNs?: number,
			include?: boolean,
			config?: ParserConfig,
			halfParsed?: boolean,
			decode?: boolean,
			selfLink?: boolean,
		): Title;

		/**
		 * 解析wikitext
		 * @param wikitext wikitext
		 * @param include 是否嵌入
		 * @param maxStage 最大解析层级
		 */
		parse(wikitext: string, include?: boolean, maxStage?: number, config?: ParserConfig): Token;

		run<T>(callback: () => T): T;

		/**
		 * 默认输出到console.warn
		 * @param msg 消息
		 * @param args 更多信息
		 */
		warn(msg: string, ...args: *[]): void;
		/**
		 * 默认不输出到console.debug
		 * @param msg 消息
		 * @param args 更多信息
		 */
		debug(msg: string, ...args: *[]): void;
		/**
		 * 总是输出到console.error
		 * @param msg 消息
		 * @param args 更多信息
		 */
		error(msg: string, ...args: *[]): void;
		/**
		 * 总是输出到console.info
		 * @param msg 消息
		 * @param args 更多信息
		 */
		info(msg: string, ...args: *[]): void;

		/**
		 * 打印函数定义
		 * @param f 待打印的函数
		 */
		log(f: Function): void;

		/** 清除各模块的缓存 */
		clearCache(): void;

		/**
		 * 是否是跨维基链接
		 * @param title 链接标题
		 */
		isInterwiki(title: string, config?: ParserConfig): RegExpMatchArray;

		/**
		 * 再次解析上次出错的wikitext
		 * @param date 错误日期
		 */
		reparse(date: string): Token;

		getTool(): typeof $;
	}
}

export {};
