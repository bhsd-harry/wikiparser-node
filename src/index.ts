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
// !: `{{!}}`专用
// {: `{{(!}}`专用
// }: `{{!)}}`专用
// -: `{{!-}}`专用
// +: `{{!!}}`专用
// ~: `{{=}}`专用
// a: AttributeToken
// b: TableToken
// c: CommentToken、NoIncludeToken和IncludeToken
// d: ListToken
// e: ExtToken
// f: MagicLinkToken inside ImageParameterToken
// h: HeadingToken
// l: LinkToken
// m: `{{fullurl:}}`、`{{canonicalurl:}}`或`{{filepath:}}`
// q: QuoteToken
// r: HrToken
// s: `{{{|subst:}}}`
// t: ArgToken或TranscludeToken
// u: DoubleUnderscoreToken
// v: ConverterToken
// w: ExtLinkToken
// x: HtmlToken

import * as assert from 'assert/strict';
import {text} from '../util/string';
import {
	MAX_STAGE,
	BuildMethod,

	/* NOT FOR BROWSER */

	aliases,
	classes,
} from '../util/constants';
import {Shadow} from '../util/debug';
import {generateForSelf} from '../util/lint';
import {Ranges} from '../lib/ranges';
import Parser from '../index';
import {AstElement} from '../lib/element';
import {AstText} from '../lib/text';
import type {LintError, TokenTypes} from '../base';
import type {AstRange} from '../lib/range';
import type {Range} from '../lib/ranges';
import type {Title} from '../lib/title';
import type {
	AstNodes,
	CategoryToken,

	/* NOT FOR BROWSER */

	IncludeToken,
	HtmlToken,
	ExtToken,
	TranscludeToken,
	CommentToken,
	FileToken,
	LinkToken,
	RedirectTargetToken,
	ExtLinkToken,
	MagicLinkToken,
	ImageParameterToken,
} from '../internal';
import type {CaretPosition} from '../lib/node';

declare interface LintIgnore {
	line: number;
	from: number | undefined;
	to: number | undefined;
	rules: Set<string> | undefined;
}

/* NOT FOR BROWSER */

