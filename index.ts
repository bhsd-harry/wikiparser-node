import {rules, stages} from './base';
import {Shadow} from './util/debug';
import {
	MAX_STAGE,
	BuildMethod,
	enMsg,
	minConfig,
} from './util/constants';
import {tidy} from './util/string';
import {getLintConfig} from './lib/lintConfig';
import type {
	Config,
	ConfigData,
	LintError,
	LintConfig,
	LintConfiguration,
	TokenTypes,
	Parser as ParserBase,
	Stage,
	AST,
} from './base';
import type {Title, TitleOptions} from './lib/title';
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

	parse(wikitext: string, include?: boolean, maxStage?: number | Stage | Stage[], config?: Config): Token;

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
}

let viewOnly = true;

let lintConfig = (() => {
		LINT: return getLintConfig(); // eslint-disable-line no-unused-labels
	})(),
	i18n: Record<string, string> | undefined;

const Parser = { // eslint-disable-line @typescript-eslint/no-redeclare
	config: minConfig,

	/** @implements */
	get rules() {
		LINT: return rules; // eslint-disable-line no-unused-labels
	},

	/** @implements */
	get i18n() {
		LINT: return {...enMsg, ...i18n}; // eslint-disable-line no-unused-labels
	},

	set i18n(data: Record<string, string>) {
		LINT: i18n = data; // eslint-disable-line no-unused-labels
	},

	/** @implements */
	get lintConfig(): LintConfiguration {
		LINT: return lintConfig; // eslint-disable-line no-unused-labels
	},

	set lintConfig(config: LintConfig) {
		LINT: lintConfig = getLintConfig(config); // eslint-disable-line no-unused-labels
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
			/* istanbul ignore if */
			if (Array.isArray(parserFunction[1])) {
				parserFunction[1].push('TRANSLATIONLANGUAGE');
			} else {
				parserFunction[1]['TRANSLATIONLANGUAGE'] = 'translationlanguage';
			}
		}
		return {
			...minConfig,
			...parserConfig,
			excludes: [],
		} satisfies Config;
	},

	/** @implements */
	msg(msg, arg = '') {
		LINT: { // eslint-disable-line no-unused-labels
			// eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
			return msg && ((this.i18n as Record<string, string>)[msg] ?? msg).replace('$1', this.msg(arg));
		}
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
		return titleObj;
	},

	/** @implements */
	parse(wikitext, include, maxStage = MAX_STAGE, config = Parser.getConfig()) {
		wikitext = tidy(wikitext);
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
			return token.parse(maxStage, include);
		});
		return root;
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
for (const key in Parser) {
	if (!enumerable.has(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);
// eslint-disable-next-line no-restricted-globals, es-x/no-global-this
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
	AST,
};
