/* eslint n/exports-style: 0 */
import {rules, stages} from './base';
import {Shadow} from './util/debug';
import {
	MAX_STAGE,
	BuildMethod,
	enMsg,

	/* NOT FOR BROWSER */

	classes,
} from './util/constants';
import {tidy} from './util/string';
import {LintConfiguration} from './lib/lintConfig';
import type {
	Config,
	ConfigData,
	LintError,
	LintConfig,
	TokenTypes,
	Parser as ParserBase,
	Stage,
	AST,
} from './base';
import type {Title, TitleOptions} from './lib/title';
import type {LanguageService, QuickFixData} from './lib/lsp';
import type {
	Token,

	/* NOT FOR BROWSER */

	TranscludeToken,
	ExtToken,
} from './internal';

/* NOT FOR BROWSER */

import {getRegex} from '@bhsd/common';
import {RedirectMap} from './lib/redirectMap';
import type {Chalk} from 'chalk';
import type {log} from './util/diff';
import type {AstRange} from './lib/range';

/* NOT FOR BROWSER END */

/* NOT FOR BROWSER ONLY */

import fs from 'fs';
import path from 'path';
import {wmf} from '@bhsd/common';
import {
	error,

	/* NOT FOR BROWSER */

	cmd,
	info,
	diff,
} from './util/diff';
import fetchConfig from './bin/config';

/* NOT FOR BROWSER ONLY END */

/* NOT FOR BROWSER */

declare type FunctionHook = (token: TranscludeToken, context?: TranscludeToken) => string;
declare type TagHook = (token: ExtToken) => string;

/* NOT FOR BROWSER END */

declare interface Parser extends ParserBase {
	default: Parser;
	/** @since v1.5.1 */
	readonly rules: readonly LintError.Rule[];
	/** @private */
	lintConfig: LintConfiguration;

	/* NOT FOR BROWSER */

	conversionTable: Map<string, string>;
	redirects: Map<string, string>;

	/** @since v1.10.0 */
	templateDir?: string;
	/** @since v1.10.0 */
	templates: Map<string, string>;

	warning: boolean;
	debugging: boolean;

	/**
	 * Specify the current time of the parser
	 *
	 * 指定解析器的当前时间
	 * @since v1.21.2
	 */
	now?: Date;

	/** @private */
	functionHooks: Map<string, FunctionHook>;

	/** @private */
	tagHooks: Map<string, TagHook>;

	/* NOT FOR BROWSER END */

	/* NOT FOR BROWSER ONLY */

	configPaths: string[];

	/* NOT FOR BROWSER ONLY END */

	/** @private */
	msg(msg: string, arg?: string): string;

	/**
	 * Normalize page title
	 *
	 * 规范化页面标题
	 * @param title title (with or without the namespace prefix) / 标题（含或不含命名空间前缀）
	 * @param defaultNs default namespace number / 命名空间
	 * @param include whether to be transcluded / 是否嵌入
	 */
	normalizeTitle(title: string, defaultNs?: number, include?: boolean, config?: Config): Title;
	/** @private */
	normalizeTitle(
		title: string,
		defaultNs?: number,
		include?: boolean,
		config?: Config,
		opt?: TitleOptions, // eslint-disable-line @typescript-eslint/unified-signatures
	): Title;

	parse(
		wikitext: string,
		include?: boolean,
		maxStage?: number | Stage | Stage[],
		config?: Config,
		page?: string,
	): Token;
	parse(
		wikitext: string,
		page: string,
		include?: boolean,
		maxStage?: number | Stage | Stage[],
		config?: Config,
	): Token;

	/** @private */
	parseWithRef(wikitext: string, ref: Token, maxStage?: number, include?: boolean): Token;

	/** @private */
	partialParse(wikitext: string, watch: () => string, include?: boolean, config?: Config): Promise<Token>;

	/**
	 * Create a language server
	 *
	 * 创建语言服务
	 * @param uri document URI / 文档标识
	 * @since v1.16.1
	 */
	createLanguageService(uri?: object): LanguageService;

	/* NOT FOR BROWSER ONLY */

	/**
	 * get the name of a WMF site from a URL
	 *
	 * 获取一个WMF网站的名称
	 * @param url script path
	 * @since v1.22.0
	 */
	getWMFSite(url: string): [string, string];

	/**
	 * Get the parser configuration for a MediaWiki project with Extension:CodeMirror installed
	 *
	 * 获取一个安装了CodeMirror扩展的MediaWiki项目的解析设置
	 * @param site site nickname / 网站别名
	 * @param url script path / 脚本路径
	 * @param user URI for wiki userpage or email address of the user / 维基用户页面地址或用户的电子邮件地址
	 * @since v1.18.4
	 */
	fetchConfig(site: string, url: string, user?: string): Promise<Config>;

