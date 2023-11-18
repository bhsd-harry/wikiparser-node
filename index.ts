import * as fs from 'fs';
import * as path from 'path';
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

declare interface Parser {
	/** @browser */
	config: string | Config;
	/** @browser */
	i18n?: string | Record<string, string>;

	/** @private */
	readonly MAX_STAGE: number;

	/** @private */
	getConfig(this: Parser): Config;

	/** @private */
	msg(this: Parser, msg: string, arg?: string): string;

	/**
	 * 规范化页面标题
	 * @browser
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
	 * @browser
	 * @param include 是否嵌入
	 * @param maxStage 最大解析层级
	 */
	parse(wikitext: string, include?: boolean, maxStage?: number, config?: Config): Token;

	/** @private */
	run<T>(this: Parser, callback: () => T): T;
}

/**
 * 从根路径require
 * @param file 文件名
 * @param dir 子路径
 */
const rootRequire = (file: string, dir = ''): unknown => require(
	file.startsWith('/') ? file : `../${file.includes('/') ? '' : dir}${file}`,
);

// eslint-disable-next-line @typescript-eslint/no-redeclare
const Parser: Parser = {
	config: 'default',

	MAX_STAGE: 11,

	/** @implements */
	getConfig() {
		if (typeof this.config === 'string') {
			this.config = rootRequire(this.config, 'config/') as Config;
			return this.getConfig();
		}
		return {...this.config, excludes: []};
	},

	/** @implements */
	msg(msg, arg = '') {
		if (typeof this.i18n === 'string') {
			this.i18n = rootRequire(this.i18n, 'i18n/') as Record<string, string>;
			return this.msg(msg, arg);
		}
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
		const {Token}: typeof import('./src') = require('./src');
		const token = this.run(() => new Token(title, config).parseOnce(0, include).parseOnce()),
			titleObj = new Title(String(token.firstChild), defaultNs, config, decode, selfLink);
		return titleObj;
	},

	/** @implements */
	parse(wikitext, include, maxStage = Parser.MAX_STAGE, config = Parser.getConfig()) {
		const {Token}: typeof import('./src') = require('./src');
		let token: Token;
		this.run(() => {
			token = new Token(wikitext, config);
			try {
				token.parse(maxStage, include);
			} catch (e) {
				if (e instanceof Error) {
					const file = path.join(__dirname, '..', 'errors', new Date().toISOString()),
						stage = token.getAttribute('stage');
					fs.writeFileSync(file, stage === this.MAX_STAGE ? wikitext : String(token));
					fs.writeFileSync(`${file}.err`, e.stack!);
					fs.writeFileSync(`${file}.json`, JSON.stringify({
						stage, include: token.getAttribute('include'), config: this.config,
					}, null, '\t'));
				}
				throw e;
			}
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
	immutable = new Set(['MAX_STAGE']),
	enumerable = new Set(['config', 'normalizeTitle', 'parse']);
for (const key in Parser) {
	if (immutable.has(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!enumerable.has(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

export default Parser;
export type * from './internal';
