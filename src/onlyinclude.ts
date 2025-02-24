import {Token} from './index';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import Parser from '../index';

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

	/* NOT FOR BROWSER */

	/** inner wikitext / 内部wikitext */
	get innerText(): string {
		return this.text();
	}

	/** @throws `RangeError` 不允许包含`</onlyinclude>` */
	set innerText(text) {
		/* istanbul ignore if */
		if (text.includes('</onlyinclude>')) {
			throw new RangeError('"</onlyinclude>" is not allowed in the text!');
		}
		this.replaceChildren(
			...Parser.parse(text, true, undefined, this.getAttribute('config')).childNodes,
		);
	}

	/* NOT FOR BROWSER END */

	/** @private */
	override toString(skip?: boolean): string {
		return `<onlyinclude>${super.toString(skip)}</onlyinclude>`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		if (key === 'padding') {
			return 13 as TokenAttribute<T>;
		}
		return (key === 'plain') as TokenAttribute<T> || super.getAttribute(key);
	}

	/** @private */
	override print(): string {
		return super.print({
			pre: '<span class="wpb-ext">&lt;onlyinclude&gt;</span>',
			post: '<span class="wpb-ext">&lt;/onlyinclude&gt;</span>',
		});
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			const token = new OnlyincludeToken(undefined, this.getAttribute('config')) as this;
			token.append(...cloned);
			return token;
		});
	}
}

classes['OnlyincludeToken'] = __filename;
