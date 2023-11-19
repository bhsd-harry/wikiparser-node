import {hidden} from '../mixin/hidden';
import {Token} from '.';

/** 不可见的节点 */
export class HiddenToken extends hidden(Token) {
	/** @browser */
	override readonly type = 'hidden';
}
