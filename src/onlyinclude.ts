import {Token} from './index';

/**
 * 嵌入时的`<onlyinclude>`
 * @classdesc `{childNodes: ...AstText|Token}`
 */
export class OnlyincludeToken extends Token {
	override readonly type = 'onlyinclude';

	/** @private */
	override toString(omit?: Set<string>): string {
		return omit && this.matchesTypes(omit) ? '' : `<onlyinclude>${super.toString(omit)}</onlyinclude>`;
	}

	/** @override */
	protected override getPadding(): number {
		return 13;
	}

	/** @override */
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
}
