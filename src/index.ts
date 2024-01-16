// PHP解析器的步骤：
// -1. 替换签名和`{{subst:}}`，参见Parser::preSaveTransform；这在revision中不可能保留，可以跳过
// 0. 移除特定字符`\0`和`\x7F`，参见Parser::parse
// 1. 注释/扩展标签（'<'相关），参见Preprocessor_Hash::buildDomTreeArrayFromText和Sanitizer::decodeTagAttributes
// 2. 模板/模板变量/标题，注意rightmost法则，以及`-{`和`[[`可以破坏`{{`或`{{{`语法，
//    参见Preprocessor_Hash::buildDomTreeArrayFromText
// 3. HTML标签（允许不匹配），参见Sanitizer::internalRemoveHtmlTags
// 4. 表格，参见Parser::handleTables
// 5. 水平线、状态开关和余下的标题，参见Parser::internalParse
// 6. 内链，含文件和分类，参见Parser::handleInternalLinks2
// 7. `'`，参见Parser::doQuotes
// 8. 外链，参见Parser::handleExternalLinks
// 9. ISBN、RFC（未来将废弃，不予支持）和自由外链，参见Parser::handleMagicLinks
// 10. 段落和列表，参见BlockLevelPass::execute
// 11. 转换，参见LanguageConverter::recursiveConvertTopLevel
// \0\d+.\x7F标记Token：
// e: ExtToken
// a: AttributeToken
// c: CommentToken、NoIncludeToken和IncludeToken
// !: `{{!}}`专用
// {: `{{(!}}`专用
// }: `{{!)}}`专用
// -: `{{!-}}`专用
// +: `{{!!}}`专用
// ~: `{{=}}`专用
// s: `{{{|subst:}}}`
// m: `{{fullurl:}}`、`{{canonicalurl:}}`或`{{filepath:}}`
// t: ArgToken或TranscludeToken
// h: HeadingToken
// x: HtmlToken
// b: TableToken
// r: HrToken
// u: DoubleUnderscoreToken
// l: LinkToken
// q: QuoteToken
// w: ExtLinkToken
// d: ListToken
// v: ConverterToken

import {text} from '../util/string';
import {
	MAX_STAGE,
} from '../util/constants';
import * as Parser from '../index';
import {AstElement} from '../lib/element';
import {AstText} from '../lib/text';
import type {Title} from '../lib/title';
import type {
	AstNodes,
} from '../internal';
import type {TokenTypes} from '../util/constants';

/**
 * 所有节点的基类
 * @classdesc `{childNodes: ...(AstText|Token)}`
 */
export class Token extends AstElement {
	override type: TokenTypes = 'root';

	/** 解析阶段，参见顶部注释。只对plain Token有意义。 */
	#stage = 0;
	readonly #config;

	/** 这个数组起两个作用：1. 数组中的Token会在build时替换`/\0\d+.\x7F/`标记；2. 数组中的Token会依次执行parseOnce和build方法。 */
	readonly #accum;
	#include?: boolean;

	/** @class */
	constructor(
		wikitext?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable?: Acceptable,
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
	parseOnce(n = this.#stage, include = false): this {
		if (n < this.#stage || !this.getAttribute('plain') || this.length === 0) {
			return this;
		} else if (this.#stage >= MAX_STAGE) {
			return this;
		}
		switch (n) {
			case 0:
				if (this.type === 'root') {
					this.#accum.shift();
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
				this.#parseLinks();
				break;
			case 6:
				this.#parseQuotes();
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
				token.parseOnce(n, include);
			}
		}
		this.#stage++;
		return this;
	}

	/** @private */
	buildFromStr(str: string, type: 'string' | 'text'): string;
	/** @private */
	buildFromStr(str: string): readonly AstNodes[];
	/** @private */
	buildFromStr(str: string, type?: string): string | readonly AstNodes[] {
		const nodes = str.split(/[\0\x7F]/u).map((s, i) => {
			if (i % 2 === 0) {
				return new AstText(s);
			} else if (Number.isNaN(Number(s.at(-1)))) {
				return this.#accum[Number(s.slice(0, -1))]!;
			}
			throw new Error(`解析错误！未正确标记的 Token：${s}`);
		});
		if (type === 'string') {
			return nodes.map(String).join('');
		} else if (type === 'text') {
			return text(nodes);
		}
		return nodes;
	}

	/** 将占位符替换为子Token */
	#build(): void {
		this.#stage = MAX_STAGE;
		const {length, firstChild} = this,
			str = String(firstChild);
		if (length === 1 && firstChild!.type === 'text' && str.includes('\0')) {
			this.replaceChildren(...this.buildFromStr(str));
			this.normalize();
			if (this.type === 'root') {
				for (const token of this.#accum) {
					token.#build();
				}
			}
		}
	}

