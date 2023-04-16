import Token = require('..');
import {ParserConfig} from '../..';

declare type atomType = 'plain'
	|'hidden'
	|'arg-name'
	|'attr-key'
	|'attr-value'
	|'ext-attr-dirty'
	|'html-attr-dirty'
	|'table-attr-dirty'
	|'converter-flag'
	|'converter-rule-variant'
	|'converter-rule-to'
	|'converter-rule-from'
	|'converter-rule-noconvert'
	|'invoke-function'
	|'invoke-module'
	|'template-name'
	|'link-target';

/**
 * 不会被继续解析的plain Token
 * @classdesc `{childNodes: ...AstText|Token}`
 */
declare class AtomToken extends Token {
	override type: atomType;

	/**
	 * @param type Token.type
	 * @param acceptable 可接受的子节点设置
	 */
	constructor(wikitext: string, type?: string, config?: ParserConfig, accum?: Token[], acceptable?: unknown);
}

declare namespace AtomToken {
	export {atomType};
}

export = AtomToken;
