import AstElement = require('../lib/element');
import AstText = require('../lib/text');
import Title = require('../lib/title');
import {ParserConfig} from '..';

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
	constructor(wikitext: string, config?: ParserConfig, halfParsed?: boolean, accum?: Token[], acceptable?: unknown);

	/** 是否是普通节点 */
	isPlain(): boolean;

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 * @throws `RangeError` 不可插入的子节点
	 */
	override insertAt<T extends string|AstText|Token>(token: T, i?: number): T extends Token ? T : AstText;

	/**
	 * 规范化页面标题
	 * @param title 标题（含或不含命名空间前缀）
	 * @param defaultNs 命名空间
	 * @param decode 是否需要解码
	 * @param selfLink 是否允许selfLink
	 */
	normalizeTitle(title: string, defaultNs?: number, halfParsed?: boolean, decode?: boolean, selfLink?: boolean): Title;

	/** 生成部分Token的`name`属性 */
	afterBuild(): void;

	/**
	 * 解析、重构、生成部分Token的`name`属性
	 * @param n 最大解析层级
	 * @param include 是否嵌入
	 */
	parse(n?: number, include?: boolean): Token;
}

export = Token;
