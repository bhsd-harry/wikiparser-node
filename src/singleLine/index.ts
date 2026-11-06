import {Token} from '../index';
import type {MultiLineToken} from '../multiLine/index';

/* NOT FOR BROWSER */

import {singleLine} from '../../mixin/singleLine';
import {clone} from '../../mixin/clone';

/* NOT FOR BROWSER END */

/**
 * single-line token inside specific extension tags, such as `<charinsert>` and `<imagemap>`
 *
 * 特定扩展标签内的单行节点，如 `<charinsert>` 和 `<imagemap>`
 */
@singleLine
export abstract class SingleLineToken extends Token {
	abstract override get parentNode(): MultiLineToken | undefined;

	/** @private */
	override isPlain(): boolean {
		return this.type === 'plain';
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		const C = this.constructor as new (...args: any[]) => this;
		return new C(undefined, this.getAttribute('config'));
	}
}
