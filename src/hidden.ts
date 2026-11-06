import {hiddenToken} from '../mixin/hidden';
import {Token} from './index';
import type {

	/* NOT FOR BROWSER */

	Config,
} from '../base';

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

	/** @class */
	constructor(wikitext?: string, config?: Config, accum?: Token[]) {
		super(wikitext, config, accum, {
			'Stage-2': ':', '!HeadingToken': '',
		});
	}

	@clone
	override cloneNode(): this {
		return new HiddenToken(undefined, this.getAttribute('config')) as this;
	}
}
