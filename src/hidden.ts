import {hiddenToken} from '../mixin/hidden';
import {noEscape} from '../mixin/noEscape';
import {Token} from './index';

/**
 * invisible token
 *
 * 不可见的节点
 */
@hiddenToken() @noEscape
export class HiddenToken extends Token {
	override get type(): 'hidden' {
		return 'hidden';
	}
}
