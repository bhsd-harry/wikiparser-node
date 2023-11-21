import {Token} from './index';

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...AstText|Token}`
 */
export class OnlyincludeToken extends Token {
	/** @browser */
	override readonly type = 'onlyinclude';

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		return `<onlyinclude>${super.toString()}</onlyinclude>`;
	}

	/**
	 * @override
	 * @browser
	 */
	override getPadding(): number {
		return 13;
	}

	/**
	 * @override
	 * @browser
	 */
	override isPlain(): boolean {
		return true;
	}
}
