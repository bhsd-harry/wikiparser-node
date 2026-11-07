import {gapped} from '../../mixin/gapped';
import {Token} from '../index';
import type {AttributesToken, ExtToken} from '../../internal';

/* NOT FOR BROWSER */

import {clone} from '../../mixin/clone';

/* NOT FOR BROWSER END */

/**
 * extension tag that is parsed line by line
 *
 * 逐行解析的扩展标签
 */
@gapped()
export abstract class MultiLineToken extends Token {
	declare readonly name: string;

	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get previousElementSibling(): AttributesToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, '\n');
	}

	/** @private */
	override text(): string {
		return super.text('\n').replace(/\n\s*\n/gu, '\n');
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		const C = this.constructor as new (...args: any[]) => this;
		return new C(undefined, this.getAttribute('config'));
	}
}
