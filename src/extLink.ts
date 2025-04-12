import {
	MAX_STAGE,
} from '../util/constants';
import {generateForSelf} from '../util/lint';
import {padded} from '../mixin/padded';
import {Token} from './index';
import {MagicLinkToken} from './magicLink';
import type {Config, LintError} from '../base';

/**
 * external link
 *
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
@padded(1)
export abstract class ExtLinkToken extends Token {
	#space;

	declare readonly childNodes: readonly [MagicLinkToken] | readonly [MagicLinkToken, Token];
	abstract override get firstChild(): MagicLinkToken;
	abstract override get lastChild(): Token;

	override get type(): 'ext-link' {
		return 'ext-link';
	}

	/**
	 * @param url 网址
	 * @param space 空白字符
	 * @param text 链接文字
	 */
	constructor(url?: string, space = '', text = '', config?: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		const link: MagicLinkToken = url && /^\0\d+f\x7F$/u.test(url)
			? accum[Number(url.slice(1, -2))]
			// @ts-expect-error abstract class
			: new MagicLinkToken(url, 'ext-link-url', config, accum);
		this.insertAt(link);
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, accum, {
			});
			inner.type = 'ext-link-text';
			inner.setAttribute('stage', MAX_STAGE - 1);
			this.insertAt(inner);
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		if (this.length === 1) {
			return `[${super.toString(skip)}${this.#space}]`;
		}
		return `[${super.toString(skip, this.#space)}]`;
	}

	/** @private */
	override text(): string {
		return `[${super.text(' ')}]`;
	}

	/** @private */
	override getGaps(): number {
		return this.#space.length;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		if (this.length === 1 && this.closest('heading-title')) {
			errors.push(generateForSelf(this, {start}, 'var-anchor', 'variable anchor in a section header'));
		}
		return errors;
	}

	/** @private */
	override print(): string {
		return super.print(
			this.length === 1 ? {pre: '[', post: `${this.#space}]`} : {pre: '[', sep: this.#space, post: ']'},
		);
	}
}
