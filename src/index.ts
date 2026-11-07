import {
	text,
} from '../util/string';
import {
	MAX_STAGE,
	BuildMethod,
} from '../util/constants';
import {
	cache,
} from '../util/lint';
import {
	setChildNodes,
	isIsolated,

	/* NOT FOR BROWSER */

	Shadow,
} from '../util/debug';
import Parser from '../index';
import {AstElement} from '../lib/element';
import {AstText} from '../lib/text';
import type {
	TokenTypes,

	/* NOT FOR BROWSER */

	RenderOpt,
} from '../base';
import type {Title, TitleOptions} from '../lib/title';
import type * as CommentAndExtParser from '../parser/commentAndExt';
import type * as BracesParser from '../parser/braces';
import type * as RedirectParser from '../parser/redirect';
import type * as HtmlParser from '../parser/html';
import type * as TableParser from '../parser/table';
import type * as HrAndDoubleUnderscoreParser from '../parser/hrAndDoubleUnderscore';
import type * as LinksParser from '../parser/links';
import type * as QuotesParser from '../parser/quotes';
import type * as ExternalLinksParser from '../parser/externalLinks';
import type * as MagicLinksParser from '../parser/magicLinks';
import type * as ListParser from '../parser/list';
import type * as ConverterParser from '../parser/converter';
import type {
	AstNodes,
	ExtToken,
} from '../internal';

/* NOT FOR BROWSER */

