import {hidden} from '../mixin/hidden';
import {Token} from './index';

/** 不可见的节点 */
export class HiddenToken extends hidden(Token) {
	/** @browser */
	override readonly type = 'hidden';
}
