import Parser from '../index';
import {Token} from '.';

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...AstText|Token}`
 */
export class OnlyincludeToken extends Token {
	/** @browser */
	override readonly type = 'onlyinclude';

	/**
	 * @browser
	 * @param inner 标签内部wikitext
	 */
	constructor(inner?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(inner, config, true, accum);
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(selector?: string): string {
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

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		return super.print({
			pre: '<span class="wpb-ext">&lt;onlyinclude&gt;</span>',
			post: '<span class="wpb-ext">&lt;/onlyinclude&gt;</span>',
		});
	}
}
