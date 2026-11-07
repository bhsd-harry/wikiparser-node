/* eslint n/exports-style: 0 */
import {getBCP47Variants} from '@bhsd/cm-util';
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
import defaultConfig from './config/default.json';
import type {
	MaxStage,
	Config,
	ConfigData,
	TokenTypes,
	Parser as ParserBase,

	/* NOT FOR BROWSER */

	RenderOpt,
} from './base';
import type * as LibTitle from './lib/title';
import type {TitleOptions, Title} from './lib/title';
import type * as Src from './src/index';
import type {
	Token,
} from './internal';

/* NOT FOR BROWSER */

import {RedirectMap} from './lib/redirectMap';

/* NOT FOR BROWSER END */

declare interface Parser extends ParserBase {

	/** @since v1.9.0 */
	viewOnly: boolean;

	/* NOT FOR BROWSER */

	conversionTable: Map<string, string>;
	redirects: Map<string, string>;

	/** @since v1.10.0 */
	templates: Map<string, string>;

	/**
	 * Specify the current time of the parser
	 *
	 * 指定解析器的当前时间
	 * @since v1.21.2
	 */
	now: Date;

	/* NOT FOR BROWSER END */

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
	normalizeTitle(title: string, defaultNs?: number, include?: boolean, config?: ConfigData): Title;
	/** @private */
	normalizeTitle(
		title: string,
		defaultNs?: number,
		include?: boolean,
		config?: ConfigData,
		opt?: TitleOptions,
		accum?: Token[], // eslint-disable-line @typescript-eslint/unified-signatures
	): Title;

	parse(wikitext: string, include?: boolean, maxStage?: MaxStage, config?: ConfigData, page?: string): Token;
	parse(wikitext: string, page: string, include?: boolean, maxStage?: MaxStage, config?: ConfigData): Token;

	/** @private */
	parseWithRef(wikitext: string, ref: Token, maxStage?: number, include?: boolean): Token;

	/* NOT FOR BROWSER */

	/**
	 * Generate HTML
	 *
	 * 生成HTML
	 * @param include whether to be transcluded / 是否嵌入
	 * @param page page name / 页面名称
	 * @param opt options / 设置
	 * @since v1.32.0
	 */
	toHtml(wikitext: string, include?: boolean, config?: ConfigData, page?: string, opt?: RenderOpt): string;
	toHtml(wikitext: string, page: string, include?: boolean, config?: ConfigData, opt?: RenderOpt): string;

	/**
	 * Extract plain text
	 *
	 * 提取纯文本
	 * @param include whether to be transcluded / 是否嵌入
	 * @param page page name / 页面名称
	 * @since v2.2.0
	 */
	plainText(wikitext: string, include?: boolean, config?: ConfigData, page?: string): string;
	plainText(wikitext: string, page: string, include?: boolean, config?: ConfigData): string;
}

let viewOnly =
	false;

/* NOT FOR BROWSER */

let redirectMap = new RedirectMap(),
	now: Date | undefined;

/* NOT FOR BROWSER END */

let i18n: Record<string, string> | undefined;

/**
 * 判断参数顺序
 * @param includeOrPage include or page
 * @param configOrInclude config or include
 * @param pageOrConfig page or config
 */
const getParams = (
	includeOrPage?: boolean | string,
	configOrInclude?: ConfigData | boolean,
	pageOrConfig?: string | ConfigData,
): [boolean, Config, string | undefined] => typeof includeOrPage === 'string'
	? [Boolean(configOrInclude), Parser.getConfig(pageOrConfig as ConfigData | undefined), includeOrPage]
	: [
		Boolean(includeOrPage),
		Parser.getConfig(configOrInclude as ConfigData | undefined),
		pageOrConfig as string | undefined,
	];

