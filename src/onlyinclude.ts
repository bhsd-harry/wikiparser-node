import {Token} from './index';

/* NOT FOR BROWSER */

import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

/**
 * `<onlyinclude>` during transclusion
 *
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: (AstText|Token)[]}`
 */
export class OnlyincludeToken extends Token {
	override get type(): 'onlyinclude' {
		return 'onlyinclude';
	}

	/** @private */
	override toString(skip?: boolean): string {
		return `<onlyinclude>${super.toString(skip)}</onlyinclude>`;
	}

	/** @private */
	override isPlain(): true {
		return true;
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		return new OnlyincludeToken(undefined, this.getAttribute('config')) as this;
	}
}
