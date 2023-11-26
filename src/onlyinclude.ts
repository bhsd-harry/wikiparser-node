import * as Parser from '../index';
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

	set innerText(text) {
		const config = this.getAttribute('config'),
			{length, firstChild} = Parser.parse(`<onlyinclude>${text}</onlyinclude>`, true, undefined, config);
		if (length !== 1 || firstChild!.type !== 'onlyinclude') {
			throw new RangeError('不允许包含一个 <onlyinclude> 标签！');
		}
		this.replaceChildren(...firstChild!.childNodes);
	}

	/* NOT FOR BROWSER END */

	/** @private */
	override toString(omit?: Set<string>): string {
		return omit && this.matchesTypes(omit) ? '' : `<onlyinclude>${super.toString(omit)}</onlyinclude>`;
	}

	/** @private */
	protected override getPadding(): number {
		return 13;
	}

	/** @private */
	protected override isPlain(): boolean {
		return true;
	}

	/** @override */
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
		return Parser.run(() => {
			const token = new OnlyincludeToken(undefined, this.getAttribute('config')) as this;
			token.append(...cloned);
			return token;
		});
	}
}

Parser.classes['OnlyincludeToken'] = __filename;
