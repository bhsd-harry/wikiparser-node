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
	/** @browser */
	config: string | Config;
	/** @browser */
	i18n: string | Record<string, string> | undefined;
	conversionTable: Map<string, string>;
	redirects: Map<string, string>;

	/** @private */
	readonly MAX_STAGE: number;

	/** @private */
	warning: boolean;
	/** @private */
	debugging: boolean;
	/** @private */
	running: boolean;

	/** @private */
	classes: Record<string, string>;
	/** @private */
	mixins: Record<string, string>;
	/** @private */
	parsers: Record<string, string>;

	/** @private */
	readonly aliases: string[][];
	/** @private */
	readonly typeAliases: Record<string, string[] | undefined>;

	/** @private */
	readonly promises: Promise<void>[];

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

	/** @private */
	warn(this: Parser, msg: string, ...args: unknown[]): void;
	/** @private */
	debug(this: Parser, msg: string, ...args: unknown[]): void;
	/** @private */
	error(msg: string, ...args: unknown[]): void;
	/** @private */
	info(msg: string, ...args: unknown[]): void;

	/** @private */
	log(f: Function): void;

	/** @private */
	clearCache(this: Parser): void;

	/**
	 * 是否是跨维基链接
	 * @param title 链接标题
	 */
	isInterwiki(title: string, config?: Config): [string, string] | null;

	/** @private */
	reparse(date: string): Token;
}

/**
 * 从根路径require
 * @param file 文件名
 * @param dir 子路径
 */
