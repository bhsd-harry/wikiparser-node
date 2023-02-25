import Token from '../src';
import Title from '../lib/title';

declare global {
	interface Parser {
		config: string|ParserConfig;
		i18n: string|Record<string, string>;

		readonly MAX_STAGE: number;

		/** 获取设置 */
		getConfig(): ParserConfig;

		/**
		 * 生成I18N消息
		 * @param msg 消息名
		 * @param arg 额外参数
		 */
		msg(msg: string, arg: string): string;

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
	}
}

export {};
