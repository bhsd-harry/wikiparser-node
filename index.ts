import {
	MAX_STAGE,
	BuildMethod,
	minConfig,
} from './util/constants';
import {tidy} from './util/string';
import type {
	Config,
	ConfigData,
	TokenTypes,
	Parser as ParserBase,
} from './base';
import type {Title, TitleOptions} from './lib/title';
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

	parse(wikitext: string, include?: boolean, maxStage?: number, config?: Config): Token;
}

const Parser = { // eslint-disable-line @typescript-eslint/no-redeclare
	/** @implements */
	getConfig(config?: ConfigData) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		const parserConfig = config ?? this.config;
		return {
			...minConfig,
			...parserConfig,
			excludes: [],
		} satisfies Config;
	},

	/** @implements */
	normalizeTitle(title, defaultNs = 0, include?: boolean, config = Parser.getConfig(), opt?: TitleOptions) {
		const {Title}: typeof import('./lib/title') = require('./lib/title');
		let titleObj: Title;
		if (opt?.halfParsed) {
			titleObj = new Title(title, defaultNs, config, opt);
		} else {
			const {Token}: typeof import('./src/index') = require('./src/index');
			titleObj = (() => {
				const root = new Token(title, config);
				root.type = 'root';
				root.parseOnce(0, include).parseOnce();
				const t = new Title(root.toString(), defaultNs, config, opt);
				root.build();
				const str = t.main;
				if (str.includes('\0')) {
					const s = root.buildFromStr(str, BuildMethod.Text);
					t.main = s;
				}
				return t;
			})();
		}
		return titleObj;
	},

	/** @implements */
	parse(wikitext, include, maxStage = MAX_STAGE, config = Parser.getConfig()) {
		wikitext = tidy(wikitext);
		const {Token}: typeof import('./src/index') = require('./src/index');
		const root = (() => {
			const token = new Token(wikitext, config);
			token.type = 'root';
			return token.parse(maxStage, include);
		})();
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
