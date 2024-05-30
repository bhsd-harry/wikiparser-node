import {hiddenToken} from '../mixin/hidden';
import {Token} from './index';

/** 不可见的节点 */
@hiddenToken(true)
export class HiddenToken extends Token {
	override readonly type = 'hidden';
}
