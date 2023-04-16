import Token = require('..');
import {ParserConfig} from '../..';

declare type linkType = 'link'|'category'|'file'|'gallery-image'|'imagemap-image';

/**
 * 内链
 * @classdesc `{childNodes: [AtomToken, ?Token]}`
 */
declare class LinkToken extends Token {
	override type: linkType;
	override childNodes: Token[];
	/** @override */
	override get firstChild(): Token;
	/** @override */
	override get lastChild(): Token;

	/**
	 * @param link 链接标题
	 * @param linkText 链接显示文字
	 * @param delimiter `|`
	 */
	constructor(link: string, linkText: string, config?: ParserConfig, accum?: Token[], delimiter?: string);

	/** @override */
	override toString(selector: string): string;
	/** @override */
	override text(): string;
	/** @override */
	override print(): string;
}

declare namespace LinkToken {
	export {linkType};
}

export = LinkToken;
