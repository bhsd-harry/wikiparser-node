import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';
import type {

	/* NOT FOR BROWSER */

	Config,
} from '../../base';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import type {Token} from '../../internal';

/* NOT FOR BROWSER END */

/**
 * `<noinclude>` or `</noinclude>` that allows no modification
 *
 * `<noinclude>`或`</noinclude>`，不可进行任何更改
 */
@hiddenToken(false)
export abstract class NoincludeToken extends NowikiBaseToken {
	/* NOT FOR BROWSER */

	#fixed;

	/* NOT FOR BROWSER END */

	override get type(): 'noinclude' {
		return 'noinclude';
	}

	/* NOT FOR BROWSER */

	/** @param fixed 是否不可更改 */
	constructor(wikitext: string, config?: Config, accum?: Token[], fixed = false) {
		super(wikitext, config, accum);
		this.#fixed = fixed;
	}

	/* NOT FOR BROWSER END */

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? '' : super.toString();
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		return Shadow.run(() => {
			const C = this.constructor as new (...args: any[]) => this;
			return new C(this.innerText, this.getAttribute('config'), [], this.#fixed);
		});
	}
}
