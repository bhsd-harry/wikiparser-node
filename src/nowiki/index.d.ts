import Token = require('..');
import AstText = require('../../lib/text');
import {ParserConfig} from '../..';

declare type nowikiType = 'ext-inner'
	|'comment'
	|'dd'
	|'double-underscore'
	|'hr'
	|'list'
	|'noinclude'
	|'quote';

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
	constructor(wikitext: string, config?: ParserConfig, accum?: Token[]);
}

declare namespace NowikiToken {
	export {nowikiType};
}

export = NowikiToken;
