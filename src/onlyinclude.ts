import * as Parser from '../index';
import Token = require('.');

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...AstText|Token}`
 */
class OnlyincludeToken extends Token {
	/** @browser */
	override readonly type = 'onlyinclude';

	/** 内部wikitext */
	get innerText(): string {
		return this.text();
	}

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
		return selector && this.matches(selector) ? '' : `<onlyinclude>${super.toString(selector)}</onlyinclude>`;
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
	override print(): string {
		return super.print({
			pre: '<span class="wpb-ext">&lt;onlyinclude&gt;</span>',
			post: '<span class="wpb-ext">&lt;/onlyinclude&gt;</span>',
		});
	}

	/**
	 * @override
	 * @browser
	 */
	override isPlain(): boolean {
		return true;
	}

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			const token = new OnlyincludeToken(undefined, this.getAttribute('config')) as this;
			token.append(...cloned);
			return token;
		});
	}
}

Parser.classes['OnlyincludeToken'] = __filename;
export = OnlyincludeToken;
