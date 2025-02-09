/* eslint n/exports-style: 0 */
import * as fs from 'fs';
import * as path from 'path';
import {rules, stages} from './base';
import {Shadow} from './util/debug';
import {
	MAX_STAGE,
	BuildMethod,

	/* NOT FOR BROWSER */

	classes,
} from './util/constants';
import {tidy} from './util/string';
import {
	error,

	/* NOT FOR BROWSER */

	cmd,
	info,
	diff,
} from './util/diff';
import type {
	Config,
	LintError,
	TokenTypes,
	Parser as ParserBase,
	Stage,
	AST,
} from './base';
import type {Title} from './lib/title';
import type {LanguageService} from './lib/lsp';
import type {Token} from './internal';

/* NOT FOR BROWSER */

import * as chalk from 'chalk';
import type {log} from './util/diff';

/* NOT FOR BROWSER END */

declare interface Parser extends ParserBase {
	rules: readonly LintError.Rule[];

	/* NOT FOR BROWSER */

	viewOnly: boolean;

	conversionTable: Map<string, string>;
	redirects: Map<string, string>;

	templateDir?: string;
	templates: Map<string, string>;

	warning: boolean;
	debugging: boolean;

	/* NOT FOR BROWSER END */

	/** @private */
	msg(msg: string, arg?: string): string;

	/**
	 * 规范化页面标题
	 * @param title 标题（含或不含命名空间前缀）
	 * @param defaultNs 命名空间
	 * @param include 是否嵌入
	 */
	normalizeTitle(title: string, defaultNs?: number, include?: boolean, config?: Config): Title;
	/** @private */
	normalizeTitle(
		title: string,
		defaultNs?: number,
		include?: boolean,
		config?: Config,
		halfParsed?: boolean,
		decode?: boolean,
		selfLink?: boolean, // eslint-disable-line @typescript-eslint/unified-signatures
	): Title;

	parse(wikitext: string, include?: boolean, maxStage?: number | Stage | Stage[], config?: Config): Token;

	/**
	 * 创建语言服务
	 * @param uri 文档标识
	 */
	createLanguageService(uri: object): LanguageService;

	/* NOT FOR BROWSER */

	/** @private */
	warn: log;
	/** @private */
	debug: log;
	/** @private */
	error: log;
	/** @private */
	info: log;

	/** @private */
	log(f: Function): void;

	/** @private */
	require(file: string): unknown;

	/** @private */
	clearCache(): Promise<void>;

	/**
	 * 是否是跨维基链接
	 * @param title 链接标题
	 */
	isInterwiki(title: string, config?: Config): RegExpExecArray | null;

	/** @private */
	reparse(date?: string): void;
}

/**
 * 从根路径require
 * @param file 文件名
 * @param dir 子路径
 */
const rootRequire = (file: string, dir: string): unknown => require(
	path.isAbsolute(file) ? /* istanbul ignore next */ file : path.join('..', file.includes('/') ? '' : dir, file),
);

/* NOT FOR BROWSER */

/**
 * 快速规范化页面标题
 * @param title 标题
 */
const normalizeTitle = (title: string): string => String(Parser.normalizeTitle(title));

/** 重定向列表 */
class RedirectMap extends Map<string, string> {
	/** @ignore */
	constructor(entries?: Iterable<[string, string]>) {
		super();
		if (entries) {
			for (const [k, v] of entries) {
				this.set(k, v);
			}
		}
	}

	override set(key: string, value: string): this {
		return super.set(normalizeTitle(key), normalizeTitle(value));
	}
}

const promises = [Promise.resolve()];
let viewOnly = false,
	redirectMap = new RedirectMap();

/* NOT FOR BROWSER END */

