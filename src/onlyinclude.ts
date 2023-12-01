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
		return key === 'padding' ? 13 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	protected override isPlain(): boolean {
		return true;
	}
}
