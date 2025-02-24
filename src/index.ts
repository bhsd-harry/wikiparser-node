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
// c: CommentToke
// d: ListToken
// e: ExtToken
// f: MagicLinkToken inside ImageParameterToken
// h: HeadingToken
// i: RFC/PMID/ISBN
// l: LinkToken
// m: `{{fullurl:}}`、`{{canonicalurl:}}`或`{{filepath:}}`
// n: NoIncludeToken和IncludeToken
// o: RedirectToken
// q: QuoteToken
// r: HrToken
// s: `{{{|subst:}}}`
// t: ArgToken或TranscludeToken
// u: `__toc__`
// v: ConverterToken
// w: ExtLinkToken
// x: HtmlToken

import {text} from '../util/string';
import {
	MAX_STAGE,
	BuildMethod,

	/* NOT FOR BROWSER */

	aliases,
	classes,
} from '../util/constants';
import {generateForSelf, cache} from '../util/lint';
import Parser from '../index';
import {AstElement} from '../lib/element';
import {AstText} from '../lib/text';
import type {LintError, TokenTypes} from '../base';
import type {Cached} from '../util/lint';
import type {Title} from '../lib/title';
import type {
	AstNodes,
	CategoryToken,
	AttributeToken,

	/* NOT FOR BROWSER */

	IncludeToken,
	HtmlToken,
	ExtToken,
	CommentToken,
	ListToken,
	DdToken,
} from '../internal';

/* NOT FOR BROWSER */

import * as assert from 'assert/strict';
import {Shadow} from '../util/debug';
import {html} from '../util/html';
import {Ranges} from '../lib/ranges';
import {AstRange} from '../lib/range';
import type {Range} from '../lib/ranges';

/* NOT FOR BROWSER END */

declare interface LintIgnore {
	line: number;
	from: number | undefined;
	to: number | undefined;
	rules: Set<string> | undefined;
}

/* NOT FOR BROWSER */

/**
 * 可接受的Token类型
 * @param value 可接受的Token类型
 */