const rootRequire = (file: string, dir = ''): unknown => require(`../${file.includes('/') ? '' : dir}${file}`);

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Parser: Parser = {
	config: 'default',
	i18n: undefined,
	conversionTable: new Map(),
	redirects: new Map(),

	MAX_STAGE: 11,

	warning: true,
	debugging: false,
	running: false,

	classes: {},
	mixins: {},
	parsers: {},

	aliases: [
		['AstText'],
		['CommentToken', 'ExtToken', 'IncludeToken', 'NoincludeToken'],
		['ArgToken', 'TranscludeToken', 'HeadingToken'],
		['HtmlToken'],
		['TableToken'],
		['HrToken', 'DoubleUnderscoreToken'],
		['LinkToken', 'FileToken', 'CategoryToken'],
		['QuoteToken'],
		['ExtLinkToken'],
		['MagicLinkToken'],
		['ListToken', 'DdToken'],
		['ConverterToken'],
	],
	typeAliases: {
		text: ['string', 'str'],
		plain: ['regular', 'normal'],
		// comment and extension
		onlyinclude: ['only-include'],
		noinclude: ['no-include'],
		include: ['includeonly', 'include-only'],
		comment: undefined,
		ext: ['extension'],
		'ext-attrs': ['extension-attrs', 'ext-attributes', 'extension-attributes'],
		'ext-attr-dirty': ['extension-attr-dirty', 'ext-attribute-dirty', 'extension-attribute-dirty'],
		'ext-attr': ['extension-attr', 'ext-attribute', 'extension-attribute'],
		'attr-key': ['attribute-key'],
		'attr-value': ['attribute-value', 'attr-val', 'attribute-val'],
		'ext-inner': ['extension-inner'],
		// triple brackets
		arg: ['argument'],
		'arg-name': ['argument-name'],
		'arg-default': ['argument-default'],
		hidden: ['arg-redundant'],
		// double brackets
		'magic-word': ['parser-function', 'parser-func'],
		'magic-word-name': ['parser-function-name', 'parser-func-name'],
		'invoke-function': ['invoke-func', 'lua-function', 'lua-func', 'module-function', 'module-func'],
		'invoke-module': ['lua-module'],
		template: undefined,
		'template-name': undefined,
		parameter: ['param'],
		'parameter-key': ['param-key'],
		'parameter-value': ['parameter-val', 'param-value', 'param-val'],
		// heading
		heading: ['header'],
		'heading-title': ['header-title'],
		'heading-trail': ['header-trail'],
		// html
		html: undefined,
		'html-attrs': ['html-attributes'],
		'html-attr-dirty': ['html-attribute-dirty'],
		'html-attr': ['html-attribute'],
		// table
		table: undefined,
		tr: ['table-row'],
		td: ['table-cell', 'table-data'],
		'table-syntax': undefined,
		'table-attrs': ['tr-attrs', 'td-attrs', 'table-attributes', 'tr-attributes', 'td-attributes'],
		'table-attr-dirty':
			['tr-attr-dirty', 'td-attr-dirty', 'table-attribute-dirty', 'tr-attribute-dirty', 'td-attribute-dirty'],
		'table-attr': ['tr-attr', 'td-attr', 'table-attribute', 'tr-attribute', 'td-attribute'],
		'table-inter': undefined,
		'td-inner': ['table-cell-inner', 'table-data-inner'],
		// hr and double-underscore
		hr: ['horizontal'],
		'double-underscore': ['underscore', 'behavior-switch', 'behaviour-switch'],
		// link
		link: ['wikilink'],
		'link-target': ['wikilink-target'],
		'link-text': ['wikilink-text'],
		category: ['category-link', 'cat', 'cat-link'],
		file: ['file-link', 'image', 'image-link', 'img', 'img-link'],
		'gallery-image': ['gallery-file', 'gallery-img'],
		'imagemap-image': ['imagemap-file', 'imagemap-img', 'image-map-image', 'image-map-file', 'image-map-img'],
		'image-parameter': ['img-parameter', 'image-param', 'img-param'],
		// quotes
		quote: ['quotes', 'quot', 'apostrophe', 'apostrophes', 'apos'],
		// external link
		'ext-link': ['external-link'],
		'ext-link-text': ['external-link-text'],
		'ext-link-url': ['external-link-url'],
		// magic link
		'free-ext-link': ['free-external-link', 'magic-link'],
		// list
		list: ['ol', 'ordered-list', 'ul', 'unordered-list', 'dl', 'description-list'],
		dd: ['indent', 'indentation'],
		// converter
		converter: ['convert', 'conversion'],
		'converter-flags': ['convert-flags', 'conversion-flags'],
		'converter-flag': ['convert-flag', 'conversion-flag'],
		'converter-rule': ['convert-rule', 'conversion-rule'],
		'converter-rule-noconvert': ['convert-rule-noconvert', 'conversion-rule-noconvert'],
		'converter-rule-variant': ['convert-rule-variant', 'conversion-rule-variant'],
		'converter-rule-to': ['convert-rule-to', 'conversion-rule-to'],
		'converter-rule-from': ['convert-rule-from', 'conversion-rule-from'],
		// specific extensions
		'param-line': ['parameter-line'],
		'imagemap-link': ['image-map-link'],
	},

	promises: [Promise.resolve()],

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
		this.run(() => {
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
	parse(wikitext, include, maxStage = Parser.MAX_STAGE, config = Parser.getConfig()) {
		if (typeof wikitext !== 'string') {
			throw new TypeError('待解析的内容应为 String！');
		}
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
		if (this.debugging) {
			let restored = String(token!),
				process = '解析';
			if (restored === wikitext) {
				const entities = {lt: '<', gt: '>', amp: '&'};
				restored = token!.print().replace(
					/<[^<]+?>|&([lg]t|amp);/gu,
					(_, s?: 'lt' | 'gt' | 'amp') => s ? entities[s] : '',
				);
				process = '渲染HTML';
			}
			if (restored !== wikitext) {
				const {diff}: typeof import('./util/diff') = require('./util/diff');
				const {promises: {0: cur, length}} = this;
				this.promises.unshift((async (): Promise<void> => {
					await cur;
					this.error(`${process}过程中不可逆地修改了原始文本！`);
					return diff(wikitext, restored, length);
				})());
			}
		}
		return token!;
	},

	/** @implements */
	run(callback) {
		const {running} = this;
		this.running = true;
		try {
			const result = callback();
			this.running = running;
			return result;
		} catch (e) {
			this.running = running;
			throw e;
		}
	},

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
	clearCache() {
		const entries = [
			...Object.entries(this.classes),
			...Object.entries(this.mixins),
			...Object.entries(this.parsers),
		];
		for (const [, filePath] of entries) {
			try {
				delete require.cache[require.resolve(filePath)];
			} catch {}
		}
		for (const [name, filePath] of entries) {
			if (name in global) {
				// @ts-expect-error noImplicitAny
				global[name] = require(filePath);
			}
		}
	},

	/** @implements */
	isInterwiki(title, {interwiki} = Parser.getConfig()) {
		return new RegExp(`^(${interwiki.join('|')})\\s*:`, 'iu')
			.exec(title.replaceAll('_', ' ').replace(/^\s*:?\s*/u, '')) as [string, string] | null;
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
		const {stage, include, config}: {stage: number, include: boolean, config: Config} = require(`${file}.json`),
			{Token}: typeof import('./src') = require('./src');
		this.config = config;
		return this.run(() => {
			const halfParsed = stage < this.MAX_STAGE,
				token = new Token(wikitext, this.getConfig(), halfParsed);
			if (halfParsed) {
				token.setAttribute('stage', stage).parseOnce(stage, include);
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
	immutable = new Set(['MAX_STAGE', 'aliases', 'typeAliases', 'promises']),
	enumerable = new Set(['config', 'conversionTable', 'redirects', 'normalizeTitle', 'parse', 'isInterwiki']);
for (const key in Parser) {
	if (immutable.has(key)) {
		def[key] = {enumerable: false, writable: false};
	} else if (!enumerable.has(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

export type * from './internal';
