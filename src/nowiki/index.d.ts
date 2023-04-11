import Token = require('..');
import AstText = require('../../lib/text');
import {ParserConfig} from '../..';

declare type nowikiType = 'ext-inner'
	|'comment'
	|'dd'
	|'double-underscore'
	|'hr'
	|'list';

/**
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [AstText]}`
 */
declare class NowikiToken extends Token {
	override type: nowikiType;
	override childNodes: [AstText];
	/** @override */
	override get firstChild(): AstText;
	/** @override */
	override get lastChild(): AstText;
	/** @override */
	override cloneChildNodes(): [AstText];

	/** @override */
	constructor(wikitext: string, config?: ParserConfig, accum?: Token[]);

	/**
	 * @override
	 * @param str 新文本
	 */
	override setText(str: string): string;
}

declare namespace NowikiToken {
	export {nowikiType};
}

export = NowikiToken;
