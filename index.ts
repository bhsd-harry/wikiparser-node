/* eslint n/exports-style: 0 */
import * as fs from 'fs';
import * as path from 'path';
import {cmd} from './util/diff';
import {Shadow} from './util/debug';
import {
	MAX_STAGE,
	promises,
	classes,
	mixins,
	parsers,
	utils,
} from './util/constants';
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
	interwiki: string[];
	excludes?: string[];
	conversionTable?: [string, string][];
	redirects?: [string, string][];
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
	config: string | Config;
	i18n: string | Record<string, string> | undefined;

	/* NOT FOR BROWSER */

	conversionTable: Map<string, string>;
	redirects: Map<string, string>;

	warning: boolean;
	debugging: boolean;

	/* NOT FOR BROWSER END */

	/** @private */
	getConfig(): Config;

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

	/* NOT FOR BROWSER */

	/** @private */
	warn(msg: string, ...args: unknown[]): void;
	/** @private */
	debug(msg: string, ...args: unknown[]): void;
	/** @private */
	error(msg: string, ...args: unknown[]): void;
	/** @private */
	info(msg: string, ...args: unknown[]): void;

	/** @private */
	log(f: Function): void;

	/** @private */
	clearCache(): Promise<void>;

	/**
	 * 是否是跨维基链接
	 * @param title 链接标题
	 */
	isInterwiki(title: string, config?: Config): RegExpExecArray | null;

	/** @private */
	reparse(date: string): Token;
}

/**
 * 从根路径require
 * @param file 文件名
 * @param dir 子路径
 */
const rootRequire = (file: string, dir: string): unknown => require(
	file.startsWith('/') ? file : `../${file.includes('/') ? '' : dir}${file}`,
);

/**
 * 清理解析专用的不可见字符
 * @param text 源文本
 */
const tidy = (text: string): string => text.replace(/[\0\x7F]/gu, '');

