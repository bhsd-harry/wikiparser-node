import Token = require('..');
import {ParserConfig} from '../..';

/**
 * 成对标签
 * @classdesc `{childNodes: [AstText|AttributesToken, AstText|Token]}`
 */
declare class TagPairToken extends Token {
	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭；约定`undefined`表示自闭合，`''`表示未闭合
	 */
	constructor(name: string, attr: string|Token, inner: string|Token, closed: string, config?: ParserConfig, accum?: Token[]);

	/** getter */
	get closed(): boolean;
	set closed(arg: boolean);

	/** getter */
	get selfClosing(): boolean;
	set selfClosing(arg: boolean);

	/** 内部wikitext */
	get innerText(): string;

	/** @override */
	override toString(selector: string): string;
	/** @override */
	override text(): string;
	/** @override */
	override print(): string;
}

export = TagPairToken;
