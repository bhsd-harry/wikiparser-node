import {Token} from './index';

/* NOT FOR BROWSER */

import {singleLine} from '../mixin/singleLine';
import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

/**
 * parameter of certain extension tags
 *
 * 某些扩展标签的参数
 */
@singleLine
export class ParamLineToken extends Token {
	override get type(): 'param-line' {
		return 'param-line';
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		return new ParamLineToken(
			undefined,
			this.getAttribute('config'),
			[],
			this.getAcceptable(),
		) as this;
	}
}
