import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';

/* NOT FOR BROWSER END */

/**
 * `<noinclude>` or `</noinclude>` that allows no modification
 *
 * `<noinclude>`或`</noinclude>`，不可进行任何更改
 */
@hiddenToken(false)
export abstract class NoincludeToken extends NowikiBaseToken {
	override get type(): 'noinclude' {
		return 'noinclude';
	}

	/** @private */
	override toString(skip?: boolean): string {
		return skip ? '' : super.toString();
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		return Shadow.run(() => {
			const C = this.constructor as new (...args: any[]) => this;
			return new C(
				this.innerText,
				this.getAttribute('config'),
			);
		});
	}
}