const Parser: Parser = { // eslint-disable-line @typescript-eslint/no-redeclare
	config: 'default',
	i18n: undefined,
	rules,

	/* NOT FOR BROWSER */

	/** @implements */
	get viewOnly() {
		return viewOnly;
	},

	set viewOnly(value) {
		if (viewOnly && !value) {
			Shadow.rev++;
		}
		viewOnly = value;
	},

	/** @implements */
	get redirects() {
		return redirectMap;
	},

	set redirects(redirects: Map<string, string>) {
		redirectMap = new RedirectMap(redirects);
	},

	conversionTable: new Map(),

	templates: new Map(),

	warning: true,
	debugging: false,

	/* NOT FOR BROWSER END */

	/** @implements */
	getConfig() {
		if (typeof this.config === 'string') {
			this.config = rootRequire(this.config, 'config') as Config;
			/* istanbul ignore if */
			if (this.config.doubleUnderscore.length < 3 || Array.isArray(this.config.parserFunction[1])) {
				error(
					`The schema (${
						path.resolve(__dirname, '..', 'config', '.schema.json')
					}) of parser configuration is updated.`,
				);
			}

			/* NOT FOR BROWSER */

			const {config: {conversionTable, redirects}} = this;
			/* istanbul ignore if */
			if (conversionTable) {
				this.conversionTable = new Map(conversionTable);
			}
			/* istanbul ignore if */
			if (redirects) {
				this.redirects = new Map(redirects);
			}

			/* NOT FOR BROWSER END */

			return this.getConfig();
		}
		const {doubleUnderscore} = this.config;
		for (let i = 0; i < 2; i++) {
			if (doubleUnderscore.length > i + 2 && doubleUnderscore[i]!.length === 0) {
				doubleUnderscore[i] = Object.keys(doubleUnderscore[i + 2]!);
			}
		}
		return {
			...this.config,
			excludes: [],
		};
	},

	/** @implements */
	msg(msg, arg = '') {
		if (typeof this.i18n === 'string') {
			this.i18n = rootRequire(this.i18n, 'i18n') as Record<string, string>;
			return this.msg(msg, arg);
		}
		return msg && (this.i18n?.[msg] ?? msg).replace('$1', this.msg(arg));
	},

	/** @implements */
	normalizeTitle(
		title,
		defaultNs = 0,
		include?: boolean,
		config = Parser.getConfig(),
		halfParsed?: boolean,
		decode: boolean = false,
		selfLink: boolean = false,
	) {
		const {Title}: typeof import('./lib/title') = require('./lib/title');
		let titleObj: Title;
		if (halfParsed) {
			titleObj = new Title(title, defaultNs, config, decode, selfLink);
		} else {
			const {Token}: typeof import('./src/index') = require('./src/index');
			titleObj = Shadow.run(() => {
				const root = new Token(title, config);
				root.type = 'root';
				root.parseOnce(0, include).parseOnce();
				const t = new Title(root.toString(), defaultNs, config, decode, selfLink);
				for (const key of ['main', 'fragment'] as const) {
					const str = t[key];
					if (str?.includes('\0')) {
						const s = root.buildFromStr(str, BuildMethod.Text);
						if (key === 'main') {
							t.main = s;
						} else {
							t.setFragment(s);
						}
					}
				}
				return t;
			});
		}

		/* NOT FOR BROWSER */

		titleObj.conversionTable = this.conversionTable;
		titleObj.redirects = this.redirects;

		/* NOT FOR BROWSER END */

		return titleObj;
	},

	/** @implements */
	parse(wikitext, include, maxStage = MAX_STAGE, config = Parser.getConfig()) {
		wikitext = tidy(wikitext);
		if (typeof maxStage !== 'number') {
			const types = Array.isArray(maxStage) ? maxStage : [maxStage];
			maxStage = Math.max(...types.map(t => stages[t] || MAX_STAGE));
		}
		const {Token}: typeof import('./src/index') = require('./src/index');
		const root = Shadow.run(() => {
			const token = new Token(wikitext, config);
			token.type = 'root';
			try {
				return token.parse(maxStage, include);
			} catch (e) /* istanbul ignore next */ {
				if (e instanceof Error) {
					const file = path.join(__dirname, '..', 'errors', new Date().toISOString()),
						stage = token.getAttribute('stage');
					for (const k in config) {
						if (k.startsWith('regex') || config[k as keyof Config] instanceof Set) {
							delete config[k as keyof Config];
						}
					}
					fs.writeFileSync(file, stage === MAX_STAGE ? wikitext : token.toString());
					fs.writeFileSync(`${file}.err`, e.stack!);
					fs.writeFileSync(`${file}.json`, JSON.stringify({stage, include, config}, null, '\t'));
				}
				throw e;
			}
		});

		/* NOT FOR BROWSER */

		/* istanbul ignore if */
		if (this.debugging) {
			let restored = root.toString(),
				process = 'parsing';
			if (restored === wikitext) {
				const entities = {lt: '<', gt: '>', amp: '&'};
				restored = root.print().replace(
					/<[^<]+?>|&([lg]t|amp);/gu,
					(_, s?: keyof typeof entities) => s ? entities[s] : '',
				);
				process = 'printing';
			}
			if (restored !== wikitext) {
				const {0: cur, length} = promises;
				promises.unshift((async (): Promise<void> => {
					await cur;
					this.error(`Original wikitext is altered when ${process}!`);
					return diff(wikitext, restored, length);
				})());
			}
		}

		/* NOT FOR BROWSER END */

		return root;
	},

	/** @implements */
	createLanguageService(uri: object) {
		let mod: typeof import('./lib/lsp');
		// eslint-disable-next-line no-unused-labels
		LSP: mod = require('./lib/lsp');
		const {LanguageService, tasks} = mod;
		Parser.viewOnly = true;
		return tasks.get(uri) ?? new LanguageService(uri);
	},

	/* NOT FOR BROWSER */

	/** @implements */
	warn(msg, ...args) {
		/* istanbul ignore if */
		if (this.warning) {
			console.warn(chalk.yellow(msg), ...args);
		}
	},
	/** @implements */
	debug(msg, ...args) {
		/* istanbul ignore if */
		if (this.debugging) {
			console.debug(chalk.blue(msg), ...args);
		}
	},
	error,
	info,

	/* istanbul ignore next */
	/** @implements */
	log(f) {
		if (typeof f === 'function') {
			console.log(String(f));
		}
	},

	/* istanbul ignore next */
	/** @implements */
	require(name: string): unknown {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		return Object.hasOwn(classes, name) ? require(classes[name]!)[name] : require(path.join(__dirname, name));
	},

	/* istanbul ignore next */
	/** @implements */
	async clearCache(): Promise<void> {
		await cmd('npm', ['--prefix', path.join(__dirname, '..'), 'run', 'build:core']);
		const entries = Object.entries(classes);
		for (const [, filePath] of entries) {
			try {
				delete require.cache[require.resolve(filePath)];
			} catch {}
		}
		for (const [name, filePath] of entries) {
			if (name in globalThis) { // eslint-disable-line es-x/no-global-this
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, es-x/no-global-this
				Object.assign(globalThis, {[name]: require(filePath)[name]});
			}
		}
		this.info('已重新加载Parser');
	},

	/** @implements */
	isInterwiki(title, {interwiki} = Parser.getConfig()) {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		/^(zh|en)\s*:/diu;
		return interwiki.length > 0
			? new RegExp(String.raw`^(${interwiki.join('|')})\s*:`, 'diu')
				.exec(title.replaceAll('_', ' ').replace(/^\s*:?\s*/u, ''))
			: null;
	},

	/* istanbul ignore next */
	/** @implements */
	reparse(date = '') {
		const main = fs.readdirSync(path.join(__dirname, '..', 'errors'))
			.find(name => name.startsWith(date) && name.endsWith('Z'));
		if (!main) {
			throw new RangeError(`找不到对应时间戳的错误记录：${date}`);
		}
		const file = path.join(__dirname, '..', 'errors', main),
			wikitext = fs.readFileSync(file, 'utf8');
		const {stage, include, config}: ParsingError = require(`${file}.json`),
			{Token}: typeof import('./src/index') = require('./src/index');
		Shadow.run(() => {
			const halfParsed = stage < MAX_STAGE,
				token = new Token(halfParsed ? wikitext : tidy(wikitext), config);
			token.type = 'root';
			if (halfParsed) {
				token.setAttribute('stage', stage);
				token.parseOnce(stage, include);
			} else {
				token.parse(undefined, include);
			}
			fs.unlinkSync(file);
			fs.unlinkSync(`${file}.err`);
			fs.unlinkSync(`${file}.json`);
		});
	},
};

const def: PropertyDescriptorMap = {
		default: {value: Parser},
	},
	enumerable = new Set([
		'normalizeTitle',
		'parse',
		'createLanguageService',

		/* NOT FOR BROWSER */

		'conversionTable',
		'warning',
		'debugging',
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
export default Parser;
export type {
	Config,
	LintError,
	TokenTypes,
	LanguageService,
	AST,
};
export type * from './internal';
