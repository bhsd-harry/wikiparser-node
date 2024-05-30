import {Token} from './index';

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...AstText|Token}`
 */
export class OnlyincludeToken extends Token {
	override readonly type = 'onlyinclude';

	/** @private */
	override toString(): string {
		return `<onlyinclude>${super.toString()}</onlyinclude>`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		if (key === 'padding') {
			return 13 as TokenAttribute<T>;
		}
		return (key === 'plain') as TokenAttribute<T> || super.getAttribute(key);
	}
}
