// PHP解析器的步骤：
// -2. 替换签名和`{{subst:}}`，参见Parser::preSaveTransform；这在revision中不可能保留，可以跳过
// -1. 移除特定字符`\0`和`\x7F`，参见Parser::parse
// 0. 重定向，参见WikitextContentHandler::extractRedirectTargetAndText
// 1. 注释/扩展标签（'<'相关），参见Preprocessor_Hash::buildDomTreeArrayFromText和Sanitizer::decodeTagAttributes
// 2. 模板/模板变量/标题，注意rightmost法则，以及`-{`和`[[`可以破坏`{{`或`{{{`语法，
//    参见Preprocessor_Hash::buildDomTreeArrayFromText
// 3. HTML标签（允许不匹配），参见Sanitizer::internalRemoveHtmlTags
// 4. 表格，参见Parser::handleTables
// 5. 水平线、状态开关和余下的标题，参见Parser::internalParse
// 6. 内链，含文件和分类，参见Parser::handleInternalLinks2
// 7. `'`，参见Parser::doQuotes
// 8. 外链，参见Parser::handleExternalLinks
// 9. ISBN、RFC和自由外链，参见Parser::handleMagicLinks
// 10. 段落和列表，参见BlockLevelPass::execute
// 11. 转换，参见LanguageConverter::recursiveConvertTopLevel
// \0\d+.\x7F标记Token：
// !: `{{!}}`专用
// {: `{{(!}}`专用
// }: `{{!)}}`专用
// -: `{{!-}}`专用
// +: `{{!!}}`专用
// ~: `{{=}}`专用
// a: AttributeToken
// b: TableToken
// c: CommentToke
// d: ListToken
// e: ExtToken
// f: ImageParameterToken内的MagicLinkToken
// g: TranslateToken或OnlyincludeToken
// h: HeadingToken
// i: RFC/PMID/ISBN
// l: LinkToken
// m: `{{server}}`、`{{fullurl:}}`、`{{canonicalurl:}}`或`{{filepath:}}`
// n: NoIncludeToken、IncludeToken、TvarToken、DoubleUnderscoreToken或`{{#vardefine:}}`
// o: RedirectToken
// q: QuoteToken
// r: HrToken
// s: `{{{|subst:}}}`
// t: ArgToken或TranscludeToken
// u: `__toc__`
// v: ConverterToken
// w: ExtLinkToken或free-ext-link
// x: HtmlToken

import {
	text,
} from '../util/string';
import {
	MAX_STAGE,
	BuildMethod,
} from '../util/constants';
import {
	generateForSelf,
	cache,
	fixByRemove,
} from '../util/lint';
import {
	setChildNodes,
} from '../util/debug';
import Parser from '../index';
import {AstElement} from '../lib/element';
import {AstText} from '../lib/text';
import type {LintError, TokenTypes} from '../base';
import type {Cached} from '../util/lint';
import type {Title, TitleOptions} from '../lib/title';
import type {
	AstNodes,
	CategoryToken,
	AttributeToken,
	AttributesToken,
} from '../internal';

declare interface LintIgnore {
	line: number;
	from: number | undefined;
	to: number | undefined;
	rules: Set<string> | undefined;
}
declare type ExtendedLintError = LintError[] & {
	output?: string;
};

const lintSelectors = ['category', 'html-attr#id,ext-attr#id,table-attr#id'];

/**
 * base class for all tokens
 *
 * 所有节点的基类
 * @classdesc `{childNodes: (AstText|Token)[]}`
 */
export class Token extends AstElement {
	#type: TokenTypes = 'plain';

	/** 解析阶段，参见顶部注释。只对plain Token有意义。 */
	#stage = 0;
	readonly #config;

	/** 这个数组起两个作用：1. 数组中的Token会在build时替换`/\0\d+.\x7F/`标记；2. 数组中的Token会依次执行parseOnce和build方法。 */
	readonly #accum;
	#include?: boolean;
	#built = false;
	#string: Cached<string> | undefined;
	#pageName: string | undefined;

	override get type(): TokenTypes {
		return this.#type;
	}

	override set type(value) {
		this.#type = value;
	}

	/**
	 * page name
	 *
	 * 页面名称
	 * @since v1.29.0
	 */
	get pageName(): string | undefined {
		return this.getRootNode().#pageName;
	}

	set pageName(value: string | undefined) {
		if (value) {
			const title = this.normalizeTitle(value, 0, {temporary: true, page: ''});
			this.#pageName = title.valid ? title.title : undefined;
		} else {
			this.#pageName = value === '' ? '' : undefined;
		}
	}

	/** @class */
	constructor(
		wikitext?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable?: WikiParserAcceptable,
	) {
		super();
		if (typeof wikitext === 'string') {
			this.insertAt(wikitext);
		}
		this.#config = config;
		this.#accum = accum;
		accum.push(this);
	}