	/** @private */
	afterBuild(): void {
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token.afterBuild();
			}
		}
	}

	/** @private */
	parse(n = MAX_STAGE, include = false): this {
		n = Math.min(n, MAX_STAGE);
		while (this.#stage < n) {
			this.parseOnce(this.#stage, include);
		}
		if (n) {
			this.#build();
			this.afterBuild();
		}
		return this;
	}

	/**
	 * 解析HTML注释和扩展标签
	 * @param includeOnly 是否嵌入
	 */
	#parseCommentAndExt(includeOnly: boolean): void {
		const {parseCommentAndExt}: typeof import('../parser/commentAndExt') = require('../parser/commentAndExt');
		this.setText(parseCommentAndExt(String(this.firstChild!), this.#config, this.#accum, includeOnly));
	}

	/** 解析花括号 */
	#parseBraces(): void {
		const {parseBraces}: typeof import('../parser/braces') = require('../parser/braces');
		const str = this.type === 'root' ? String(this.firstChild!) : `\0${String(this.firstChild!)}`,
			parsed = parseBraces(str, this.#config, this.#accum);
		this.setText(this.type === 'root' ? parsed : parsed.slice(1));
	}

	/** 解析HTML标签 */
	#parseHtml(): void {
		if (this.#config.excludes?.includes('html')) {
			return;
		}
		const {parseHtml}: typeof import('../parser/html') = require('../parser/html');
		this.setText(parseHtml(String(this.firstChild!), this.#config, this.#accum));
	}

	/** 解析表格 */
	#parseTable(): void {
		if (this.#config.excludes?.includes('table')) {
			return;
		}
		const {parseTable}: typeof import('../parser/table') = require('../parser/table');
		this.setText(parseTable(this as Token & {firstChild: AstText}, this.#config, this.#accum));
	}

	/** 解析`<hr>`和状态开关 */
	#parseHrAndDoubleUnderscore(): void {
		if (this.#config.excludes?.includes('hr')) {
			return;
		}
		const {parseHrAndDoubleUnderscore}: typeof import('../parser/hrAndDoubleUnderscore')
			= require('../parser/hrAndDoubleUnderscore');
		this.setText(parseHrAndDoubleUnderscore(this as Token & {firstChild: AstText}, this.#config, this.#accum));
	}

	/** 解析内部链接 */
	#parseLinks(): void {
		const {parseLinks}: typeof import('../parser/links') = require('../parser/links');
		this.setText(parseLinks(String(this.firstChild!), this.#config, this.#accum));
	}

	/** 解析单引号 */
	#parseQuotes(): void {
		if (this.#config.excludes?.includes('quote')) {
			return;
		}
		const {parseQuotes}: typeof import('../parser/quotes') = require('../parser/quotes');
		const lines = String(this.firstChild!).split('\n');
		for (let i = 0; i < lines.length; i++) {
			lines[i] = parseQuotes(lines[i]!, this.#config, this.#accum);
		}
		this.setText(lines.join('\n'));
	}

	/** 解析外部链接 */
	#parseExternalLinks(): void {
		if (this.#config.excludes?.includes('extLink')) {
			return;
		}
		const {parseExternalLinks}: typeof import('../parser/externalLinks') = require('../parser/externalLinks');
		this.setText(parseExternalLinks(String(this.firstChild!), this.#config, this.#accum));
	}

	/** 解析自由外链 */
	#parseMagicLinks(): void {
		if (this.#config.excludes?.includes('magicLink')) {
			return;
		}
		const {parseMagicLinks}: typeof import('../parser/magicLinks') = require('../parser/magicLinks');
		this.setText(parseMagicLinks(String(this.firstChild!), this.#config, this.#accum));
	}

	/** 解析列表 */
	#parseList(): void {
		if (this.#config.excludes?.includes('list')) {
			return;
		}
		const {parseList}: typeof import('../parser/list') = require('../parser/list');
		const lines = String(this.firstChild!).split('\n');
		let i = this.type === 'root' || this.type === 'ext-inner' && this.name === 'poem' ? 0 : 1;
		for (; i < lines.length; i++) {
			lines[i] = parseList(lines[i]!, this.#config, this.#accum);
		}
		this.setText(lines.join('\n'));
	}

	/** 解析语言变体转换 */
	#parseConverter(): void {
		if (this.#config.variants.length > 0) {
			const {parseConverter}: typeof import('../parser/converter') = require('../parser/converter');
			this.setText(parseConverter(String(this.firstChild!), this.#config, this.#accum));
		}
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		switch (key) {
			case 'plain':
				return (this.constructor === Token) as TokenAttributeGetter<T>;
			case 'config':
				return structuredClone(this.#config) as TokenAttributeGetter<T>;
			case 'accum':
				return this.#accum as TokenAttributeGetter<T>;
			case 'include': {
				if (this.#include !== undefined) {
					return this.#include as TokenAttributeGetter<T>;
				}
				const root = this.getRootNode();
				if (root !== this) {
					return root.getAttribute('include') as TokenAttributeGetter<T>;
				}
				return false as TokenAttributeGetter<T>;
			}
			default:
				return super.getAttribute(key);
		}
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttributeSetter<T>): void {
		switch (key) {
			case 'stage':
				if (this.#stage === 0 && this.type === 'root') {
					this.#accum.shift();
				}
				this.#stage = (value as TokenAttributeSetter<'stage'>)!;
				break;
			default:
				super.setAttribute(key, value);
		}
	}

	/**
	 * @override
	 * @param child 待插入的子节点
	 * @param i 插入位置
	 */
	override insertAt(child: string, i?: number): AstText;
	/** @ignore */
	override insertAt<T extends AstNodes>(child: T, i?: number): T;
	/** @ignore */
	override insertAt<T extends AstNodes>(child: T | string, i = this.length): T | AstText {
		const token = typeof child === 'string' ? new AstText(child) : child;
		super.insertAt(token, i);
		if (token.type === 'root') {
			token.type = 'plain';
		}
		return token;
	}

	/**
	 * 规范化页面标题
	 * @param title 标题（含或不含命名空间前缀）
	 * @param defaultNs 命名空间
	 * @param halfParsed 仅供内部使用
	 * @param decode 是否需要解码
	 * @param selfLink 是否允许selfLink
	 */
	normalizeTitle(
		title: string,
		defaultNs = 0,
		halfParsed = false,
		decode = false,
		selfLink = false,
	): Title {
		return Parser.normalizeTitle(title, defaultNs, this.#include, this.#config, halfParsed, decode, selfLink);
	}
}