	/* NOT FOR BROWSER ONLY END */

	/* NOT FOR BROWSER */

	/**
	 * Define how to expand a parser function
	 *
	 * 定义如何展开一个解析器函数
	 * @param name parser function name / 解析器函数名
	 * @param hook handler function / 处理函数
	 * @since v1.22.0
	 */
	setFunctionHook(name: string, hook: FunctionHook): void;

	/**
	 * Define how to convert an extension tag to HTML
	 *
	 * 定义如何将一个扩展标签转换为HTML
	 * @param name tag name / 标签名
	 * @param hook handler function / 处理函数
	 * @since v1.22.0
	 */
	setHook(name: string, hook: TagHook): void;

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
	 * Check if the title is an interwiki link
	 *
	 * 是否是跨维基链接
	 * @param title title / 链接标题
	 */
	isInterwiki(title: string, config?: Config): RegExpExecArray | null;

	/** @private */
	reparse(date?: string): void;
}

/* NOT FOR BROWSER ONLY */

const re = new RegExp(String.raw`^https?:\/\/([^./]+)\.(${wmf})\.org`, 'iu');

/**
 * 从根路径require
 * @param file 文件名
 * @param dir 子路径
 */
const rootRequire = (file: string, dir: string): unknown => require(
	path.isAbsolute(file)
		? /* istanbul ignore next */ file
		: path.join('..', file.includes('/') ? '' : dir, file),
);

/* NOT FOR BROWSER ONLY END */

let viewOnly = false;

/* NOT FOR BROWSER */

const promises = [Promise.resolve()];
/^(zh|en)\s*:/diu; // eslint-disable-line @typescript-eslint/no-unused-expressions
const getInterwikiRegex = getRegex<string[]>(
	interwiki => new RegExp(String.raw`^(${interwiki.join('|')})\s*:`, 'diu'),
);
let redirectMap = new RedirectMap();

/* NOT FOR BROWSER END */

let lintConfig = (() => {
		LINT: return new LintConfiguration(); // eslint-disable-line no-unused-labels
	})(),
	i18n: Record<string, string> | undefined;

