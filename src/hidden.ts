import {hiddenToken} from '../mixin/hidden';
import {Token} from './index';

/**
 * invisible token
 *
 * 不可见的节点
 */
@hiddenToken()
export class HiddenToken extends Token {
	override get type(): 'hidden' {
		return 'hidden';
	}
}
