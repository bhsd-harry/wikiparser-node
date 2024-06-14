import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {hiddenToken} from '../mixin/hidden';
import {Token} from './index';
import type {Config} from '../base';

/** 不可见的节点 */
@hiddenToken(true)
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
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Shadow.run(() => {
			const token = new HiddenToken(undefined, config, []) as this;
			token.append(...cloned);
			return token;
		});
	}
}

classes['HiddenToken'] = __filename;