const getAcceptable = (value: Acceptable): Record<string, Ranges> => {
	const acceptable: Record<string, Ranges> = {};
	for (const [k, v] of Object.entries(value)) {
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
	return acceptable;
};

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	#acceptable?: Record<string, Ranges> | (() => Record<string, Ranges>);
	readonly #protectedChildren = new Ranges();

	/* NOT FOR BROWSER END */

	override get type(): TokenTypes {
		return this.#type;
	}

	override set type(value) {
		/* NOT FOR BROWSER */

		const plainTypes: TokenTypes[] = [
			'plain',
			'root',
			'table-inter',
			'arg-default',
			'attr-value',
			'ext-link-text',
			'heading-title',
			'parameter-key',
			'parameter-value',
			'link-text',
			'td-inner',
			'ext-inner',
			'list-range',
		];
		if (!plainTypes.includes(value)) {
			throw new RangeError(`"${value}" is not a valid type for ${this.constructor.name}!`);
		}

		/* NOT FOR BROWSER END */

		this.#type = value;
	}

	/** @class */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = [], acceptable?: Acceptable) {
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
	parseOnce(n = this.#stage, include = false, tidy?: boolean): this {
		if (n < this.#stage || this.length === 0 || !this.getAttribute('plain')) {
			return this;
		} else if (this.#stage >= MAX_STAGE) {
			/* NOt FOR BROWSER */

			if (this.type === 'root') {
				Parser.error('Fully parsed!');
			}

			/* NOT FOR BROWSER END */

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
			this.replaceChildren(...this.buildFromStr(str!));
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
		if (this.#config.excludes?.includes('html')) {
			return;
		}
		const {parseHtml}: typeof import('../parser/html') = require('../parser/html');
		this.setText(parseHtml(this.firstChild!.toString(), this.#config, this.#accum));
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
		this.setText(parseLinks(this.firstChild!.toString(), this.#config, this.#accum, tidy));
	}

	/**
	 * 解析单引号
	 * @param tidy 是否整理
	 */
	#parseQuotes(tidy?: boolean): void {
		if (this.#config.excludes?.includes('quote')) {
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
		if (this.#config.excludes?.includes('extLink')) {
			return;
		}
		const {parseExternalLinks}: typeof import('../parser/externalLinks') = require('../parser/externalLinks');
		this.setText(parseExternalLinks(this.firstChild!.toString(), this.#config, this.#accum));
	}

	/** 解析自由外链 */
	#parseMagicLinks(): void {
		if (this.#config.excludes?.includes('magicLink')) {
			return;
		}
		const {parseMagicLinks}: typeof import('../parser/magicLinks') = require('../parser/magicLinks');
		this.setText(parseMagicLinks(this.firstChild!.toString(), this.#config, this.#accum));
	}

	/** 解析列表 */
	#parseList(): void {
		if (this.#config.excludes?.includes('list')) {
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
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		switch (key) {
			case 'plain':
				return (this.constructor === Token) as TokenAttribute<T>;
			case 'config':
				return this.#config as TokenAttribute<T>;
			case 'include':
				return (this.#include ?? Boolean(this.getRootNode().#include)) as TokenAttribute<T>;
			case 'accum':
				return this.#accum as TokenAttribute<T>;
			case 'built':
				return this.#built as TokenAttribute<T>;

				/* NOT FOR BROWSER */

			case 'stage':
				return this.#stage as TokenAttribute<T>;
			case 'protectedChildren':
				return this.#protectedChildren as TokenAttribute<T>;

				/* NOT FOR BROWSER END */

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

				/* NOT FOR BROWSER */

			case 'acceptable':
				this.#acceptable = value && ((): Record<string, Ranges> => getAcceptable(value as Acceptable));
				break;

				/* NOT FOR BROWSER END */

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

		/* NOT FOR BROWSER */

		const acceptable = this.getAcceptable();
		if (!Shadow.running && acceptable) {
			const {length, childNodes} = this,
				nodesAfter = childNodes.slice(i),
				insertedName = token.constructor.name;
			i += i < 0 ? length : 0;
			if (!acceptable[insertedName]?.has(i, length + 1)) {
				this.constructorError(`cannot insert a ${insertedName} at position ${i}`);
			} else if (nodesAfter.some(({constructor: {name}}, j) => !acceptable[name]?.has(i + j + 1, length + 1))) {
				this.constructorError(
					`violates the order of acceptable nodes by inserting a child node at position ${i}`,
				);
			}
		}

		/* NOT FOR BROWSER END */

		super.insertAt(token, i);
		const {
			type,

			/* NOT FOR BROWSER */

			constructor,
		} = token;

		/* NOT FOR BROWSER */

		const e = new Event('insert', {bubbles: true});
		this.dispatchEvent(e, {type: 'insert', position: i < 0 ? i + this.length - 1 : i});
		if (type !== 'list-range' && constructor === Token && this.getAttribute('plain')) {
			Parser.warn(
				'You are inserting a plain token as a child of another plain token. '
				+ 'Consider calling Token.flatten method afterwards.',
			);
		}

		/* NOT FOR BROWSER END */

		if (type === 'root') {
			token.type = 'plain';
		}
		return token;
	}

	/** @private */
	normalizeTitle(
		title: string,
		defaultNs = 0,
		temporary?: boolean,
		halfParsed?: boolean,
		decode?: boolean,
		selfLink?: boolean,
	): Title {
		return Parser
			.normalizeTitle(title, defaultNs, this.#include, this.#config, temporary, halfParsed, decode, selfLink);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp | false): LintError[] {
		const {viewOnly} = Parser;
		Parser.viewOnly = true;
		let errors = super.lint(start, re);
		if (this.type === 'root') {
			const record = new Map<string, Set<CategoryToken | AttributeToken>>(),
				selector = 'category,html-attr#id,ext-attr#id,table-attr#id';
			for (const cat of this.querySelectorAll<CategoryToken | AttributeToken>(selector)) {
				let key;
				if (cat.type === 'category') {
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
						msg = `duplicated ${isCat ? 'category' : 'id'}`,
						severity = isCat ? 'error' : 'warning';
					errors.push(...[...value].map(cat => {
						const e = generateForSelf(
							cat,
							{start: cat.getAbsoluteIndex()},
							'no-duplicate',
							msg,
							severity,
						);
						if (isCat) {
							e.suggestions = [{desc: 'remove', range: [e.startIndex, e.endIndex], text: ''}];
						}
						return e;
					}));
				}
			}
			const regex = /<!--\s*lint-(disable(?:(?:-next)?-line)?|enable)(\s[\sa-z,-]*)?-->/gu,
				wikitext = this.toString(),
				ignores: LintIgnore[] = [];
			let mt = regex.exec(wikitext);
			while (mt) {
				const {1: type, index} = mt,
					detail = mt[2]?.trim();
				ignores.push({
					line: this.posFromIndex(index)!.top + (type === 'disable-line' ? 0 : 1),
					from: type === 'disable' ? regex.lastIndex : undefined,
					to: type === 'enable' ? regex.lastIndex : undefined,
					rules: detail ? new Set(detail.split(',').map(r => r.trim())) : undefined,
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
		Parser.viewOnly = viewOnly;
		return errors;
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

	/* NOT FOR BROWSER */

	/** @private */
	getAcceptable(): Record<string, Ranges> | undefined {
		if (typeof this.#acceptable === 'function') {
			this.#acceptable = this.#acceptable();
		}
		return this.#acceptable;
	}

	/** @private */
	override dispatchEvent(e: Event, data: unknown): void {
		if (this.#built) {
			super.dispatchEvent(e, data);
		}
	}

	/** @private */
	protectChildren(...args: (string | number | Range)[]): void {
		this.#protectedChildren.push(...new Ranges(args));
	}

	/** @private */
	concat(elements: readonly AstNodes[]): void {
		if (elements.length === 0) {
			return;
		}
		const {childNodes, lastChild} = this,
			first = elements[0]!,
			last = elements.at(-1)!,
			parent = first.parentNode!,
			nodes = parent.getChildNodes();
		nodes.splice(nodes.indexOf(first), elements.length);
		parent.setAttribute('childNodes', nodes);
		first.previousSibling?.setAttribute('nextSibling', last.nextSibling);
		last.nextSibling?.setAttribute('previousSibling', first.previousSibling);
		for (const element of elements) {
			element.setAttribute('parentNode', this);
		}
		lastChild?.setAttribute('nextSibling', first);
		first.setAttribute('previousSibling', lastChild);
		last.setAttribute('nextSibling', undefined);
		this.setAttribute('childNodes', [...childNodes, ...elements]);
	}

	/**
	 * @override
	 * @param i position of the child node / 移除位置
	 */
	override removeAt(i: number): AstNodes {
		const {length, childNodes} = this;
		i += i < 0 ? length : 0;
		if (!Shadow.running) {
			if (this.#protectedChildren.has(i, length)) {
				this.constructorError(`cannot remove the child node at position ${i}`);
			}
			const acceptable = this.getAcceptable();
			if (acceptable) {
				const nodesAfter = childNodes.slice(i + 1);
				if (nodesAfter.some(({constructor: {name}}, j) => !acceptable[name]?.has(i + j, length - 1))) {
					this.constructorError(
						`violates the order of acceptable nodes by removing the child node at position ${i}`,
					);
				}
			}
		}
		const node = super.removeAt(i);
		const e = new Event('remove', {bubbles: true});
		this.dispatchEvent(e, {type: 'remove', position: i, removed: node});
		return node;
	}

	/**
	 * Replace with a token of the same type
	 *
	 * 替换为同类节点
	 * @param token token to be replaced with / 待替换的节点
	 * @throws `Error` 不存在父节点
	 */
	safeReplaceWith(token: this): void {
		const {parentNode} = this;
		if (!parentNode) {
			throw new Error('The node does not have a parent node!');
		} else if (token.constructor !== this.constructor) {
			this.typeError('safeReplaceWith', this.constructor.name);
		}
		try {
			assert.deepEqual(token.getAcceptable(), this.getAcceptable());
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				this.constructorError('has a different #acceptable property');
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
	 * Create an HTML comment
	 *
	 * 创建HTML注释
	 * @param data comment content / 注释内容
	 */
	createComment(data?: string): CommentToken {
		require('../addon/token');
		return this.createComment(data);
	}

	/**
	 * Create a tag
	 *
	 * 创建标签
	 * @param tagName tag name / 标签名
	 * @param options 选项
	 * @param options.selfClosing whether to be a self-closing tag / 是否自封闭
	 * @param options.closing whether to be a closing tag / 是否是闭合标签
	 * @throws `RangeError` 非法的标签名
	 */
	createElement(
		tagName: string,
		options?: {selfClosing?: boolean, closing?: boolean},
	): IncludeToken | ExtToken | HtmlToken {
		require('../addon/token');
		return this.createElement(tagName, options);
	}

	/**
	 * Create a text node
	 *
	 * 创建纯文本节点
	 * @param data text content / 文本内容
	 */
	createTextNode(data = ''): AstText {
		return new AstText(data);
	}

	/**
	 * Create an AstRange object
	 *
	 * 创建AstRange对象
	 */
	createRange(): AstRange {
		return new AstRange();
	}

	/**
	 * Check if a title is an interwiki link
	 *
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

	/**
	 * Deep clone the node
	 *
	 * 深拷贝节点
	 */
	cloneNode(): this {
		if (this.constructor !== Token) {
			this.constructorError('does not specify a cloneNode method');
		}
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			const token = new Token(undefined, this.#config, [], this.getAcceptable()) as this;
			token.type = this.type;
			token.setAttribute('stage', this.#stage);
			token.setAttribute('name', this.name);
			token.append(...cloned);
			token.protectChildren(...this.#protectedChildren);
			return token;
		});
	}

	/**
	 * Get all sections
	 *
	 * 获取全部章节
	 */
	sections(): AstRange[] | undefined {
		require('../addon/token');
		return this.sections();
	}

	/**
	 * Get a section
	 *
	 * 获取指定章节
	 * @param n rank of the section / 章节序号
	 */
	section(n: number): AstRange | undefined {
		return this.sections()?.[n];
	}

	/**
	 * Get the enclosing HTML tags
	 *
	 * 获取指定的外层HTML标签
	 * @param tag HTML tag name / HTML标签名
	 * @throws `RangeError` 非法的标签或空标签
	 */
	findEnclosingHtml(tag?: string): AstRange | undefined {
		require('../addon/token');
		return this.findEnclosingHtml(tag);
	}

	/**
	 * Get all categories
	 *
	 * 获取全部分类
	 */
	getCategories(): [string, string | undefined][] {
		return this.querySelectorAll<CategoryToken>('category').map(({name, sortkey}) => [name, sortkey]);
	}

	/**
	 * Expand templates
	 *
	 * 展开模板
	 */
	expand(): Token {
		require('../addon/token');
		return this.expand();
	}

	/**
	 * Parse some magic words
	 *
	 * 解析部分魔术字
	 */
	solveConst(): Token {
		require('../addon/token');
		return this.solveConst();
	}

	/**
	 * Merge plain child tokens of a plain token
	 *
	 * 合并普通节点的普通子节点
	 */
	flatten(): void {
		if (this.getAttribute('plain')) {
			for (const child of this.childNodes) {
				if (child.type !== 'text' && child.getAttribute('plain')) {
					child.replaceWith(...child.childNodes);
				}
			}
		}
	}

	/**
	 * Generate HTML
	 *
	 * 生成HTML
	 */
	toHtml(): string {
		require('../addon/token');
		return this.toHtml();
	}

	/** @private */
	toHtmlInternal(opt?: HtmlOpt): string {
		for (const child of this.childNodes) {
			if (child.type === 'text') {
				child.removeBlankLines();
			}
		}
		for (let i = 0; i < this.length; i++) {
			const child = this.childNodes[i]!;
			if (child.is<ListToken>('list') || child.is<DdToken>('dd')) {
				child.getRange();
			}
		}
		this.normalize();
		return html(this.childNodes, '', opt);
	}
}

classes['Token'] = __filename;
