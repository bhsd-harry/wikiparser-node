/* eslint n/exports-style: 0 */
import {rules, stages} from './base';
import {
	Shadow,
} from './util/debug';
import {
	MAX_STAGE,
	BuildMethod,
	enMsg,
} from './util/constants';
import {
	tidy,
} from './util/string';
import {LintConfiguration} from './lib/lintConfig';
import {Title} from './lib/title';
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
import type {TitleOptions} from './lib/title';
import type {LanguageService, QuickFixData} from './lib/lsp';
import type {
	Token,
} from './internal';

/* NOT FOR BROWSER ONLY */

import fs from 'fs';
import path from 'path';
import {wmf} from '@bhsd/common';
import {
	error,
} from './util/diff';

/* NOT FOR BROWSER ONLY END */

declare interface Parser extends ParserBase {
	default: Parser;
	/** @since v1.5.1 */
	readonly rules: readonly LintError.Rule[];
	/** @private */
	lintConfig: LintConfiguration;

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

	/**
	 * Create a language server
	 *
	 * 创建语言服务
	 * @param uri document URI / 文档标识
	 * @since v1.16.1
	 */
	createLanguageService(uri?: object): LanguageService;

	/**
	 * print in HTML
	 *
	 * 以HTML格式打印
	 * @param include whether to be transcluded / 是否嵌入
	 * @param page page name / 页面名称
	 * @since v1.32.0
	 */
	print(wikitext: string, include?: boolean, config?: Config, page?: string): string;
	print(wikitext: string, page: string, include?: boolean, config?: Config): string;

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

let viewOnly = true;

let lintConfig = (() => {
		LINT: return new LintConfiguration();
	})(),
	i18n: Record<string, string> | undefined;

/**
 * 判断参数顺序
 * @param includeOrPage include or page
 * @param configOrInclude config or include
 * @param pageOrConfig page or config
 */
const getParams = (
	includeOrPage?: boolean | string,
	configOrInclude?: Config | boolean,
	pageOrConfig?: string | Config,
): [boolean, Config | undefined, string | undefined] => typeof includeOrPage === 'string'
	? [Boolean(configOrInclude), pageOrConfig as Config | undefined, includeOrPage]
	: [Boolean(includeOrPage), configOrInclude as Config | undefined, pageOrConfig as string | undefined];

const Parser = { // eslint-disable-line @typescript-eslint/no-redeclare
	config: 'default',

	/** @implements */
	get rules() {
		LINT: return rules;
	},

	/** @implements */
	get i18n() {
		LINT: return {...enMsg, ...i18n};
	},

	set i18n(data: Record<string, string> | string | undefined) {
		/* NOT FOR BROWSER ONLY */

		if (typeof data === 'string') {
			i18n = rootRequire(data, 'i18n') as Record<string, string>;
		} else {
			/* NOT FOR BROWSER ONLY END */

			LINT: i18n = data;
		}
	},

	/** @implements */
	get lintConfig(): LintConfiguration {
		LINT: return lintConfig;
	},

	set lintConfig(config: LintConfig) {
		LINT: lintConfig = new LintConfiguration(config);
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

	/* NOT FOR BROWSER ONLY */

	configPaths: [],

	/* NOT FOR BROWSER ONLY END */

	/* PRINT ONLY */

	internal: false,

	/* PRINT ONLY END */

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
			if (this.config.doubleUnderscore.length < 3 || !('functionHook' in this.config)) {
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
			} = parserConfig;
		for (let i = 0; i < 2; i++) {
			if (doubleUnderscore.length > i + 2 && doubleUnderscore[i]!.length === 0) {
				doubleUnderscore[i] = Object.keys(doubleUnderscore[i + 2]!);
			}
		}
		if (ext.includes('translate') && !variable.includes('translationlanguage')) {
			variable.push('translationlanguage');
			parserFunction[1]['TRANSLATIONLANGUAGE'] = 'translationlanguage';
		}
		return {
			...parserConfig,
			excludes: [],
		};
	},

	/** @implements */
	msg(msg, arg = '') {
		LINT: return msg
		&& ((this.i18n as Record<string, string>)[msg] ?? msg).replace('$1', this.msg(arg));
	},

	/** @implements */
	normalizeTitle(title, defaultNs = 0, include?: boolean, config = Parser.getConfig(), opt?: TitleOptions) {
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
				const t = new Title(root.firstChild!.toString(), defaultNs, config, opt);
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
			}, this);
		}
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
		LINT: {
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
					for (const k of Object.keys(config)) {
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
		return root;
	},

	/** @implements */
	parseWithRef(wikitext, ref, maxStage, include = ref.getAttribute('include')) {
		return this.parse(wikitext, include, maxStage, ref.getAttribute('config'), ref.pageName);
	},

	/** @implements */
	createLanguageService(uri = {}) {
		LSP: {
			const {LanguageService, tasks}: typeof import('./lib/lsp') = require('./lib/lsp');
			return tasks.get(uri) ?? new LanguageService(uri);
		}
	},

	/** @implements */
	lint(wikitext, includeOrPage, configOrInclude, pageOrConfig) {
		LINT: {
			const [include, config, page] = getParams(includeOrPage, configOrInclude, pageOrConfig);
			return Shadow.internal(() => this.parse(wikitext, include, undefined, config, page).lint(), this);
		}
	},

	/** @implements */
	print(wikitext, includeOrPage, configOrInclude, pageOrConfig) {
		PRINT: {
			const [include, config, page] = getParams(includeOrPage, configOrInclude, pageOrConfig);
			return Shadow.internal(
				() => this.parse(wikitext, include, undefined, config, page).print(),
				this,
			);
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
		const {default: fetchConfig}: typeof import('./bin/config') = require('./bin/config');
		return this.getConfig(await fetchConfig(site, url, user, false, true));
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
	]);
for (const key of Object.keys(Parser)) {
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
};
export type * from './internal';
