import {hiddenToken} from '../mixin/hidden';
import {Token} from './index';

/* NOT FOR BROWSER */

import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		return new HiddenToken(undefined, this.getAttribute('config')) as this;
	}
}