const Parser = { // eslint-disable-line @typescript-eslint/no-redeclare
	config:
		defaultConfig as unknown as ConfigData,

	/** @implements */
	get i18n() {
		LINT: return {...enMsg, ...i18n};
	},

	set i18n(
		data: Record<string, string>
			| undefined,
	) {
		LINT: i18n = data;
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

	/** @implements */
	get now() {
		return now ?? new Date();
	},

	set now(value: Date) {
		now = value;
	},

	/** @implements */
	get redirects() {
		return redirectMap;
	},

	set redirects(redirects: Map<string, string>) {
		redirectMap = redirects instanceof RedirectMap ? redirects : new RedirectMap(redirects);
	},

	/* NOT FOR BROWSER END */

	/** @implements */
	getConfig(config?: ConfigData) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		const parserConfig = config ?? this.config as ConfigData;
		if ('excludes' in parserConfig) {
			return {...parserConfig, excludes: []};
		}
		const {
			doubleUnderscore,
			ext,
			parserFunction,
			variable,
			variants,

			/* NOT FOR BROWSER */

			conversionTable,
			redirects,
		} = parserConfig;
		for (let i = 0; i < 2; i++) {
			if (doubleUnderscore[i]!.length === 0) {
				doubleUnderscore[i] = Object.keys(doubleUnderscore[i + 2]!);
			}
		}
		if (ext.includes('translate') && !variable.includes('translationlanguage')) {
			variable.push('translationlanguage');
			parserFunction[1]['TRANSLATIONLANGUAGE'] = 'translationlanguage';
		}
		parserConfig.variants = getBCP47Variants(variants);

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
		LINT: return msg
		&& ((this.i18n as Record<string, string>)[msg] ?? msg).replace('$1', () => this.msg(arg));
	},

	/** @implements */
	normalizeTitle(
		title,
		defaultNs = 0,
		include?: boolean,
		configData?: ConfigData,
		opt?: TitleOptions,
		accum: Token[] = [],
	) {
		const {Title: TitleObj}: typeof LibTitle = require('./lib/title');
		const config = this.getConfig(configData);
		let titleObj: Title;
		if (opt?.halfParsed) {
			titleObj = new TitleObj(title, defaultNs, config, opt, accum);
		} else {
			const {Token}: typeof Src = require('./src/index');
			titleObj = Shadow.run(() => {
				const root = new Token(title, config, accum);
				root.type = 'root';
				root.pageName = opt?.page;
				root.parseOnce(0, include).parseOnce();
				const t = new TitleObj(root.firstChild!.toString(), defaultNs, config, opt, accum);
				root.build();
				const keys = [
					'main',
					'fragment',
				] as const;
				for (const key of keys) {
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
			maxStage: MaxStage | undefined,
			config: Config,
			page: string | undefined;
		if (typeof includeOrPage === 'string') {
			include = Boolean(maxStageOrInclude);
			maxStage = configOrStage as MaxStage | undefined;
			config = this.getConfig(pageOrConfig as ConfigData | undefined);
			page = includeOrPage;
		} else {
			include = Boolean(includeOrPage);
			maxStage = maxStageOrInclude as MaxStage | undefined;
			config = this.getConfig(configOrStage as ConfigData | undefined);
			page = pageOrConfig as string | undefined;
		}
		maxStage ??= MAX_STAGE + 1;
		const {Token}: typeof Src = require('./src/index');
		const root = Shadow.run(() => {
			const token = new Token(wikitext, config);
			token.type = 'root';
			token.pageName = page;
			token.parse(maxStage, include);
			PRINT: if (maxStage > MAX_STAGE) {
				token.buildLists();
			}
			return token;
		});

		return root;
	},

	/** @implements */
	parseWithRef(wikitext, ref, maxStage, include = ref.getAttribute('include')) {
		return this.parse(wikitext, include, maxStage, ref.getAttribute('config'), ref.pageName);
	},

	/* NOT FOR BROWSER */

	/** @implements */
	toHtml(wikitext, includeOrPage, configOrInclude, pageOrConfig, opt) {
		const [include, config, page] = getParams(includeOrPage, configOrInclude, pageOrConfig);
		return this.parse(
			wikitext,
			include,
			undefined,
			config,
			page,
		).toHtml(opt)
		;
	},

	/** @implements */
	plainText(wikitext, includeOrPage, configOrInclude, pageOrConfig) {
		const html = this.toHtml(
			wikitext,
			includeOrPage as boolean | undefined,
			configOrInclude as ConfigData | undefined,
			pageOrConfig as string | undefined,
			{
				toc: false,
				cats: false,
				redirect: false,
			},
		);
		return new DOMParser().parseFromString(html, 'text/html').body.textContent;
	},
} as Omit<Parser, 'default'> as Parser;

const def: PropertyDescriptorMap = {
	},
	enumerable = new Set([
		'getConfig',
		'normalizeTitle',
		'parse',

		/* NOT FOR BROWSER */

		'toHtml',
	]);
for (const key in Parser) {
	if (!enumerable.has(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

export default Parser;
export type {
	Config,
	ConfigData,
	TokenTypes,
	Title,
};
export type * from './internal';
