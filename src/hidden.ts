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

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return (key === 'invalid') as TokenAttribute<T> || super.getAttribute(key);
	}
}
