import {hiddenToken} from '../mixin/hidden';
import {Token} from './index';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {cloneNode} from '../util/html';
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

	/* NOT FOR BROWSER */

	/** @class */
	constructor(wikitext?: string, config?: Config, accum?: Token[]) {
		super(wikitext, config, accum, {
			'Stage-2': ':', '!HeadingToken': '',
		});
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return (key === 'invalid') as TokenAttribute<T> || super.getAttribute(key);
	}

	override cloneNode(): this {
		return cloneNode(
			this,
			() => new HiddenToken(undefined, this.getAttribute('config'), []) as this,
		);
	}
}

classes['HiddenToken'] = __filename;
