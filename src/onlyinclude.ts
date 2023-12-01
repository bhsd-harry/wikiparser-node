import {Token} from './index';

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...AstText|Token}`
 */
export class OnlyincludeToken extends Token {
	override readonly type = 'onlyinclude';

	/** @private */
	override toString(omit?: Set<string>): string {
		return `<onlyinclude>${super.toString()}</onlyinclude>`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		if (key === 'padding') {
			return 13 as TokenAttributeGetter<T>;
		}
		return (key === 'plain') as TokenAttributeGetter<T> || super.getAttribute(key);
	}

	/** @override */
	override print(): string {
		return super.print({
			pre: '<span class="wpb-ext">&lt;onlyinclude&gt;</span>',
			post: '<span class="wpb-ext">&lt;/onlyinclude&gt;</span>',
		});
	}
}
