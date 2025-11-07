import {Token} from './index';
import type {ParamTagToken} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {singleLine} from '../mixin/singleLine';
import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

/**
 * parameter of certain extension tags
 *
 * 某些扩展标签的参数
 */
@singleLine
export abstract class ParamLineToken extends Token {
	abstract override get parentNode(): ParamTagToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): this | undefined;

	/* NOT FOR BROWSER */

	abstract override get parentElement(): ParamTagToken | undefined;
	abstract override get nextElementSibling(): this | undefined;
	abstract override get previousElementSibling(): this | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'param-line' {
		return 'param-line';
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return new ParamLineToken(
			undefined,
			this.getAttribute('config'),
			[],
			this.getAcceptable(),
		) as this;
	}
}

classes['ParamLineToken'] = __filename;
