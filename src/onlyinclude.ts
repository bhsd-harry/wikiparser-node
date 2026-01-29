import {padded} from '../mixin/padded';
import {noEscape} from '../mixin/noEscape';
import {Token} from './index';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {clone} from '../mixin/clone';
import Parser from '../index';

/* NOT FOR BROWSER END */

/**
 * `<onlyinclude>` during transclusion
 *
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: (AstText|Token)[]}`
 */
@noEscape @padded('<onlyinclude>')
export class OnlyincludeToken extends Token {
	override get type(): 'onlyinclude' {
		return 'onlyinclude';
	}

	/* NOT FOR BROWSER */

	/** inner wikitext / 内部wikitext */
	get innerText(): string {
		return this.text();
	}

	/** @throws `RangeError` 不允许包含`</onlyinclude>` */
	set innerText(text) {
		/* c8 ignore next 3 */
		if (text.includes('</onlyinclude>')) {
			throw new RangeError('"</onlyinclude>" is not allowed in the text!');
		}
		const {childNodes} = Parser.parseWithRef(text, this, undefined, true);
		this.safeReplaceChildren(childNodes);
	}

	/* NOT FOR BROWSER END */

	/** @private */
	override toString(skip?: boolean): string {
		return `<onlyinclude>${super.toString(skip)}</onlyinclude>`;
	}

	/** @private */
	override isPlain(): true {
		return true;
	}

	/** @private */
	override print(): string {
		PRINT: return super.print({
			pre: '<span class="wpb-ext">&lt;onlyinclude&gt;</span>',
			post: '<span class="wpb-ext">&lt;/onlyinclude&gt;</span>',
		});
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		return new OnlyincludeToken(undefined, this.getAttribute('config')) as this;
	}
}

classes['OnlyincludeToken'] = __filename;
