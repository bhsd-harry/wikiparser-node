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

import * as assert from 'assert/strict';
import {text} from '../util/string';
import {Shadow} from '../util/debug';
import {
	MAX_STAGE,
	aliases,
	classes,
} from '../util/constants';
import {Ranges} from '../lib/ranges';
import {AstRange} from '../lib/range';
import * as Parser from '../index';
import {AstElement} from '../lib/element';
import {AstText} from '../lib/text';
import type {Range} from '../lib/ranges';
import type {Title} from '../lib/title';
import type {
	AstNodes,
	IncludeToken,
	HtmlToken,
	ExtToken,
	ArgToken,
	TranscludeToken,
	CommentToken,
	HeadingToken,
	CategoryToken,
	ParameterToken,
	SyntaxToken,
} from '../internal';
import type {
	TokenTypes,
	CaretPosition,
} from '../lib/node';

declare type TagToken = IncludeToken | ExtToken | HtmlToken;

/**
 * 所有节点的基类
 * @classdesc `{childNodes: ...(AstText|Token)}`
 */
export class Token extends AstElement {
	override type: TokenTypes = 'root';

	/** 解析阶段，参见顶部注释。只对plain Token有意义。 */
	#stage = 0;
	#config;

	/** 这个数组起两个作用：1. 数组中的Token会在build时替换`/\0\d+.\x7F/`标记；2. 数组中的Token会依次执行parseOnce和build方法。 */
	#accum;
	#include?: boolean;

	/* NOT FOR BROWSER */

	#acceptable?: Record<string, Ranges>;
	#protectedChildren = new Ranges();

	/** 所有图片，包括图库 */
	get images(): Token[] {
		return this.querySelectorAll('file, gallery-image, imagemap-image');
	}

	/** 所有内链、外链和自由外链 */
	get links(): Token[] {
		return this.querySelectorAll('link, ext-link, free-ext-link, image-parameter#link');
	}

	/** 所有模板和模块 */
	get embeds(): TranscludeToken[] {
		return this.querySelectorAll('template, magic-word#invoke') as TranscludeToken[];
	}

