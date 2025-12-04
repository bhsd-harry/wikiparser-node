import {
	Shadow,
} from './util/debug';
import {
	MAX_STAGE,
	BuildMethod,
	minConfig,
} from './util/constants';
import {
	tidy,
} from './util/string';
import {Title} from './lib/title';
import type {
	Config,
	ConfigData,
	TokenTypes,
	Parser as ParserBase,
} from './base';
import type {TitleOptions} from './lib/title';
import type {
	Token,
} from './internal';

declare interface Parser extends ParserBase {
	default: Parser;

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
		maxStage?: number,
		config?: Config,
		page?: string,
	): Token;
	parse(
		wikitext: string,
		page: string,
		include?: boolean,
		maxStage?: number,
		config?: Config,
	): Token;
}

const Parser = { // eslint-disable-line @typescript-eslint/no-redeclare
	/** @implements */
	getConfig(config?: ConfigData) {
		const parserConfig = config ?? this.config as ConfigData,
			// eslint-disable-next-line no-empty-pattern
			{
			} = parserConfig;
		return {
			...minConfig,
			...parserConfig,
			excludes: [],
		};
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
				root.parseOnce(0, include).parseOnce();
				const t = new Title(root.firstChild!.toString(), defaultNs, config, opt);
				root.build();
				for (const key of ['main'] as const) {
					const str = t[key];
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (str?.includes('\0')) {
						const s = root.buildFromStr(str, BuildMethod.Text);
						t.main = s;
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
			maxStage: number | undefined,
			config: Config | undefined,
			page: string | undefined;
		if (typeof includeOrPage === 'string') {
			include = Boolean(maxStageOrInclude);
			maxStage = configOrStage as number | undefined;
			config = pageOrConfig as Config | undefined;
		} else {
			include = Boolean(includeOrPage);
			maxStage = maxStageOrInclude as number | undefined;
			config = configOrStage as Config | undefined;
		}
		maxStage ??= MAX_STAGE;
		config ??= this.getConfig();
		const {Token}: typeof import('./src/index') = require('./src/index');
		const root = Shadow.run(() => {
			const token = new Token(wikitext, config);
			token.type = 'root';
			return token.parse(maxStage, include);
		});
		return root;
	},
} as Omit<Parser, 'default'> as Parser;

export default Parser;
export type {
	Config,
	ConfigData,
	TokenTypes,
};
export type * from './internal';
