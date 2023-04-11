import Token = require('..');
import AtomToken = require('../atom');
import Title = require('../../lib/title');
import {ParserConfig} from '../..';

declare type linkType = 'link'|'category'|'file'|'gallery-image'|'imagemap-image';

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
declare class LinkToken extends Token {
	override type: linkType;
	override childNodes: [AtomToken]|[AtomToken, Token];

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link: string, linkText: string, config?: ParserConfig, accum?: Token[], delimiter?: string);

	/** 完整链接，和FileToken保持一致 */
	get link(): Title;
	set link(arg: string|Title);

	/** 是否链接到自身 */
	get selfLink(): boolean;
	set selfLink(arg: boolean);

	/** fragment */
	get fragment(): string;
	set fragment(arg: string);

	/** interwiki */
	get interwiki(): string;
	set interwiki(arg: string);

	/** 链接显示文字 */
	get innerText(): string;
	set innerText(arg: string);

	/** @override */
	override toString(selector: string): string;
	/** @override */
	override text(): string;
	/** @override */
	override print(): string;

	/**
	 * 设置链接目标
	 * @param link 链接目标
	 * @throws `SyntaxError` 非法的链接目标
	 */
	setTarget(link: string|Title): void;

	/**
	 * 设置跨语言链接
	 * @param lang 语言前缀
	 * @param link 页面标题
	 * @throws `SyntaxError` 非法的跨语言链接
	 */
	setLangLink(lang: string, link: string): void;

	/** 设置fragment */
	setFragment(fragment: string): void;

	/**
	 * 修改为到自身的链接
	 * @throws `RangeError` 空fragment
	 */
	asSelfLink(fragment?: string): void;

	/**
	 * 设置链接显示文字
	 * @param linkText 链接显示文字
	 * @throws `SyntaxError` 非法的链接显示文字
	 */
	setLinkText(linkText?: string): void;

	/**
	 * 自动生成管道符后的链接文字
	 * @throws `Error` 带有"#"或"%"时不可用
	 */
	pipeTrick(): void;
}

declare namespace LinkToken {
	export {linkType};
}

export = LinkToken;
