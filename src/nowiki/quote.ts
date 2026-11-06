import {NowikiBaseToken} from './base';
import type {
	Config,
} from '../../base';
import type {Font} from '../../lib/node';
import type {Token} from '../../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {syntax} from '../../mixin/syntax';
import {cached} from '../../mixin/cached';
import type {SyntaxBase} from '../../mixin/syntax';

export interface QuoteToken extends SyntaxBase {}

/* NOT FOR BROWSER END */

/**
 * `''` and `'''`
 *
 * `''`和`'''`
 */
@syntax(/^(?:'{5}|'{2,3})$/u)
export abstract class QuoteToken extends NowikiBaseToken {
	#closing: Font;

	/* NOT FOR BROWSER */

	#match: {bold?: QuoteToken, italic?: QuoteToken} = {};

	/* NOT FOR BROWSER END */

	override get type(): 'quote' {
		return 'quote';
	}

	/** @private */
	get bold(): boolean {
		return this.innerText.length !== 2;
	}

	/** @private */
	get italic(): boolean {
		return this.innerText.length !== 3;
	}

	/**
	 * whether to be closing quotes
	 *
	 * 是否闭合
	 * @since v1.16.5
	 */
	get closing(): Partial<Font> {
		return {
			...this.bold && {bold: this.#closing.bold},
			...this.italic && {italic: this.#closing.italic},
		};
	}

	/** @param closing 是否闭合 */
	constructor(wikitext: string, closing: Font, config?: Config, accum?: Token[]) {
		super(wikitext, config, accum);
		this.#closing = closing;
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER ONLY */

	/** @private */
	override text(): string {
		const {parentNode, innerText} = this;
		return parentNode?.is('image-parameter') && parentNode.name !== 'caption' ? '' : innerText;
	}

	/* NOT FOR BROWSER ONLY END */

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		return Shadow.run(
			// @ts-expect-error abstract class
			(): this => new QuoteToken(this.innerText, this.#closing, this.getAttribute('config')),
		);
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
		if (key === 'bold') {
			this.#match.bold = value as QuoteToken;
		} else if (key === 'italic') {
			this.#match.italic = value as QuoteToken;
		} else {
			super.setAttribute(key, value);
		}
	}

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		const {bold, italic} = this.closing;
		return (bold ? '</b>' : '') + (italic ? '</i>' : '')
			+ (italic === false ? '<i>' : '') + (bold === false ? '<b>' : '');
	}
}
