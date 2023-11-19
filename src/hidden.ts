import {hidden} from '../mixin/hidden';
import * as Parser from '../index';
import {Token} from '.';

/** 不可见的节点 */
export class HiddenToken extends hidden(Token) {
	/** @browser */
	override readonly type = 'hidden';

	/** @browser */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = [], acceptable?: Acceptable) {
		super(wikitext, config, true, accum, acceptable);
	}
}