	/** @private */
	parseOnce(n = this.#stage, include = false, tidy?: boolean): this {
		if (n < this.#stage || this.length === 0 || !this.isPlain()) {
			return this;
		} else if (this.#stage >= MAX_STAGE) {
			return this;
		}
		switch (n) {
			case 0:
				if (this.type === 'root') {
					this.#accum.pop();
					const isRedirect = this.#parseRedirect();
					include &&= !isRedirect;
				}
				this.#include = include;
				this.#parseCommentAndExt(include);
				break;
			case 1:
				this.#parseBraces();
				break;
			case 2:
				this.#parseHtml();
				break;
			case 3:
				this.#parseTable();
				break;
			case 4:
				this.#parseHrAndDoubleUnderscore();
				break;
			case 5:
				this.#parseLinks(tidy);
				break;
			case 6:
				this.#parseQuotes(tidy);
				break;
			case 7:
				this.#parseExternalLinks();
				break;
			case 8:
				this.#parseMagicLinks();
				break;
			case 9:
				this.#parseList();
				break;
			case 10:
				this.#parseConverter();
				// no default
		}
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token?.parseOnce(n, include, tidy); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			}
		}
		this.#stage++;
		return this;
	}

	/** @private */
	buildFromStr(str: string, type: BuildMethod): string;
	/** @private */
	buildFromStr(str: string): AstNodes[];
	/** @private */
	buildFromStr(str: string, type?: BuildMethod): string | readonly AstNodes[] {
		const nodes = str.split(/[\0\x7F]/u).map((s, i) => {
			if (i % 2 === 0) {
				return new AstText(s);
			} else if (isNaN(s.slice(-1) as unknown as number)) {
				return this.#accum[Number(s.slice(0, -1))]!;
			}
			throw new Error(`Failed to build! Unrecognized token: ${s}`);
		});
		if (type === BuildMethod.String) {
			return nodes.map(String).join('');
		} else if (type === BuildMethod.Text) {
			return text(nodes);
		}
		return nodes;
	}

	/** @private */
	build(): void {
		this.#stage = MAX_STAGE;
		const {length, firstChild} = this,
			str = firstChild?.toString();
		if (length === 1 && firstChild!.type === 'text' && str!.includes('\0')) {
			setChildNodes(this, 0, 1, this.buildFromStr(str!));
			this.normalize();
			if (this.type === 'root') {
				for (const token of this.#accum) {
					token?.build(); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				}
			}
		}
	}

	/** @private */
	afterBuild(): void {
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token?.afterBuild(); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			}
		}
		this.#built = true;
	}

	/** @private */
	parse(n = MAX_STAGE, include?: boolean, tidy?: boolean): this {
		n = Math.min(n, MAX_STAGE);
		while (this.#stage < n) {
			this.parseOnce(this.#stage, include, tidy);
		}
		if (n) {
			this.build();
			this.afterBuild();
		}
		return this;
	}

	/** 解析重定向 */
	#parseRedirect(): boolean {
		const {parseRedirect}: typeof import('../parser/redirect') = require('../parser/redirect');
		const wikitext = this.firstChild!.toString(),
			parsed = parseRedirect(wikitext, this.#config, this.#accum);
		if (parsed) {
			this.setText(parsed);
		}
		return Boolean(parsed);
	}

	/**
	 * 解析HTML注释和扩展标签
	 * @param includeOnly 是否嵌入
	 */
	#parseCommentAndExt(includeOnly: boolean): void {
		const {parseCommentAndExt}: typeof import('../parser/commentAndExt') = require('../parser/commentAndExt');
		this.setText(parseCommentAndExt(this.firstChild!.toString(), this.#config, this.#accum, includeOnly));
	}

	/** 解析花括号 */
	#parseBraces(): void {
		const {parseBraces}: typeof import('../parser/braces') = require('../parser/braces');
		const str = this.type === 'root' ? this.firstChild!.toString() : `\0${this.firstChild!.toString()}`,
			parsed = parseBraces(str, this.#config, this.#accum);
		this.setText(this.type === 'root' ? parsed : parsed.slice(1));
	}

	/** 解析HTML标签 */
	#parseHtml(): void {
		if (this.#config.excludes.includes('html')) {
			return;
		}
		const {parseHtml}: typeof import('../parser/html') = require('../parser/html');
		this.setText(parseHtml(this.firstChild!.toString(), this.#config, this.#accum));
	}

	/** 解析表格 */
	#parseTable(): void {
		if (this.#config.excludes.includes('table')) {
			return;
		}
		const {parseTable}: typeof import('../parser/table') = require('../parser/table');
		this.setText(parseTable(this as Token & {firstChild: AstText}, this.#config, this.#accum));
	}

	/** 解析`<hr>`和状态开关 */
	#parseHrAndDoubleUnderscore(): void {
		if (this.#config.excludes.includes('hr')) {
			return;
		}
		const {parseHrAndDoubleUnderscore}: typeof import('../parser/hrAndDoubleUnderscore') =
			require('../parser/hrAndDoubleUnderscore');
		this.setText(parseHrAndDoubleUnderscore(this as Token & {firstChild: AstText}, this.#config, this.#accum));
	}

	/**
	 * 解析内部链接
	 * @param tidy 是否整理
	 */
	#parseLinks(tidy?: boolean): void {
		const {parseLinks}: typeof import('../parser/links') = require('../parser/links');
		this.setText(parseLinks(this.firstChild!.toString(), this.#config, this.#accum, this.pageName, tidy));
	}

	/**
	 * 解析单引号
	 * @param tidy 是否整理
	 */
	#parseQuotes(tidy?: boolean): void {
		if (this.#config.excludes.includes('quote')) {
			return;
		}
		const {parseQuotes}: typeof import('../parser/quotes') = require('../parser/quotes');
		const lines = this.firstChild!.toString().split('\n');
		for (let i = 0; i < lines.length; i++) {
			lines[i] = parseQuotes(lines[i]!, this.#config, this.#accum, tidy);
		}
		this.setText(lines.join('\n'));
	}

	/** 解析外部链接 */
	#parseExternalLinks(): void {
		if (this.#config.excludes.includes('extLink')) {
			return;
		}
		const {parseExternalLinks}: typeof import('../parser/externalLinks') = require('../parser/externalLinks');
		this.setText(parseExternalLinks(this.firstChild!.toString(), this.#config, this.#accum));
	}

	/** 解析自由外链 */
	#parseMagicLinks(): void {
		if (this.#config.excludes.includes('magicLink')) {
			return;
		}
		const {parseMagicLinks}: typeof import('../parser/magicLinks') = require('../parser/magicLinks');
		this.setText(parseMagicLinks(this.firstChild!.toString(), this.#config, this.#accum));
	}

	/** 解析列表 */
	#parseList(): void {
		if (this.#config.excludes.includes('list')) {
			return;
		}
		const {parseList}: typeof import('../parser/list') = require('../parser/list');
		const {firstChild, type, name} = this,
			lines = firstChild!.toString().split('\n'),
			state = {lastPrefix: ''};
		let i = type === 'root' || type === 'ext-inner' && name === 'poem' ? 0 : 1;
		for (; i < lines.length; i++) {
			lines[i] = parseList(lines[i]!, state, this.#config, this.#accum);
		}
		this.setText(lines.join('\n'));
	}

	/** 解析语言变体转换 */
	#parseConverter(): void {
		if (this.#config.variants.length > 0) {
			const {parseConverter}: typeof import('../parser/converter') = require('../parser/converter');
			this.setText(parseConverter(this.firstChild!.toString(), this.#config, this.#accum));
		}
	}

	/** @private */
	isPlain(): boolean {
		return this.constructor === Token;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		switch (key) {
			case 'config':
				return this.#config as TokenAttribute<T>;
			case 'include':
				return (this.#include ?? Boolean(this.getRootNode().#include)) as TokenAttribute<T>;
			case 'accum':
				return this.#accum as TokenAttribute<T>;
			case 'built':
				return this.#built as TokenAttribute<T>;
			case 'stage':
				return this.#stage as TokenAttribute<T>;
			default:
				return super.getAttribute(key);
		}
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
		switch (key) {
			case 'stage':
				if (this.#stage === 0 && this.type === 'root') {
					this.#accum.shift();
				}
				this.#stage = value as TokenAttribute<'stage'>;
				break;
			default:
				super.setAttribute(key, value);
		}
	}

	/**
	 * @override
	 * @param child node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	override insertAt(child: string, i?: number): AstText;
	override insertAt<T extends AstNodes>(child: T, i?: number): T;
	override insertAt<T extends AstNodes>(child: T | string, i = this.length): T | AstText {
		const token = typeof child === 'string' ? new AstText(child) : child;
		super.insertAt(token, i);
		const {
			type,
		} = token;
		if (type === 'root') {
			token.type = 'plain';
		}
		return token;
	}

	/** @private */
	normalizeTitle(title: string, defaultNs = 0, opt?: TitleOptions): Title {
		return Parser.normalizeTitle(
			title,
			defaultNs,
			this.getAttribute('include'),
			this.#config,
			{page: this.pageName, ...opt},
		);
	}

	/** @private */
	inTableAttrs(): 1 | 2 | false {
		return this.isInside('table-attrs') && (
			this.closest('table-attrs,arg,parameter')?.is<AttributesToken>('table-attrs')
				? 2
				: 1
		);
	}

	/** @private */
	inHtmlAttrs(): 1 | 2 | false {
		return this.isInside('html-attrs') ? 2 : this.inTableAttrs();
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp | false): ExtendedLintError {
		LINT: {
			const {lintConfig} = Parser,
				{computeEditInfo, fix: needFix, ignoreDisables, configurationComment} = lintConfig;
			let errors = super.lint(start, re);
			if (this.type === 'root') {
				const record = new Map<string, Set<CategoryToken | AttributeToken>>(),
					r = 'no-duplicate',
					s = ['category', 'id'].map(key => lintConfig.getSeverity(r, key)),
					wikitext = this.toString(),
					selector = lintSelectors.filter((_, i) => s[i]).join();
				if (selector) {
					for (const cat of this.querySelectorAll<CategoryToken | AttributeToken>(selector)) {
						let key;
						if (cat.is<CategoryToken>('category')) {
							key = cat.name;
						} else {
							const value = cat.getValue();
							if (value && value !== true) {
								key = `#${value}`;
							}
						}
						if (key) {
							const thisCat = record.get(key);
							if (thisCat) {
								thisCat.add(cat);
							} else {
								record.set(key, new Set([cat]));
							}
						}
					}
					for (const [key, value] of record) {
						if (value.size > 1 && !key.startsWith('#mw-customcollapsible-')) {
							const isCat = !key.startsWith('#'),
								msg: 'duplicate-category' | 'duplicate-id' = `duplicate-${isCat ? 'category' : 'id'}`,
								severity = s[isCat ? 0 : 1] as LintError.Severity;
							errors.push(...[...value].map(cat => {
								const e = generateForSelf(cat, {start: cat.getAbsoluteIndex()}, r, msg, severity);
								if (computeEditInfo && isCat) {
									e.suggestions = [fixByRemove(e)];
								}
								return e;
							}));
						}
					}
				}
				if (!ignoreDisables) {
					const regex = new RegExp(
							String.raw`<!--\s*${
								configurationComment
							}-(disable(?:(?:-next)?-line)?|enable)(\s[\sa-z,-]*)?-->`,
							'gu',
						),
						ignores: LintIgnore[] = [];
					let mt = regex.exec(wikitext);
					while (mt) {
						const {1: type, index} = mt,
							detail = mt[2]?.trim();
						ignores.push({
							line: this.posFromIndex(index)!.top + (type === 'disable-line' ? 0 : 1),
							from: type === 'disable' ? regex.lastIndex : undefined,
							to: type === 'enable' ? regex.lastIndex : undefined,
							rules: detail ? new Set(detail.split(',').map(rule => rule.trim())) : undefined,
						});
						mt = regex.exec(wikitext);
					}
					errors = errors.filter(({rule, startLine, startIndex}) => {
						const nearest: {pos: number, type?: 'from' | 'to'} = {pos: 0};
						for (const {line, from, to, rules} of ignores) {
							if (line > startLine + 1) {
								break;
							} else if (rules && !rules.has(rule)) {
								continue;
							} else if (line === startLine && from === undefined && to === undefined) {
								return false;
							} else if (from! <= startIndex && from! > nearest.pos) {
								nearest.pos = from!;
								nearest.type = 'from';
							} else if (to! <= startIndex && to! > nearest.pos) {
								nearest.pos = to!;
								nearest.type = 'to';
							}
						}
						return nearest.type !== 'from';
					});
				}
				if (needFix && errors.some(({fix}) => fix)) {
					// 倒序修复，跳过嵌套的修复
					const fixable = (errors.map(({fix}) => fix).filter(Boolean) as LintError.Fix[]).sort(
						({range: [aFrom, aTo]}, {range: [bFrom, bTo]}) => aTo === bTo ? bFrom - aFrom : bTo - aTo,
					);
					let i = Infinity,
						output = wikitext;
					for (const {range: [from, to], text: t} of fixable) {
						if (to <= i) {
							output = output.slice(0, from) + t + output.slice(to);
							i = from;
						}
					}
					Object.assign(errors, {output});
				}
				if (!computeEditInfo) {
					for (const e of errors) {
						delete e.fix;
						delete e.suggestions;
					}
				}
			}
			return errors;
		}
	}

	/** @private */
	override toString(skip?: boolean, separator?: string): string {
		return skip
			? super.toString(true, separator)
			: cache<string>(
				this.#string,
				() => super.toString(false, separator),
				value => {
					const root = this.getRootNode();
					if (root.type === 'root' && root.#built) {
						this.#string = value;
					}
				},
			);
	}
}