	/* NOT FOR BROWSER END */

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
		this.setAttribute('acceptable', acceptable);
		accum.push(this);
	}

	/** @private */
	parseOnce(n = this.#stage, include = false): this {
		if (n < this.#stage || !this.getAttribute('plain') || this.length === 0) {
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
	buildFromStr(str: string): AstNodes[];
	/** @private */
	buildFromStr(str: string, type?: string): string | AstNodes[] {
		const nodes = str.split(/[\0\x7F]/u).map((s, i) => {
			if (i % 2 === 0) {
				return new AstText(s);
			// @ts-expect-error isNaN
			} else if (isNaN(s.at(-1))) {
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
				const includeToken = root.getElementByTypes('include');
				if (includeToken) {
					return (includeToken.name === 'noinclude') as TokenAttributeGetter<T>;
				}
				const noincludeToken = root.getElementByTypes('noinclude');
				return (
					Boolean(noincludeToken) && !/^<\/?noinclude(?:\s[^>]*)?\/?>$/iu.test(String(noincludeToken))
				) as TokenAttributeGetter<T>;
			}
			case 'stage':
				return this.#stage as TokenAttributeGetter<T>;
			case 'acceptable':
				return (this.#acceptable ? {...this.#acceptable} : undefined) as TokenAttributeGetter<T>;
			case 'protectedChildren':
				return new Ranges(this.#protectedChildren) as TokenAttributeGetter<T>;
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
			case 'acceptable': {
				const acceptable: Record<string, Ranges> = {};
				if (value) {
					for (const [k, v] of Object.entries(value as unknown as Acceptable)) {
						if (k.startsWith('Stage-')) {
							for (let i = 0; i <= Number(k.slice(6)); i++) {
								for (const type of aliases[i]!) {
									acceptable[type] = new Ranges(v);
								}
							}
						} else if (k.startsWith('!')) { // `!`项必须放在最后
							delete acceptable[k.slice(1)];
						} else {
							acceptable[k] = new Ranges(v);
						}
					}
				}
				this.#acceptable = value && acceptable;
				break;
			}
			default:
				super.setAttribute(key, value);
		}
	}

	/**
	 * @override
	 * @param child 待插入的子节点
	 * @param i 插入位置
	 * @throws `RangeError` 不可插入的子节点
	 */
	override insertAt(child: string, i?: number): AstText;
	/** @ignore */
	override insertAt<T extends AstNodes>(child: T, i?: number): T;
	/** @ignore */
	override insertAt<T extends AstNodes>(child: T | string, i = this.length): T | AstText {
		const token = typeof child === 'string' ? new AstText(child) : child;
		if (!Shadow.running && this.#acceptable) {
			const acceptableIndices = Object.fromEntries(
					Object.entries(this.#acceptable).map(([str, ranges]) => [str, ranges.applyTo(this.length + 1)]),
				),
				nodesAfter = this.childNodes.slice(i),
				{constructor: {name: insertedName}} = token;
			i += i < 0 ? this.length : 0;
			if (!acceptableIndices[insertedName]?.includes(i)) {
				throw new RangeError(`${this.constructor.name} 的第 ${i} 个子节点不能为 ${insertedName}！`);
			} else if (nodesAfter.some(({constructor: {name}}, j) => !acceptableIndices[name]?.includes(i + j + 1))) {
				throw new Error(`${this.constructor.name} 插入新的第 ${i} 个子节点会破坏规定的顺序！`);
			}
		}
		super.insertAt(token, i);
		if (token.constructor === Token && this.getAttribute('plain')) {
			Parser.warn('您正将一个普通节点作为另一个普通节点的子节点，请考虑要不要执行 flatten 方法。');
		}
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

	/* NOT FOR BROWSER */

	/** @private */
	protected protectChildren(...args: (string | number | Range)[]): void {
		this.#protectedChildren.push(...new Ranges(args));
	}

	/**
	 * @override
	 * @param i 移除位置
	 * @throws `Error` 不可移除的子节点
	 */
	override removeAt(i: number): AstNodes {
		i += i < 0 ? this.length : 0;
		if (!Shadow.running) {
			const protectedIndices = this.#protectedChildren.applyTo(this.childNodes);
			if (protectedIndices.includes(i)) {
				throw new Error(`${this.constructor.name} 的第 ${i} 个子节点不可移除！`);
			} else if (this.#acceptable) {
				const acceptableIndices = Object.fromEntries(
						Object.entries(this.#acceptable).map(([str, ranges]) => [str, ranges.applyTo(this.length - 1)]),
					),
					nodesAfter = this.childNodes.slice(i + 1);
				if (nodesAfter.some(({constructor: {name}}, j) => !acceptableIndices[name]?.includes(i + j))) {
					throw new Error(`移除 ${this.constructor.name} 的第 ${i} 个子节点会破坏规定的顺序！`);
				}
			}
		}
		return super.removeAt(i);
	}

	/**
	 * 替换为同类节点
	 * @param token 待替换的节点
	 * @throws `Error` 不存在父节点
	 * @throws `Error` 待替换的节点具有不同属性
	 */
	safeReplaceWith(token: this): void {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('不存在父节点！');
		} else if (token.constructor !== this.constructor) {
			this.typeError('safeReplaceWith', this.constructor.name);
		}
		try {
			assert.deepEqual(token.getAttribute('acceptable'), this.#acceptable);
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				throw new Error(`待替换的 ${this.constructor.name} 带有不同的 #acceptable 属性！`);
			}
			throw e;
		}
		const i = parentNode.childNodes.indexOf(this);
		super.removeAt.call(parentNode, i);
		super.insertAt.call(parentNode, token, i);
		if (token.type === 'root') {
			token.type = 'plain';
		}
		const e = new Event('replace', {bubbles: true});
		token.dispatchEvent(e, {position: i, oldToken: this, newToken: token});
	}

	/**
	 * 创建HTML注释
	 * @param data 注释内容
	 */
	createComment(data = ''): CommentToken {
		const {CommentToken}: typeof import('./nowiki/comment') = require('./nowiki/comment');
		const config = this.getAttribute('config');
		return Shadow.run(() => new CommentToken(data.replaceAll('-->', '--&gt;'), true, config));
	}

	/**
	 * 创建标签
	 * @param tagName 标签名
	 * @param options 选项
	 * @param options.selfClosing 是否自封闭
	 * @param options.closing 是否是闭合标签
	 * @throws `RangeError` 非法的标签名
	 */
	createElement(tagName: string, {selfClosing, closing}: {selfClosing?: boolean, closing?: boolean} = {}): TagToken {
		const config = this.getAttribute('config'),
			include = this.getAttribute('include');
		if (tagName === (include ? 'noinclude' : 'includeonly')) {
			const {IncludeToken}: typeof import('./tagPair/include') = require('./tagPair/include');
			return Shadow.run(
				() => new IncludeToken(tagName, '', undefined, selfClosing ? undefined : tagName, config),
			);
		} else if (config.ext.includes(tagName)) {
			const {ExtToken}: typeof import('./tagPair/ext') = require('./tagPair/ext');
			return Shadow.run(() => new ExtToken(tagName, '', undefined, selfClosing ? undefined : '', config));
		} else if (config.html.flat().includes(tagName)) {
			const {HtmlToken}: typeof import('./html') = require('./html'),
				{AttributesToken}: typeof import('./attributes') = require('./attributes');
			return Shadow.run(() => {
				const attr = new AttributesToken(undefined, 'html-attrs', tagName, config);
				return new HtmlToken(tagName, attr, Boolean(closing), Boolean(selfClosing), config);
			});
		}
		throw new RangeError(`非法的标签名：${tagName}`);
	}

	/**
	 * 创建纯文本节点
	 * @param data 文本内容
	 */
	createTextNode(data = ''): AstText {
		return new AstText(data);
	}

	/** 创建AstRange对象 */
	createRange(): AstRange {
		return new AstRange();
	}

	/**
	 * 找到给定位置
	 * @param index 位置
	 */
	caretPositionFromIndex(index?: number): CaretPosition | undefined {
		if (index === undefined) {
			return undefined;
		}
		const {length} = String(this);
		if (index >= length || index < -length) {
			return undefined;
		}
		index += index < 0 ? length : 0;
		let self: AstNodes = this,
			acc = 0,
			start = 0;
		while (self.type !== 'text') {
			const {childNodes}: Token = self;
			acc += self.getAttribute('padding');
			for (let i = 0; acc <= index && i < childNodes.length; i++) {
				const cur: AstNodes = childNodes[i]!,
					{length: l} = String(cur);
				acc += l;
				if (acc > index) {
					self = cur;
					acc -= l;
					start = acc;
					break;
				}
				acc += self.getGaps(i);
			}
			if (self.childNodes === childNodes) {
				return {offsetNode: self, offset: index - start};
			}
		}
		return {offsetNode: self, offset: index - start};
	}

	/**
	 * 找到给定位置
	 * @param x 列数
	 * @param y 行数
	 */
	caretPositionFromPoint(x: number, y: number): CaretPosition | undefined {
		return this.caretPositionFromIndex(this.indexFromPos(y, x));
	}

	/**
	 * 找到给定位置所在的最外层节点
	 * @param index 位置
	 */
	elementFromIndex(index?: number): AstNodes | undefined {
		return this.caretPositionFromIndex(index)?.offsetNode;
	}

	/**
	 * 找到给定位置所在的最外层节点
	 * @param x 列数
	 * @param y 行数
	 */
	elementFromPoint(x: number, y: number): AstNodes | undefined {
		return this.elementFromIndex(this.indexFromPos(y, x));
	}

	/**
	 * 找到给定位置所在的所有节点
	 * @param index 位置
	 */
	elementsFromIndex(index?: number): AstNodes[] {
		const offsetNode = this.caretPositionFromIndex(index)?.offsetNode;
		return offsetNode ? [...offsetNode.getAncestors().reverse(), offsetNode] : [];
	}

	/**
	 * 找到给定位置所在的所有节点
	 * @param x 列数
	 * @param y 行数
	 */
	elementsFromPoint(x: number, y: number): AstNodes[] {
		return this.elementsFromIndex(this.indexFromPos(y, x));
	}

	/**
	 * 判断标题是否是跨维基链接
	 * @param title 标题
	 */
	isInterwiki(title: string): RegExpExecArray | null {
		return Parser.isInterwiki(title, this.#config);
	}

	/** @private */
	protected cloneChildNodes(): AstNodes[] {
		return this.childNodes.map(child => child.cloneNode());
	}

	/**
	 * 深拷贝节点
	 * @throws `Error` 未定义复制方法
	 */
	cloneNode(): this {
		if (this.constructor !== Token) {
			throw new Error(`未定义 ${this.constructor.name} 的复制方法！`);
		}
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			const token = new Token(undefined, this.#config, [], this.#acceptable) as this;
			token.type = this.type;
			token.setAttribute('name', this.name);
			token.append(...cloned);
			token.protectChildren(...this.#protectedChildren);
			return token;
		});
	}

	/** 获取全部章节 */
	sections(): (AstText | Token)[][] | undefined {
		if (this.type !== 'root') {
			return undefined;
		}
		const {childNodes} = this,
			headings: [number, number][] = ([...childNodes.entries()]
				.filter(([, {type}]) => type === 'heading') as [number, HeadingToken][])
				.map(([i, {name}]) => [i, Number(name)]),
			lastHeading = [-1, -1, -1, -1, -1, -1],
			sections: (AstText | Token)[][] = new Array(headings.length);
		for (let i = 0; i < headings.length; i++) {
			const [index, level] = headings[i]!;
			for (let j = level; j < 6; j++) {
				const last = lastHeading[j]!;
				if (last >= 0) {
					sections[last] = childNodes.slice(headings[last]![0], index);
				}
				lastHeading[j] = j === level ? i : -1;
			}
		}
		for (const last of lastHeading) {
			if (last >= 0) {
				sections[last] = childNodes.slice(headings[last]![0]);
			}
		}
		sections.unshift(childNodes.slice(0, headings[0]?.[0]));
		return sections;
	}

	/**
	 * 获取指定章节
	 * @param n 章节序号
	 */
	section(n: number): (AstText | Token)[] | undefined {
		return this.sections()?.[n];
	}

	/**
	 * 获取指定的外层HTML标签
	 * @param tag HTML标签名
	 * @throws `RangeError` 非法的标签或空标签
	 */
	findEnclosingHtml(tag?: string): [HtmlToken, HtmlToken] | undefined {
		tag = tag?.toLowerCase();
		if (tag !== undefined && !this.#config.html.slice(0, 2).flat().includes(tag)) {
			throw new RangeError(`非法的标签或空标签：${tag}`);
		}
		const {parentNode} = this;
		if (!parentNode) {
			return undefined;
		}
		const {childNodes, length} = parentNode,
			index = childNodes.indexOf(this);
		let i: number;
		for (i = index - 1; i >= 0; i--) {
			const {
				type, name, selfClosing, closing,
			} = childNodes[i] as AstNodes & {selfClosing?: boolean, closing?: boolean};
			if (type === 'html' && (!tag || name === tag) && selfClosing === false && closing === false) {
				break;
			}
		}
		if (i === -1) {
			return parentNode.findEnclosingHtml(tag);
		}
		const opening = childNodes[i] as HtmlToken;
		for (i = index + 1; i < length; i++) {
			const {
				type, name, selfClosing, closing,
			} = childNodes[i] as AstNodes & {selfClosing?: boolean, closing?: boolean};
			if (type === 'html' && name === opening.name && selfClosing === false && closing === true) {
				break;
			}
		}
		return i === length ? parentNode.findEnclosingHtml(tag) : [opening, childNodes[i] as HtmlToken];
	}

	/** 获取全部分类 */
	getCategories(): [string, string | undefined][] {
		const categories = this.querySelectorAll('category') as CategoryToken[];
		return categories.map(({name, sortkey}) => [name, sortkey]);
	}

	/** 重新解析单引号 */
	redoQuotes(): void {
		const acceptable = this.getAttribute('acceptable');
		if (acceptable && !('QuoteToken' in acceptable)) {
			return;
		}
		for (const quote of this.childNodes) {
			if (quote.type === 'quote') {
				quote.replaceWith(String(quote));
			}
		}
		this.normalize();
		const textNodes = [...this.childNodes.entries()]
			.filter(([, {type}]) => type === 'text') as [number, AstText][],
			indices = textNodes.map(([i]) => this.getRelativeIndex(i)),
			token = Shadow.run(() => {
				const node = new Token(text(textNodes.map(([, str]) => str)), this.getAttribute('config'));
				node.setAttribute('stage', 6);
				return node.parse(7);
			});
		for (const quote of [...token.childNodes].reverse()) {
			if (quote.type === 'quote') {
				const index = quote.getRelativeIndex(),
					n = indices.findLastIndex(textIndex => textIndex <= index),
					cur = this.childNodes[n] as AstText;
				cur.splitText(index - indices[n]!).splitText(String(quote).length);
				this.removeAt(n + 1);
				this.insertAt(quote, n + 1);
			}
		}
		this.normalize();
	}

	/** 解析部分魔术字 */
	solveConst(): void {
		const targets = this.querySelectorAll('magic-word, arg'),
			magicWords = new Set(['if', 'ifeq', 'switch']);
		for (let i = targets.length - 1; i >= 0; i--) {
			const target = targets[i] as ArgToken | TranscludeToken & {default: undefined},
				{type, name, default: argDefault, childNodes, length} = target,
				[, var1, var2] = childNodes as [SyntaxToken, ...ParameterToken[]];
			if (type === 'arg' || type === 'magic-word' && magicWords.has(name)) {
				let replace = '';
				if (type === 'arg') {
					replace = argDefault === false ? String(target) : argDefault;
				} else if (name === 'if' && !var1?.getElementByTypes('magic-word, template')) {
					replace = String(childNodes[String(var1 ?? '').trim() ? 2 : 3] ?? '').trim();
				} else if (name === 'ifeq'
					&& !childNodes.slice(1, 3).some(child => child.getElementByTypes('magic-word, template'))
				) {
					replace = String(childNodes[
						String(var1 ?? '').trim() === String(var2 ?? '').trim() ? 3 : 4
					] ?? '').trim();
				} else if (name === 'switch' && !var1?.getElementByTypes('magic-word, template')) {
					const key = String(var1 ?? '').trim();
					let defaultVal = '',
						found = false,
						transclusion = false;
					for (let j = 2; j < length; j++) {
						const {anon, name: option, value, firstChild} = childNodes[j] as ParameterToken;
						transclusion = Boolean(firstChild.getElementByTypes('magic-word, template'));
						if (anon) {
							if (j === length - 1) {
								defaultVal = value;
							} else if (transclusion) {
								break;
							} else {
								found ||= key === value;
							}
						} else if (transclusion) {
							break;
						} else if (found || option === key) {
							replace = value;
							break;
						} else if (option.toLowerCase() === '#default') {
							defaultVal = value;
						}
						if (j === length - 1) {
							replace = defaultVal;
						}
					}
					if (transclusion) {
						continue;
					}
				} else {
					continue;
				}
				target.replaceWith(replace);
			}
		}
	}

	/** 合并普通节点的普通子节点 */
	flatten(): void {
		if (this.getAttribute('plain')) {
			for (const child of this.childNodes) {
				if (child.type !== 'text' && child.getAttribute('plain')) {
					child.replaceWith(...child.childNodes);
				}
			}
		}
	}
}

classes['Token'] = __filename;
