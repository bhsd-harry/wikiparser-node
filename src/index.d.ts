import AstElement = require('../lib/element');
import AstText = require('../lib/text');
import HtmlToken = require('./html');

declare type Acceptable = Record<string, number|string|import('../lib/ranges')|(number|string)[]>;

/**
 * 所有节点的基类
 * @classdesc `{childNodes: ...(AstText|Token)}`
 */
declare class Token extends AstElement {
	override type: 'root'
		|'plain'
		|'onlyinclude'
		|'noinclude'
		|'include'
		|'comment'
		|'ext'
		|'ext-attrs'
		|'ext-attr-dirty'
		|'ext-attr'
		|'attr-key'
		|'attr-value'
		|'ext-inner'
		|'arg'
		|'arg-name'
		|'arg-default'
		|'hidden'
		|'magic-word'
		|'magic-word-name'
		|'invoke-function'
		|'invoke-module'
		|'template'
		|'template-name'
		|'parameter'
		|'parameter-key'
		|'parameter-value'
		|'heading'
		|'heading-title'
		|'heading-trail'
		|'html'
		|'html-attrs'
		|'html-attr-dirty'
		|'html-attr'
		|'table'
		|'tr'
		|'td'
		|'table-syntax'
		|'table-attrs'
		|'table-attr-dirty'
		|'table-attr'
		|'table-inter'
		|'td-inner'
		|'hr'
		|'double-underscore'
		|'link'
		|'link-target'
		|'link-text'
		|'category'
		|'file'
		|'gallery-image'
		|'imagemap-image'
		|'image-parameter'
		|'quote'
		|'ext-link'
		|'ext-link-text'
		|'ext-link-url'
		|'free-ext-link'
		|'list'
		|'dd'
		|'converter'
		|'converter-flags'
		|'converter-flag'
		|'converter-rule'
		|'converter-rule-noconvert'
		|'converter-rule-variant'
		|'converter-rule-to'
		|'converter-rule-from'
		|'param-line'
		|'charinsert-line'
		|'imagemap-link';

	/** @param acceptable 可接受的子节点设置 */
	constructor(wikitext: string, config?: import('..').ParserConfig, halfParsed?: boolean, accum?: Token[], acceptable?: Acceptable);

	/** 所有图片，包括图库 */
	get images(): Token[];

	/** 所有内链、外链和自由外链 */
	get links(): Token[];

	/** 所有模板和模块 */
	get embeds(): Token[];

	/** 是否是普通节点 */
	isPlain(): boolean;

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 * @throws `RangeError` 不可插入的子节点
	 */
	override insertAt<T extends string | AstText | Token>(token: T, i?: number): T extends Token ? T : AstText;

	/**
	 * 规范化页面标题
	 * @param title 标题（含或不含命名空间前缀）
	 * @param defaultNs 命名空间
	 * @param decode 是否需要解码
	 * @param selfLink 是否允许selfLink
	 */
	normalizeTitle(title: string, defaultNs?: number, halfParsed?: boolean, decode?: boolean, selfLink?: boolean): import('../lib/title');

	/**
	 * 替换为同类节点
	 * @param token 待替换的节点
	 * @throws `Error` 不存在父节点
	 * @throws `Error` 待替换的节点具有不同属性
	 */
	safeReplaceWith(token: this): void;

	/**
	 * 创建HTML注释
	 * @param data 注释内容
	 */
	createComment(data?: string): import('./nowiki/comment');

	/**
	 * 创建标签
	 * @param tagName 标签名
	 * @param options 选项
	 * @throws `RangeError` 非法的标签名
	 */
	createElement(tagName: string, {selfClosing, closing}?: {
		selfClosing: boolean;
		closing: boolean;
	}): import('./tagPair/include')|import('./tagPair/ext')|import('./html');

	/**
	 * 创建纯文本节点
	 * @param data 文本内容
	 */
	createTextNode(data?: string): AstText;

	/**
	 * 找到给定位置所在的节点
	 * @param index 位置
	 */
	caretPositionFromIndex(index: number): {
		offsetNode: AstText|Token;
		offset: number;
	};

	/**
	 * 找到给定位置所在的节点
	 * @param x 列数
	 * @param y 行数
	 */
	caretPositionFromPoint(x: number, y: number): {
		offsetNode: AstText|Token;
		offset: number;
	};

	/**
	 * 找到给定位置所在的最外层节点
	 * @param index 位置
	 * @throws `Error` 不是根节点
	 */
	elementFromIndex(index: number): AstText|Token;

	/**
	 * 找到给定位置所在的最外层节点
	 * @param x 列数
	 * @param y 行数
	 */
	elementFromPoint(x: number, y: number): AstText|Token;

	/**
	 * 找到给定位置所在的所有节点
	 * @param index 位置
	 */
	elementsFromIndex(index: number): Token[];

	/**
	 * 找到给定位置所在的所有节点
	 * @param x 列数
	 * @param y 行数
	 */
	elementsFromPoint(x: number, y: number): Token[];

	/**
	 * 判断标题是否是跨维基链接
	 * @param title 标题
	 */
	isInterwiki(title: string): RegExpMatchArray;

	/** 深拷贝所有子节点 */
	cloneChildNodes(): (AstText | Token)[];

	/** 获取全部章节 */
	sections(): (Token | AstText)[][];

	/**
	 * 获取指定章节
	 * @param n 章节序号
	 */
	section(n: number): (Token | AstText)[];

	/**
	 * 获取指定的外层HTML标签
	 * @param tag HTML标签名
	 * @throws `RangeError` 非法的标签或空标签
	 */
	findEnclosingHtml(tag?: string): [HtmlToken, HtmlToken];

	/** 获取全部分类 */
	getCategories(): [string, string][];

	/**
	 * 重新解析单引号
	 * @throws `Error` 不接受QuoteToken作为子节点
	 */
	redoQuotes(): void;

	/** 解析部分魔术字 */
	solveConst(): void;

	/** 生成部分Token的`name`属性 */
	afterBuild(): void;

	/**
	 * 解析、重构、生成部分Token的`name`属性
	 * @param n 最大解析层级
	 * @param include 是否嵌入
	 */
	parse(n?: number, include?: boolean): Token;
}

declare namespace Token {
	export {Acceptable};
}

export = Token;
