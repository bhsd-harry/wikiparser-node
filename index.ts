import {rules, stages} from './base';
import {Shadow} from './util/debug';
import {
	MAX_STAGE,
	BuildMethod,
	minConfig,
} from './util/constants';
import {tidy} from './util/string';
import type {Config, LintError, TokenTypes, Parser as ParserBase, Stage} from './base';
import type {Title} from './lib/title';
import type {Token} from './internal';

declare interface Parser extends ParserBase {
	rules: readonly LintError.Rule[];

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
}

const Parser: Parser = { // eslint-disable-line @typescript-eslint/no-redeclare
	config: minConfig,
	i18n: undefined,
	rules,

	/** @implements */
	getConfig() {
		const {doubleUnderscore} = this.config;
		if (doubleUnderscore.length === 2) {
			//
		} else if (doubleUnderscore[0].length === 0) {
			doubleUnderscore[0] = Object.keys(doubleUnderscore[2]!);
		}
		return {
			...minConfig,
			...this.config,
			excludes: [],
		};
	},

	/** @implements */
	msg(msg, arg = '') {
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
			return token.parse(maxStage, include);
		});
		return root;
	},
};

const def: PropertyDescriptorMap = {
	},
	enumerable = new Set([
		'normalizeTitle',
		'parse',
	]);
for (const key in Parser) {
	if (!enumerable.has(key)) {
		def[key] = {enumerable: false};
	}
}
Object.defineProperties(Parser, def);

if (typeof self === 'object') {
	Object.assign(self, {Parser});
} else if (typeof globalThis === 'object') {
	Object.assign(globalThis, {Parser});
}

export default Parser;
export type {Config, LintError, TokenTypes};
