import {Token} from '../index';
import type {AstText} from '../../lib/text';

declare type NowikiTypes = 'ext-inner'
	| 'comment'
	| 'dd'
	| 'double-underscore'
	| 'hr'
	| 'list'
	| 'noinclude'
	| 'quote';

/**
 * 纯文字Token，不会被解析
 * @classdesc `{childNodes: [AstText]}`
 */
export abstract class NowikiBaseToken extends Token {
	declare type: NowikiTypes;
	declare childNodes: [AstText];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): AstText;
}
