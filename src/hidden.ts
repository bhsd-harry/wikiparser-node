import {hiddenToken} from '../mixin/hidden';
import {Token} from './index';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import type {Config} from '../base';

/* NOT FOR BROWSER END */

/** 不可见的节点 */
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

	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			const token = new HiddenToken(undefined, this.getAttribute('config'), []) as this;
			token.append(...cloned);
			return token;
		});
	}
}

classes['HiddenToken'] = __filename;
