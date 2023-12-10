import {Shadow} from './util/debug';
import {
	MAX_STAGE,
	minConfig,
} from './util/constants';
import type {Title} from './lib/title';
import type {Token} from './internal';
import type {
	Config,
	LintError,
	ParserBase,
} from './base';

declare interface Parser extends ParserBase {

	/** @private */
	msg(msg: string, arg?: string): string;

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
		config?: Config,
		halfParsed?: boolean,
		decode?: boolean,
		selfLink?: boolean,
	): Title;

	/**
	 * 解析wikitext
	 * @param include 是否嵌入
	 * @param maxStage 最大解析层级
	 */
	parse(wikitext: string, include?: boolean, maxStage?: number, config?: Config): Token;
}

/**
 * 清理解析专用的不可见字符
 * @param text 源文本
 */
const tidy = (text: string): string => text.replace(/[\0\x7F]/gu, '');

// eslint-disable-next-line @typescript-eslint/no-redeclare
const Parser: Parser = {
	i18n: undefined,

	/** @implements */
	getConfig() {
		return {
			...minConfig,
			...this.config,
			excludes: [],
		};
	},

	/** @implements */
	msg(msg, arg = '') {
		return (this.i18n?.[msg] ?? msg).replace('$1', arg);
	},

	/** @implements */
	normalizeTitle(
		title,
		defaultNs = 0,
		include = false,
		config = Parser.getConfig(),
		halfParsed = false,
		decode = false,
		selfLink = false,
	) {
		const {Title}: typeof import('./lib/title') = require('./lib/title');
		if (halfParsed) {
			return new Title(title, defaultNs, config, decode, selfLink);
		}
		const {Token}: typeof import('./src/index') = require('./src/index');
		const token = Shadow.run(() => new Token(title, config).parseOnce(0, include).parseOnce()),
			titleObj = new Title(String(token), defaultNs, config, decode, selfLink);
		return titleObj;
	},

	/** @implements */
	parse(wikitext, include, maxStage = MAX_STAGE, config = Parser.getConfig()) {
		const {Token}: typeof import('./src/index') = require('./src/index');
		const root = Shadow.run(() => {
			const token = new Token(tidy(wikitext), config);
			return token.parse(maxStage, include);
		});
		return root;
	},
};

const def: PropertyDescriptorMap = {},
	enumerable = new Set([
		'normalizeTitle',
		'parse',
	]);
for (const key in Parser) {
	if (!enumerable.has(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

if (typeof self === 'object') {
	Object.assign(self, {Parser});
/* eslint-disable es-x/no-global-this */
} else if (typeof globalThis === 'object') {
	Object.assign(globalThis, {Parser});
/* eslint-enable es-x/no-global-this */
}

export default Parser;
export type {Config, LintError};
