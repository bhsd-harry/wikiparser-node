import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import Parser from '../index';
import {Token} from './index';

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...AstText|Token}`
 */
export class OnlyincludeToken extends Token {
	override readonly type = 'onlyinclude';

	/* NOT FOR BROWSER */

	/** 内部wikitext */
	get innerText(): string {
		return this.text();
	}

	/** @throws `RangeError` 不允许包含`</onlyinclude>` */
	set innerText(text) {
		if (text.includes('</onlyinclude>')) {
			throw new RangeError('不允许包含 "</onlyinclude>"！');
		}
		this.replaceChildren(...Parser.parse(text, true, undefined, this.getAttribute('config')).childNodes);
	}

	/* NOT FOR BROWSER END */

	/** @private */
	override toString(): string {
		return `<onlyinclude>${super.toString()}</onlyinclude>`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		if (key === 'padding') {
			return 13 as TokenAttributeGetter<T>;
		}
		return (key === 'plain') as TokenAttributeGetter<T> || super.getAttribute(key);
	}

	/** @private */
	override print(): string {
		return super.print({
			pre: '<span class="wpb-ext">&lt;onlyinclude&gt;</span>',
			post: '<span class="wpb-ext">&lt;/onlyinclude&gt;</span>',
		});
	}

	/* NOT FOR BROWSER */

	/** @override */
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
