import {hiddenToken} from '../mixin/hidden';
import {Token} from './index';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {clone} from '../mixin/clone';
import type {Config} from '../base';

/* NOT FOR BROWSER END */

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

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return (key === 'invalid') as TokenAttribute<T> || super.getAttribute(key);
	}

	/* PRINT ONLY END */

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

classes['HiddenToken'] = __filename;
