import {hiddenToken} from '../mixin/hidden';
import {Token} from './index';

/**
 * invisible token in triple braces
 *
 * 三重括号内不可见的节点
 */
@hiddenToken(false)
export class HiddenToken extends Token {
	override get type(): 'hidden' {
		return 'hidden';
	}
}
