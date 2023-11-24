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
	protected override getPadding(): number {
		return 13;
	}

	/** @private */
	protected override isPlain(): boolean {
		return true;
	}
}
