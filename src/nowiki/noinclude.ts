import {hiddenToken} from '../../mixin/hidden';
import {NowikiBaseToken} from './base';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {Shadow} from '../../util/debug';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/* NOT FOR BROWSER END */

/**
 * `<noinclude>` or `</noinclude>` that allows no modification
 *
 * `<noinclude>`或`</noinclude>`，不可进行任何更改
 */
@hiddenToken()
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

	/* istanbul ignore next */
	override setText(str: string): string {
		return this.#fixed ? this.constructorError('cannot change the text content') : super.setText(str);
	}
}

classes['NoincludeToken'] = __filename;
