/* eslint n/exports-style: 0 */
import * as fs from 'fs';
import * as path from 'path';
import {rules, stages} from './base';
import {Shadow} from './util/debug';
import {
	MAX_STAGE,
	BuildMethod,
} from './util/constants';
import {tidy} from './util/string';
import {
	error,
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

	/**
	 * 创建语言服务
	 * @param uri 文档唯一标识符
	 */
	createLanguageService(uri: unknown): LanguageService;
}

/**
 * 从根路径require
 * @param file 文件名
 * @param dir 子路径
 */
const rootRequire = (file: string, dir: string): unknown => require(
	path.isAbsolute(file) ? /* istanbul ignore next */ file : path.join('..', file.includes('/') ? '' : dir, file),
);

const Parser: Parser = { // eslint-disable-line @typescript-eslint/no-redeclare
	config: 'default',
	i18n: undefined,
	rules,

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
		return root;
	},

	/** @implements */
	createLanguageService(uri: unknown) {
		let LanguageService: typeof import('./lib/lsp').LanguageService;
		// eslint-disable-next-line no-unused-labels
		LSP: ({LanguageService} = require('./lib/lsp'));
		return new LanguageService(uri);
	},
};

const def: PropertyDescriptorMap = {
		default: {value: Parser},
	},
	enumerable = new Set([
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

// @ts-expect-error mixed export styles
export = Parser;
export default Parser;
export type {
	Config,
	LintError,
	TokenTypes,
	AST,
};
export type * from './internal';
