import {rules, stages} from './base';
import {
	Shadow,
} from './util/debug';
import {
	MAX_STAGE,
	BuildMethod,
	enMsg,
	minConfig,
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

declare interface Parser extends ParserBase {
	default: Parser;
	/** @since v1.5.1 */
	readonly rules: readonly LintError.Rule[];
	/** @private */
	lintConfig: LintConfiguration;

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
}

let viewOnly = true;

let lintConfig = (() => {
		LINT: return new LintConfiguration();
	})(),
	i18n: Record<string, string> | undefined;

const Parser = { // eslint-disable-line @typescript-eslint/no-redeclare
	config: minConfig,

	/** @implements */
	get rules() {
		LINT: return rules;
	},

	/** @implements */
	get i18n() {
		LINT: return {...enMsg, ...i18n};
	},

	set i18n(data: Record<string, string>) {
		LINT: i18n = data;
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

	/* PRINT ONLY */

	internal: false,

	/* PRINT ONLY END */

	/** @implements */
	getConfig(config?: ConfigData) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
			...minConfig,
			...parserConfig,
			excludes: [],
		};
	},

	/** @implements */
	msg(msg, arg = '') {
		LINT: return msg
		// eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
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
				/* PRINT ONLY */

				const {internal} = Parser;
				Parser.internal = true;

				/* PRINT ONLY END */

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

				/* PRINT ONLY */

				Parser.internal = internal;

				/* PRINT ONLY END */

				return t;
			});
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
			return token.parse(maxStage, include);
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
		throw new Error('Parser.createLanguageService method is only available in the LSP version!');
	},
} as Omit<Parser, 'default'> as Parser;

const def: PropertyDescriptorMap = {
	},
	enumerable = new Set([
		'lintConfig',
		'normalizeTitle',
		'parse',
		'createLanguageService',
	]);
for (const key of Object.keys(Parser)) {
	if (!enumerable.has(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);
// eslint-disable-next-line no-restricted-globals
Object.assign(typeof globalThis === 'object' ? globalThis : self, {Parser});

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