import {html} from '../util/html';
import {readOnly} from '../mixin/readOnly';
import {cached} from '../mixin/cached';
import type * as LibRange from '../lib/range';
import type * as Expand from '../render/expand';
import type * as RenderHtml from '../render/html';

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
	#pageName: string | undefined;

	/* NOT FOR BROWSER */

	#acceptable?: Record<string, number | string | (number | string)[]>;

	/* NOT FOR BROWSER END */

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

		/* NOT FOR BROWSER */

		this.setAttribute('acceptable', acceptable);
	}

	/** @private */
	parseOnce(n = this.#stage, include = false, tidy?: boolean): this {
		if (n < this.#stage || this.length !== 1 || !this.isPlain()) {
			return this;
		}
		/* c8 ignore start */
		// eslint-disable-next-line unicorn/prefer-combined-guards
		if (this.#stage >= MAX_STAGE) {
			return this;
		}
		/* c8 ignore stop */
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
				return s && new AstText(s);
			}
			const n = Number(s.slice(0, -1));
			if (
				isNaN(s.slice(-1) as unknown as number)
				&& Number.isSafeInteger(n) && n >= 0 && n < this.#accum.length
			) {
				return this.#accum[n]!;
			}
			/* c8 ignore next */
			throw new Error(`Failed to build! Unrecognized token: ${s}`);
		}).filter(node => node !== '');
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
		const {parseRedirect}: typeof RedirectParser = require('../parser/redirect');
		const wikitext = this.firstChild!.toString(),
			parsed = parseRedirect(wikitext, this.#config, this.#accum);
		if (parsed !== false) {
			this.setText(parsed);
		}
		return Boolean(parsed);
	}

	/**
	 * 解析HTML注释和扩展标签
	 * @param includeOnly 是否嵌入
	 */
	#parseCommentAndExt(includeOnly: boolean): void {
		const {parseCommentAndExt}: typeof CommentAndExtParser = require('../parser/commentAndExt');
		this.setText(parseCommentAndExt(this.firstChild!.toString(), this.#config, this.#accum, includeOnly));
	}

	/** 解析花括号 */
	#parseBraces(): void {
		const {parseBraces}: typeof BracesParser = require('../parser/braces');
		const str = this.type === 'root' ? this.firstChild!.toString() : `\0${this.firstChild!.toString()}`,
			parsed = parseBraces(str, this.#config, this.#accum);
		this.setText(this.type === 'root' ? parsed : parsed.slice(1));
	}

	/** 解析HTML标签 */
	#parseHtml(): void {
		if (this.#config.excludes.includes('html')) {
			return;
		}
		const {parseHtml}: typeof HtmlParser = require('../parser/html');
		this.setText(parseHtml(this.firstChild!.toString(), this.#config, this.#accum));
	}

	/** 解析表格 */
	#parseTable(): void {
		if (this.#config.excludes.includes('table')) {
			return;
		}
		const {parseTable}: typeof TableParser = require('../parser/table');
		this.setText(parseTable(this as Token & {firstChild: AstText}, this.#config, this.#accum));
	}

	/** 解析`<hr>`和状态开关 */
	#parseHrAndDoubleUnderscore(): void {
		if (this.#config.excludes.includes('hr')) {
			return;
		}
		const {parseHrAndDoubleUnderscore}: typeof HrAndDoubleUnderscoreParser =
			require('../parser/hrAndDoubleUnderscore');
		this.setText(parseHrAndDoubleUnderscore(this as Token & {firstChild: AstText}, this.#config, this.#accum));
	}

	/**
	 * 解析内部链接
	 * @param tidy 是否整理
	 */
	#parseLinks(tidy?: boolean): void {
		const {parseLinks}: typeof LinksParser = require('../parser/links');
		this.setText(parseLinks(this.firstChild!.toString(), this.#config, this.#accum, this.pageName, tidy));
	}

	/**
	 * 解析单引号
	 * @param tidy 是否整理
	 */
	#parseQuotes(tidy?: boolean): void {
		const {parseQuotes}: typeof QuotesParser = require('../parser/quotes');
		const lines = this.firstChild!.toString().split('\n');
		for (let i = 0; i < lines.length; i++) {
			lines[i] = parseQuotes(lines[i]!, this.#config, this.#accum, tidy);
		}
		this.setText(lines.join('\n'));
	}

	/** 解析外部链接 */
	#parseExternalLinks(): void {
		const {parseExternalLinks}: typeof ExternalLinksParser = require('../parser/externalLinks');
		this.setText(parseExternalLinks(this.firstChild!.toString(), this.#config, this.#accum));
	}

	/** 解析自由外链 */
	#parseMagicLinks(): void {
		const {parseMagicLinks}: typeof MagicLinksParser = require('../parser/magicLinks');
		this.setText(parseMagicLinks(this.firstChild!.toString(), this.#config, this.#accum));
	}

	/** 解析列表 */
	#parseList(): void {
		if (this.#config.excludes.includes('list')) {
			return;
		}
		const {parseList}: typeof ListParser = require('../parser/list');
		const {firstChild, type, name} = this,
			lines = firstChild!.toString().split('\n'),
			state = {lastPrefix: ''};
		let i = type === 'root' || type === 'ext-inner' && isIsolated(name) ? 0 : 1;
		for (; i < lines.length; i++) {
			lines[i] = parseList(lines[i]!, state, this.#config, this.#accum);
		}
		this.setText(lines.join('\n'));
	}

	/** 解析语言变体转换 */
	#parseConverter(): void {
		if (this.#config.variants.length > 0) {
			const {parseConverter}: typeof ConverterParser = require('../parser/converter');
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
			/* c8 ignore next 2 */
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

				/* NOT FOR BROWSER */

			case 'acceptable':
				this.#acceptable = value as WikiParserAcceptable;
				break;
			case 'include':
				this.#include = value as TokenAttribute<'include'>;
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
		const token = typeof child === 'string' ? new AstText(child) : child,
			{length} = this;
		i += i < 0 ? length : 0;
		super.insertAt(token, i);
		const {
			type,
		} = token;
		if (type === 'root') {
			token.type = 'plain';
		}
		return token;
	}

	// eslint-disable-next-line jsdoc/require-param
	/**
	 * Normalize page title
	 *
	 * 规范化页面标题
	 * @param title title (with or without the namespace prefix) / 标题（含或不含命名空间前缀）
	 * @param defaultNs default namespace number / 命名空间
	 */
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

	/**
	 * 构建列表
	 * @param recursive 是否递归
	 */
	#buildLists(recursive?: boolean): void {
		PRINT: for (let i = 0; i < this.length; i++) {
			const child = this.childNodes[i]!;
			if (child.is('list') || child.is('dd')) {
				child.getRange();
			} else if (recursive && child.type !== 'text') {
				child.#buildLists(true);
			}
		}
	}

	/** @private */
	buildLists(): void {
		PRINT: this.#buildLists(true);
	}

	/** @private */
	concat(elements: readonly AstNodes[]): void {
		PRINT: {
			if (elements.length === 0) {
				return;
			}
			const {childNodes, lastChild} = this,
				first = elements[0]!,
				last = elements.at(-1)!;
			for (const element of elements) {
				element.setAttribute('parentNode', this);
			}
			lastChild?.setAttribute('nextSibling', first);
			first.setAttribute('previousSibling', lastChild);
			last.setAttribute('nextSibling', undefined);
			this.setAttribute('childNodes', [...childNodes, ...elements]);
		}
	}

	/* NOT FOR BROWSER */

	/** @private */
	getAcceptable(): Record<string, number | string | (number | string)[]> | undefined {
		return this.#acceptable;
	}

	/** @private */
	override removeAt(i: number): AstNodes {
		const {length} = this;
		i += i < 0 ? length : 0;
		const node = super.removeAt(i);
		return node;
	}

	/**
	 * Replace with a token of the same type
	 *
	 * 替换为同类节点
	 * @param token token to be replaced with / 待替换的节点
	 * @throws `Error` if the token has no parent node
	 */
	@readOnly()
	safeReplaceWith(token: this): void {
		const {parentNode} = this;
		const i = parentNode!.childNodes.indexOf(this);
		super.removeAt.call(parentNode, i);
		super.insertAt.call(parentNode, token, i);
		if (token.type === 'root') {
			token.type = 'plain';
		}
	}

	/**
	 * Create a tag
	 *
	 * 创建标签
	 * @param tagName tag name / 标签名
	 * @param options options / 选项
	 * @param options.selfClosing whether to be a self-closing tag / 是否自封闭
	 * @throws `RangeError` if the tag name is invalid
	 */
	createElement(
		tagName: string,
		options?: {selfClosing?: boolean},
	): ExtToken {
		require('../addon/token');
		return this.createElement(tagName, options);
	}

	/**
	 * Create an AstRange object
	 *
	 * 创建AstRange对象
	 */
	createRange(): LibRange.AstRange {
		const {AstRange}: typeof LibRange = require('../lib/range');
		return new AstRange();
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
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			const token = new Token(undefined, this.#config, [], this.getAcceptable()) as this;
			token.type = this.type;
			token.pageName = this.pageName;
			token.setAttribute('stage', this.#stage);
			token.setAttribute('include', Boolean(this.#include));
			token.setAttribute('name', this.name!);
			token.safeAppend(cloned);
			return token;
		});
	}

	/** @ignore */
	#toHtmlOrPlain(func: (expanded: Token, opt?: RenderOpt) => string, render?: RenderOpt): string {
		const {viewOnly} = Parser;
		return Shadow.internal(() => {
			let output: string;
			const {expandToken}: typeof Expand = require('../render/expand');
			Parser.viewOnly = true;
			const expanded = Shadow.run(() => expandToken(this).parse(undefined, false, true));
			Parser.viewOnly = false;
			// eslint-disable-next-line prefer-const
			output = func(expanded, render);
			Parser.viewOnly = viewOnly;
			return output;
		}, Parser);
	}

	/**
	 * Generate HTML
	 *
	 * 生成HTML
	 * @param opt options / 设置
	 * @since v1.10.0
	 */
	toHtml(opt?: RenderOpt): string {
		const {toHtml}: typeof RenderHtml = require('../render/html');
		return this.#toHtmlOrPlain(toHtml, opt);
	}

	/** @private */
	toHtmlOrPlain(func: HtmlOrPlainFunc, _: Method, opt?: HtmlOpt): string {
		for (const child of this.childNodes) {
			if (child.type === 'text') {
				child.removeBlankLines();
			}
		}
		this.#buildLists();
		this.normalize();
		return func(this.childNodes, '', opt);
	}

	/** @private */
	@cached()
	toHtmlInternal(opt?: HtmlOpt): string {
		return this.toHtmlOrPlain(html, 'toHtmlInternal', opt);
	}
}
