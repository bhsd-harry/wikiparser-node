import type {Title} from './lib/title';
import type {Token} from './internal';

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
	excludes?: string[];
	inExt?: boolean;
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
}

declare interface Parser {
	config?: Config;
	minConfig: Config;
	i18n?: Record<string, string>;

	/** @private */
	readonly MAX_STAGE: number;

	/** @private */
	getConfig(this: Parser): Config;

	/** @private */
	msg(this: Parser, msg: string, arg?: string): string;

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

	/** @private */
	run<T>(this: Parser, callback: () => T): T;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
const Parser: Parser = {
	minConfig: require('./config/minimum'),

	MAX_STAGE: 11,

	/** @implements */
	getConfig() {
		return {...this.minConfig, ...this.config, excludes: []};
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
		const token = this.run(() => new Token(title, config).parseOnce(0, include).parseOnce()),
			titleObj = new Title(String(token), defaultNs, config, decode, selfLink);
		return titleObj;
	},

	/** @implements */
	parse(wikitext, include, maxStage = Parser.MAX_STAGE, config = Parser.getConfig()) {
		const {Token}: typeof import('./src/index') = require('./src/index');
		let token: Token;
		this.run(() => {
			token = new Token(wikitext.replace(/[\0\x7F]/gu, ''), config);
			try {
				token.parse(maxStage, include);
			} catch {}
		});
		return token!;
	},

	/** @implements */
	run(callback) {
		const result = callback();
		return result;
	},
};

const def: PropertyDescriptorMap = {},
	immutable = new Set(['MAX_STAGE', 'minConfig']),
	enumerable = new Set(['config', 'normalizeTitle', 'parse']);
for (const key in Parser) {
	if (immutable.has(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!enumerable.has(key)) {
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
