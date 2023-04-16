import TagPairToken = require('.');
import AttributesToken = require('../attributes');
import Token = require('..');
import {ParserConfig} from '../..';

/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributesToken, NowikiToken|Token]}`
 */
declare class ExtToken extends TagPairToken {
	override type: 'ext';
	override childNodes: [AttributesToken, Token];
	/** @override */
	override get firstChild(): AttributesToken;
	/** @override */
	override get lastChild(): Token;

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭
	 */
	constructor(name: string, attr?: string, inner?: string, closed?: string, config?: ParserConfig, accum?: Token[]);
}

export = ExtToken;
