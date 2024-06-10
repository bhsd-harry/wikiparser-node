/* eslint n/exports-style: 0 */
import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
import {rules} from './base';
import {Shadow} from './util/debug';
import {
	MAX_STAGE,
	BuildMethod,

	/* NOT FOR BROWSER */

	classes,
	mixins,
	parsers,
	constants,
} from './util/constants';
import {tidy} from './util/string';
import {cmd, info, error, diff} from './util/diff';
import type {log} from './util/diff';
import type {Config, LintError, Parser as ParserBase} from './base';
import type {Title} from './lib/title';
import type {Token} from './internal';

declare interface Parser extends ParserBase {
	rules: readonly LintError.Rule[];

	/* NOT FOR BROWSER */

	viewOnly: boolean;

	conversionTable: Map<string, string>;
	redirects: Map<string, string>;

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

	parse(wikitext: string, include?: boolean, maxStage?: number, config?: Config): Token;

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
	file.startsWith('/') ? file : `../${file.includes('/') ? '' : dir}${file}`,
);

/* NOT FOR BROWSER */

const promises = [Promise.resolve()];
let viewOnly = false;

/* NOT FOR BROWSER END */

// eslint-disable-next-line @typescript-eslint/no-redeclare
const Parser: Parser = {
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

	conversionTable: new Map(),
	redirects: new Map(),

	warning: true,
	debugging: false,

	/* NOT FOR BROWSER END */

	/** @implements */
	getConfig() {
		if (typeof this.config === 'string') {
			this.config = rootRequire(this.config, 'config/') as Config;

			/* NOT FOR BROWSER */

			const {config: {conversionTable, redirects}} = this;
			if (conversionTable) {
				this.conversionTable = new Map(conversionTable);
			}
			if (redirects) {
				this.redirects = new Map(redirects);
			}

			/* NOT FOR BROWSER END */

			return this.getConfig();
		}
		return {
			...this.config,
			excludes: [],
		};
	},

	/** @implements */
	msg(msg, arg = '') {
		if (typeof this.i18n === 'string') {
			this.i18n = rootRequire(this.i18n, 'i18n/') as Record<string, string>;
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
		if (halfParsed) {
			return new Title(title, defaultNs, config, decode, selfLink);
		}
		const {Token}: typeof import('./src/index') = require('./src/index');
		return Shadow.run(() => {
			const root = new Token(title, config);
			root.type = 'root';
			root.parseOnce(0, include).parseOnce();
			const titleObj = new Title(root.toString(), defaultNs, config, decode, selfLink);
			for (const key of ['main', 'fragment'] as const) {
				const str = titleObj[key];
				if (str?.includes('\0')) {
					titleObj[key] = root.buildFromStr(str, BuildMethod.Text);
				}
			}

			/* NOT FOR BROWSER */

			titleObj.conversionTable = this.conversionTable;
			titleObj.redirects = this.redirects;

			/* NOT FOR BROWSER END */

			return titleObj;
		});
	},

	/** @implements */
	parse(wikitext, include, maxStage = MAX_STAGE, config = Parser.getConfig()) {
		wikitext = tidy(wikitext);
		const {Token}: typeof import('./src/index') = require('./src/index');
		const root = Shadow.run(() => {
			const token = new Token(wikitext, config);
			token.type = 'root';
			try {
				return token.parse(maxStage, include);
			} catch (e) {
				if (e instanceof Error) {
					const file = path.join(__dirname, '..', 'errors', new Date().toISOString()),
						stage = token.getAttribute('stage');
					fs.writeFileSync(file, stage === MAX_STAGE ? wikitext : token.toString());
					fs.writeFileSync(`${file}.err`, e.stack!);
					fs.writeFileSync(`${file}.json`, JSON.stringify({stage, include, config}, null, '\t'));
				}
				throw e;
			}
		});

		/* NOT FOR BROWSER */

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

	/* NOT FOR BROWSER */

	/** @implements */
	warn(msg, ...args) {
		if (this.warning) {
			console.warn(chalk.yellow(msg), ...args);
		}
	},
	/** @implements */
	debug(msg, ...args) {
		if (this.debugging) {
			console.debug(chalk.blue(msg), ...args);
		}
	},
	error,
	info,

	/** @implements */
	log(f) {
		if (typeof f === 'function') {
			console.log(String(f));
		}
	},

	/** @implements */
	async clearCache(): Promise<void> {
		const promise = cmd('npm', ['run', 'build:core']),
			entries = [
				...Object.entries(classes),
				...Object.entries(mixins),
				...Object.entries(parsers),
				...Object.entries(constants),
			];
		for (const [, filePath] of entries) {
			try {
				delete require.cache[require.resolve(filePath)];
			} catch {}
		}
		await promise;
		for (const [name, filePath] of entries) {
			if (name in global) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				Object.assign(global, {[name]: require(filePath)[name]});
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
				.exec(title.replace(/_/gu, ' ').replace(/^\s*:?\s*/u, ''))
			: null;
	},

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

		/* NOT FOR BROWSER */

		'conversionTable',
		'redirects',
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
export type {Config, LintError};
export type * from './internal';