const Parser = { // eslint-disable-line @typescript-eslint/no-redeclare
	config: 'default',

	/** @implements */
	get rules() {
		LINT: return rules; // eslint-disable-line no-unused-labels
	},

	/** @implements */
	get i18n() {
		LINT: return {...enMsg, ...i18n}; // eslint-disable-line no-unused-labels
	},

	set i18n(data: Record<string, string> | string | undefined) {
		/* NOT FOR BROWSER ONLY */

		if (typeof data === 'string') { // eslint-disable-line unicorn/prefer-ternary
			i18n = rootRequire(data, 'i18n') as Record<string, string>;
		} else {
			/* NOT FOR BROWSER ONLY END */

			LINT: i18n = data; // eslint-disable-line no-unused-labels
		}
	},

	/** @implements */
	get lintConfig(): LintConfiguration {
		LINT: return lintConfig; // eslint-disable-line no-unused-labels
	},

	set lintConfig(config: LintConfig) {
		LINT: lintConfig = new LintConfiguration(config); // eslint-disable-line no-unused-labels
	},

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

	/* NOT FOR BROWSER */

	conversionTable: new Map(),

	templates: new RedirectMap(undefined, false),

	warning: true,
	debugging: false,

	functionHooks: new Map(),

	tagHooks: new Map(),

	/** @implements */
	get redirects() {
		return redirectMap;
	},

	set redirects(redirects: Map<string, string>) {
		redirectMap = redirects instanceof RedirectMap ? redirects : new RedirectMap(redirects);
	},

	/* NOT FOR BROWSER END */

	/* NOT FOR BROWSER ONLY */

	configPaths: [],

	/* NOT FOR BROWSER ONLY END */

	/** @implements */
	getConfig(config?: ConfigData) {
		/* NOT FOR BROWSER ONLY */

		if (!config && typeof this.config === 'string') {
			if (!path.isAbsolute(this.config)) {
				for (const p of this.configPaths) {
					try {
						this.config = require(path.resolve(process.cwd(), p, this.config as string));
						break;
					} catch {}
				}
			}
			if (typeof this.config === 'string') {
				this.config = rootRequire(this.config, 'config') as ConfigData;
			}
			/* istanbul ignore if */
			if (
				this.config.doubleUnderscore.length < 3
				|| Array.isArray(this.config.parserFunction[1])
				|| !('functionHook' in this.config)
			) {
				error(
					`The schema (${
						path.join(__dirname, '..', 'config', '.schema.json')
					}) of parser configuration is updated.`,
				);
			}

			return this.getConfig();
		}

		/* NOT FOR BROWSER ONLY END */

		const parserConfig = config ?? this.config as ConfigData,
			{
				doubleUnderscore,
				ext,
				parserFunction,
				variable,

				/* NOT FOR BROWSER */

				conversionTable,
				redirects,
			} = parserConfig;
		for (let i = 0; i < 2; i++) {
			if (doubleUnderscore.length > i + 2 && doubleUnderscore[i]!.length === 0) {
				doubleUnderscore[i] = Object.keys(doubleUnderscore[i + 2]!);
			}
		}
		if (ext.includes('translate') && !variable.includes('translationlanguage')) {
			variable.push('translationlanguage');
			/* istanbul ignore if */
			if (Array.isArray(parserFunction[1])) {
				parserFunction[1].push('TRANSLATIONLANGUAGE');
			} else {
				parserFunction[1]['TRANSLATIONLANGUAGE'] = 'translationlanguage';
			}
		}

		/* NOT FOR BROWSER */

		if (conversionTable) {
			this.conversionTable = new Map(conversionTable);
		}
		if (redirects) {
			this.redirects = new RedirectMap(redirects);
		}

		/* NOT FOR BROWSER END */

		return {
			...parserConfig,
			excludes: [],
		};
	},

	/** @implements */
	msg(msg, arg = '') {
		LINT: return msg // eslint-disable-line no-unused-labels
		&& ((this.i18n as Record<string, string>)[msg] ?? msg).replace('$1', this.msg(arg));
	},

	/** @implements */
	normalizeTitle(title, defaultNs = 0, include?: boolean, config = Parser.getConfig(), opt?: TitleOptions) {
		const {Title}: typeof import('./lib/title') = require('./lib/title');
		let titleObj: Title;
		if (opt?.halfParsed) {
			titleObj = new Title(title, defaultNs, config, opt);
		} else {
			const {Token}: typeof import('./src/index') = require('./src/index');
			titleObj = Shadow.run(() => {
				const root = new Token(title, config);
				root.type = 'root';
				root.pageName = opt?.page;
				root.parseOnce(0, include).parseOnce();
				const t = new Title(root.toString(), defaultNs, config, opt);
				root.build();
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
	parse(wikitext, includeOrPage, maxStageOrInclude, configOrStage, pageOrConfig) {
		wikitext = tidy(wikitext);
		let include: boolean,
			maxStage: number | Stage | Stage[] | undefined,
			config: Config | undefined,
			page: string | undefined;
		if (typeof includeOrPage === 'string') {
			include = Boolean(maxStageOrInclude);
			maxStage = configOrStage as number | Stage | Stage[] | undefined;
			config = pageOrConfig as Config | undefined;
			page = includeOrPage;
		} else {
			include = Boolean(includeOrPage);
			maxStage = maxStageOrInclude as number | Stage | Stage[] | undefined;
			config = configOrStage as Config | undefined;
			page = pageOrConfig as string | undefined;
		}
		maxStage ??= MAX_STAGE;
		config ??= this.getConfig();
		let types: Stage[] | undefined;
		LINT: { // eslint-disable-line no-unused-labels
			if (typeof maxStage !== 'number') {
				types = Array.isArray(maxStage) ? maxStage : [maxStage];
				maxStage = Math.max(...types.map(t => stages[t] || MAX_STAGE));
			}
		}
		const {Token}: typeof import('./src/index') = require('./src/index');
		const root = Shadow.run(() => {
			const token = new Token(wikitext, config);
			token.type = 'root';
			token.pageName = page;
			try {
				return token.parse(maxStage, include);

				/* NOT FOR BROWSER ONLY */
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
					fs.writeFileSync(
						`${file}.json`,
						JSON.stringify({stage, include, config, page}, null, '\t'),
					);
				}
				throw e;
			}

			/* NOT FOR BROWSER ONLY END */
		});

		/* NOT FOR BROWSER */

		if (types?.includes('list-range')) {
			root.buildLists();
		}

		/* istanbul ignore if */
		if (this.debugging) {
			let restored = root.toString(),
				proc = 'parsing';
			if (restored === wikitext) {
				const entities = {lt: '<', gt: '>', amp: '&'};
				restored = root.print().replace(
					/<[^<]+?>|&([lg]t|amp);/gu,
					(_, s?: keyof typeof entities) => s ? entities[s] : '',
				);
				proc = 'printing';
			}
			if (restored !== wikitext) {
				const {0: cur, length} = promises;
				promises.unshift((async (): Promise<void> => {
					await cur;
					this.error(`Original wikitext is altered when ${proc}!`);
					return diff(wikitext, restored, length);
				})());
			}
		}

		/* NOT FOR BROWSER END */

		return root;
	},

	/** @implements */
	parseWithRef(wikitext, ref, maxStage, include = ref.getAttribute('include')) {
		return this.parse(wikitext, include, maxStage, ref.getAttribute('config'), ref.pageName);
	},

	/** @implements */
	async partialParse(wikitext, watch, include, config = Parser.getConfig()) {
		LSP: { // eslint-disable-line no-unused-labels
			const {Token}: typeof import('./src/index') = require('./src/index');
			const set = typeof setImmediate === 'function' ? setImmediate : /* istanbul ignore next */ setTimeout,
				{running} = Shadow;
			Shadow.running = true;
			const token = new Token(tidy(wikitext), config);
			token.type = 'root';
			let i = 0;
			try {
				await new Promise<void>(resolve => {
					const /** @ignore */ check = (): void => {
							if (watch() === wikitext) {
								i++;
								set(parseOnce, 0);
							} else {
								resolve();
							}
						},
						/** @ignore */ parseOnce = (): void => {
							if (i === MAX_STAGE + 1) {
								token.afterBuild();
								resolve();
							} else {
								token[i === MAX_STAGE ? 'build' : 'parseOnce'](i, include);
								check();
							}
						};
					set(parseOnce, 0);
				});
			} catch (e) /* istanbul ignore next */ {
				Shadow.running = running;
				throw e;
			}
			Shadow.running = running;
			return token;
		}
	},

	/** @implements */
	createLanguageService(uri = {}) {
		LSP: { // eslint-disable-line no-unused-labels
			const mod: typeof import('./lib/lsp') = require('./lib/lsp');
			const {LanguageService, tasks} = mod;
			this.viewOnly = true;
			return tasks.get(uri) ?? new LanguageService(uri);
		}
	},

	/* NOT FOR BROWSER ONLY */

	/** @implements */
	getWMFSite(url) {
		const mt = re.exec(url);
		/* istanbul ignore if */
		if (!mt) {
			throw new RangeError('Not a recognizable WMF site!');
		}
		const type = mt[2]!.toLowerCase();
		return [mt[1]!.toLowerCase() + (type === 'wikipedia' ? 'wiki' : type), mt[0]];
	},

	/* istanbul ignore next */
	/** @implements */
	async fetchConfig(site, url, user) {
		return this.getConfig(await fetchConfig(site, url, user, false, true));
	},

	/* NOT FOR BROWSER ONLY END */

	/* NOT FOR BROWSER */

	/** @implements */
	setFunctionHook(name, hook) {
		this.functionHooks.set(name, hook);
	},

	/** @implements */
	setHook(name, hook) {
		this.tagHooks.set(name, hook);
	},

	/** @implements */
	warn(msg, ...args) {
		/* istanbul ignore if */
		if (this.warning) {
			try {
				const chalk: Chalk = require('chalk');
				console.warn(chalk.yellow(msg), ...args);
			} catch {
				console.warn(msg, ...args);
			}
		}
	},
	/** @implements */
	debug(msg, ...args) {
		/* istanbul ignore if */
		if (this.debugging) {
			try {
				const chalk: Chalk = require('chalk');
				console.debug(chalk.blue(msg), ...args);
			} catch {
				console.debug(msg, ...args);
			}
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
			if (name in globalThis) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				Object.assign(globalThis, {[name]: require(filePath)[name]});
			}
		}
		this.info('已重新加载Parser');
	},

	/** @implements */
	isInterwiki(title, {interwiki} = Parser.getConfig()) {
		return interwiki.length > 0
			? getInterwikiRegex(interwiki).exec(
				title.replaceAll('_', ' ').replace(/^\s*:?\s*/u, ''),
			)
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
		const {stage, include, config, page}: ParsingError = require(`${file}.json`),
			{Token}: typeof import('./src/index') = require('./src/index');
		Shadow.run(() => {
			const halfParsed = stage < MAX_STAGE,
				token = new Token(halfParsed ? wikitext : tidy(wikitext), config);
			token.type = 'root';
			token.pageName = page;
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
} as Omit<Parser, 'default'> as Parser;

const def: PropertyDescriptorMap = {
		default: {value: Parser},
	},
	enumerable = new Set([
		'lintConfig',
		'normalizeTitle',
		'parse',
		'createLanguageService',

		/* NOT FOR BROWSER ONLY */

		'fetchConfig',

		/* NOT FOR BROWSER ONLY END */

		/* NOT FOR BROWSER */

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
	ConfigData,
	LintConfig,
	LintError,
	TokenTypes,
	LanguageService,
	QuickFixData,
	Title,
	AST,

	/* NOT FOR BROWSER */

	AstRange,
};
export type * from './internal';