export type TagToken = IncludeToken | ExtToken | HtmlToken;

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	#acceptable?: Record<string, Ranges>;
	readonly #protectedChildren = new Ranges();
	#built = false;

	/** 所有图片，包括图库 */
	get images(): FileToken[] {
		return this.querySelectorAll('file, gallery-image, imagemap-image');
	}

	/** 所有内链、外链和自由外链 */
	get links(): (LinkToken | RedirectTargetToken | ExtLinkToken | MagicLinkToken | ImageParameterToken)[] {
		return this.querySelectorAll('link, redirect-target, ext-link, free-ext-link, image-parameter#link');
	}

	/** 所有模板和模块 */
	get embeds(): TranscludeToken[] {
		return this.querySelectorAll('template, magic-word#invoke');
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
		accum.push(this);

		/* NOT FOR BROWSER */

		this.setAttribute('acceptable', acceptable);
	}

	/** @private */
	parseOnce(n = this.#stage, include = false): this {
		if (n < this.#stage || !this.getAttribute('plain') || this.length === 0) {
			return this;
		} else if (this.#stage >= MAX_STAGE) {
			/* NOt FOR BROWSER */

			if (this.type === 'root') {
				Parser.error('已完全解析！');
			}

			/* NOT FOR BROWSER END */

			return this;
		}
		switch (n) {
			case 0:
				if (this.type === 'root') {
					this.#accum.shift();
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
			throw new Error(`解析错误！未正确标记的 Token：${s}`);
		});
		if (type === BuildMethod.String) {
			return nodes.map(String).join('');
		} else if (type === BuildMethod.Text) {
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

		/* NOT FOR BROWSER */

		this.#built = true;
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
	parse(n = MAX_STAGE, include?: boolean): this {
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

	/** 解析重定向 */
	#parseRedirect(): boolean {
		const {parseRedirect}: typeof import('../parser/redirect') = require('../parser/redirect');
		const wikitext = String(this.firstChild!),
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
			case 'include': {
				if (this.#include !== undefined) {
					return this.#include as TokenAttributeGetter<T>;
				}
				const root = this.getRootNode();
				return (root !== this && root.getAttribute('include')) as TokenAttributeGetter<T>;
			}
			case 'accum':
				return this.#accum as TokenAttributeGetter<T>;

				/* NOT FOR BROWSER */

			case 'stage':
				return this.#stage as TokenAttributeGetter<T>;
			case 'acceptable':
				return (this.#acceptable ? {...this.#acceptable} : undefined) as TokenAttributeGetter<T>;
			case 'protectedChildren':
				return new Ranges(this.#protectedChildren) as TokenAttributeGetter<T>;

				/* NOT FOR BROWSER END */

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

				/* NOT FOR BROWSER */

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

			/* NOT FOR BROWSER END */

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
	override insertAt<T extends AstNodes>(child: T, i?: number): T;
	override insertAt<T extends AstNodes>(child: T | string, i = this.length): T | AstText {
		const token = typeof child === 'string' ? new AstText(child) : child;

		/* NOT FOR BROWSER */

		if (!Shadow.running && this.#acceptable) {
			const acceptableIndices = Object.fromEntries(
					Object.entries(this.#acceptable).map(([str, ranges]) => [str, ranges.applyTo(this.length + 1)]),
				),
				nodesAfter = this.childNodes.slice(i),
				insertedName = token.constructor.name;
			i += i < 0 ? this.length : 0;
			if (!acceptableIndices[insertedName]?.includes(i)) {
				this.constructorError(`的第 ${i} 个子节点不能为 ${insertedName}`);
			} else if (nodesAfter.some(({constructor: {name}}, j) => !acceptableIndices[name]?.includes(i + j + 1))) {
				this.constructorError(`插入新的第 ${i} 个子节点会破坏规定的顺序`);
			}
		}

		/* NOT FOR BROWSER END */

		super.insertAt(token, i);

		/* NOT FOR BROWSER */

		const e = new Event('insert', {bubbles: true});
		this.dispatchEvent(e, {type: 'insert', position: i < 0 ? i + this.length - 1 : i});
		if (token.constructor === Token && this.getAttribute('plain')) {
			Parser.warn('您正将一个普通节点作为另一个普通节点的子节点，请考虑要不要执行 flatten 方法。');
		}

		/* NOT FOR BROWSER END */

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
		halfParsed?: boolean,
		decode?: boolean,
		selfLink?: boolean,
	): Title {
		return Parser.normalizeTitle(title, defaultNs, this.#include, this.#config, halfParsed, decode, selfLink);
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		if (this.type === 'root') {
			const record: Record<string, Set<CategoryToken>> = {};
			for (const cat of this.querySelectorAll<CategoryToken>('category')) {
				const thisCat = record[cat.name];
				if (thisCat) {
					thisCat.add(cat);
				} else {
					record[cat.name] = new Set([cat]);
				}
			}
			for (const value of Object.values(record)) {
				if (value.size > 1) {
					errors.push(...[...value].map(cat => {
						const e = generateForSelf(
							cat,
							{start: cat.getAbsoluteIndex()},
							'no-duplicate',
							'duplicated category',
						);
						e.suggestions = [
							{
								desc: 'remove',
								range: [e.startIndex, e.endIndex],
								text: '',
							},
						];
						return e;
					}));
				}
			}
			const regex = /<!--\s*lint-(disable(?:(?:-next)?-line)?|enable)(\s[\sa-z,-]*)?-->/gu,
				wikitext = String(this),
				ignores: LintIgnore[] = [];
			let mt = regex.exec(wikitext),
				last = 0,
				curLine = 0;
			while (mt) {
				const {1: type, index} = mt,
					detail = mt[2]?.trim();
				curLine += wikitext.slice(last, index).split('\n').length - 1;
				last = index;
				ignores.push({
					line: curLine + (type === 'disable-line' ? 0 : 1),
					from: type === 'disable' ? regex.lastIndex : undefined,
					to: type === 'enable' ? regex.lastIndex : undefined,
					rules: detail ? new Set(detail.split(',').map(r => r.trim())) : undefined,
				});
				mt = regex.exec(wikitext);
			}
			return errors.filter(({rule, startLine, startIndex}) => {
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
		return errors;
	}

	/* NOT FOR BROWSER */

	/** @override */
	override dispatchEvent(e: Event, data: unknown): void {
		if (this.#built) {
			super.dispatchEvent(e, data);
		}
	}

	/** @private */
	protectChildren(...args: (string | number | Range)[]): void {
		this.#protectedChildren.push(...new Ranges(args));
	}

	/**
	 * @override
	 * @param i 移除位置
	 */
	override removeAt(i: number): AstNodes {
		i += i < 0 ? this.length : 0;
		if (!Shadow.running) {
			const protectedIndices = this.#protectedChildren.applyTo(this.childNodes);
			if (protectedIndices.includes(i)) {
				this.constructorError(`的第 ${i} 个子节点不可移除`);
			} else if (this.#acceptable) {
				const acceptableIndices = Object.fromEntries(
						Object.entries(this.#acceptable).map(([str, ranges]) => [str, ranges.applyTo(this.length - 1)]),
					),
					nodesAfter = this.childNodes.slice(i + 1);
				if (nodesAfter.some(({constructor: {name}}, j) => !acceptableIndices[name]?.includes(i + j))) {
					this.constructorError(`移除第 ${i} 个子节点会破坏规定的顺序`);
				}
			}
		}
		const node = super.removeAt(i);
		const e = new Event('remove', {bubbles: true});
		this.dispatchEvent(e, {type: 'remove', position: i, removed: node});
		return node;
	}

	/**
	 * 替换为同类节点
	 * @param token 待替换的节点
	 * @throws `Error` 不存在父节点
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
				this.constructorError('带有不同的 #acceptable 属性');
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
		token.dispatchEvent(e, {type: 'replace', position: i, oldToken: this});
	}

	/**
	 * 创建HTML注释
	 * @param data 注释内容
	 */
	createComment(data = ''): CommentToken {
		require('../addon/token');
		return this.createComment(data);
	}

	/**
	 * 创建标签
	 * @param tagName 标签名
	 * @param options 选项
	 * @param options.selfClosing 是否自封闭
	 * @param options.closing 是否是闭合标签
	 * @throws `RangeError` 非法的标签名
	 */
	createElement(tagName: string, options: {selfClosing?: boolean, closing?: boolean} = {}): TagToken {
		require('../addon/token');
		return this.createElement(tagName, options);
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
		const {AstRange} = require('../lib/range');
		return new AstRange();
	}

	/**
	 * 找到给定位置
	 * @param index 位置
	 */
	caretPositionFromIndex(index?: number): CaretPosition | undefined {
		require('../addon/token');
		return this.caretPositionFromIndex(index);
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
	cloneChildNodes(): AstNodes[] {
		return this.childNodes.map(child => child.cloneNode());
	}

	/** 深拷贝节点 */
	cloneNode(): this {
		if (this.constructor !== Token) {
			this.constructorError('未定义复制方法');
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
	sections(): AstRange[] | undefined {
		require('../addon/token');
		return this.sections();
	}

	/**
	 * 获取指定章节
	 * @param n 章节序号
	 */
	section(n: number): AstRange | undefined {
		return this.sections()?.[n];
	}

	/**
	 * 获取指定的外层HTML标签
	 * @param tag HTML标签名
	 * @throws `RangeError` 非法的标签或空标签
	 */
	findEnclosingHtml(tag?: string): AstRange | undefined {
		require('../addon/token');
		return this.findEnclosingHtml(tag);
	}

	/** 获取全部分类 */
	getCategories(): [string, string | undefined][] {
		const categories = this.querySelectorAll<CategoryToken>('category');
		return categories.map(({name, sortkey}) => [name, sortkey]);
	}

	/** 重新解析单引号 */
	redoQuotes(): void {
		require('../addon/token');
		this.redoQuotes();
	}

	/** 获取节点的字体样式 */
	fontStyle(): {bold: boolean, italic: boolean} {
		require('../addon/token');
		return this.fontStyle();
	}

	/** 解析部分魔术字 */
	solveConst(): void {
		require('../addon/token');
		this.solveConst();
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