// eslint-disable-next-line @typescript-eslint/no-redeclare
const Parser: Parser = {
	config: 'default',
	i18n: undefined,

	/* NOT FOR BROWSER */

	conversionTable: new Map(),
	redirects: new Map(),

	warning: true,
	debugging: false,

	/* NOT FOR BROWSER END */

	/** @implements */
	getConfig() {
		if (typeof this.config === 'string') {
			this.config = rootRequire(this.config, 'config/') as Config;
			const {config: {conversionTable, redirects}} = this;
			if (conversionTable) {
				this.conversionTable = new Map(conversionTable);
			}
			if (redirects) {
				this.redirects = new Map(redirects);
			}
			return this.getConfig();
		}
		return {
			...this.config,
			excludes: [],
		};
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
		const {Token}: typeof import('./src/index') = require('./src/index');
		const token = Shadow.run(() => new Token(title, config).parseOnce(0, include).parseOnce()),
			titleObj = new Title(String(token), defaultNs, config, decode, selfLink);
		Shadow.run(() => {
			for (const key of ['main', 'fragment'] as ('main' | 'fragment')[]) {
				if (titleObj[key]?.includes('\0')) {
					titleObj[key] = token.buildFromStr(titleObj[key]!, 'text');
				}
			}
		});
		titleObj.conversionTable = this.conversionTable;
		titleObj.redirects = this.redirects;
		return titleObj;
	},

	/** @implements */
	parse(wikitext, include, maxStage = MAX_STAGE, config = Parser.getConfig()) {
		const {Token}: typeof import('./src/index') = require('./src/index');
		const root = Shadow.run(() => {
			const token = new Token(tidy(wikitext), config);
			try {
				return token.parse(maxStage, include);
			} catch (e) {
				if (e instanceof Error) {
					const file = path.join(__dirname, '..', 'errors', new Date().toISOString()),
						stage = token.getAttribute('stage');
					fs.writeFileSync(file, stage === MAX_STAGE ? wikitext : String(token));
					fs.writeFileSync(`${file}.err`, e.stack!);
					fs.writeFileSync(`${file}.json`, JSON.stringify({
						stage, include: token.getAttribute('include'), config: this.config,
					}, null, '\t'));
				}
				throw e;
			}
		});
		if (this.debugging) {
			let restored = String(root),
				process = '解析';
			if (restored === wikitext) {
				const entities = {lt: '<', gt: '>', amp: '&'};
				restored = root.print().replace(
					/<[^<]+?>|&([lg]t|amp);/gu,
					(_, s?: 'lt' | 'gt' | 'amp') => s ? entities[s] : '',
				);
				process = '渲染HTML';
			}
			if (restored !== wikitext) {
				const {diff}: typeof import('./util/diff') = require('./util/diff');
				const {0: cur, length} = promises;
				promises.unshift((async (): Promise<void> => {
					await cur;
					this.error(`${process}过程中不可逆地修改了原始文本！`);
					return diff(wikitext, restored, length);
				})());
			}
		}
		return root;
	},

	/* NOT FOR BROWSER */

	/** @implements */
	warn(msg, ...args) {
		if (this.warning) {
			console.warn('\x1B[33m%s\x1B[0m', msg, ...args);
		}
	},
	/** @implements */
	debug(msg, ...args) {
		if (this.debugging) {
			console.debug('\x1B[34m%s\x1B[0m', msg, ...args);
		}
	},
	/** @implements */
	error(msg, ...args) {
		console.error('\x1B[31m%s\x1B[0m', msg, ...args);
	},
	/** @implements */
	info(msg, ...args) {
		console.info('\x1B[32m%s\x1B[0m', msg, ...args);
	},

	/** @implements */
	log(f) {
		if (typeof f === 'function') {
			console.log(String(f));
		}
	},

	/** @implements */
	async clearCache(): Promise<void> {
		const promise = cmd('npm', ['run', 'build']),
			entries = [
				...Object.entries(classes),
				...Object.entries(mixins),
				...Object.entries(parsers),
				...Object.entries(utils),
			];
		for (const [, filePath] of entries) {
			try {
				delete require.cache[require.resolve(filePath)];
			} catch {}
		}
		await promise;
		for (const [name, filePath] of entries) {
			if (name in global) {
				// @ts-expect-error noImplicitAny
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				global[name] = require(filePath)[name];
			}
		}
		this.info('已重新加载Parser');
	},

	/** @implements */
	isInterwiki(title, {interwiki} = Parser.getConfig()) {
		return new RegExp(`^(${interwiki.join('|')})\\s*:`, 'diu')
			.exec(title.replaceAll('_', ' ').replace(/^\s*:?\s*/u, ''));
	},

	/** @implements */
	reparse(date) {
		const main = fs.readdirSync(path.join(__dirname, '..', 'errors'))
			.find(name => name.startsWith(date) && name.endsWith('Z'));
		if (!main) {
			throw new RangeError(`找不到对应时间戳的错误记录：${date}`);
		}
		const file = path.join(__dirname, '..', 'errors', main),
			wikitext = fs.readFileSync(file, 'utf8');
		const {stage, include, config}: ParsingError = require(`${file}.json`),
			{Token}: typeof import('./src') = require('./src');
		this.config = config;
		return Shadow.run(() => {
			const halfParsed = stage < MAX_STAGE,
				token = new Token(halfParsed ? wikitext : tidy(wikitext), this.getConfig());
			if (halfParsed) {
				token.setAttribute('stage', stage);
				token.parseOnce(stage, include);
			} else {
				token.parse(undefined, include);
			}
			fs.unlinkSync(file);
			fs.unlinkSync(`${file}.err`);
			fs.unlinkSync(`${file}.json`);
			return token;
		});
	},
};

const def: PropertyDescriptorMap = {},
	enumerable = new Set([
		'conversionTable',
		'redirects',
		'warning',
		'debugging',
		'normalizeTitle',
		'parse',
		'isInterwiki',
	]);
for (const key in Parser) {
	if (!enumerable.has(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

// @ts-expect-error mixed export styles
export = Parser;
export type * from './internal';
