import * as Parser from '../index';
import {Token} from './index';
import {MagicLinkToken} from './magicLink';

/**
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
export class ExtLinkToken extends Token {
	override readonly type = 'ext-link';
	#space;

	declare childNodes: [MagicLinkToken] | [MagicLinkToken, Token];
	// @ts-expect-error abstract method
	abstract override get firstChild(): MagicLinkToken;
	// @ts-expect-error abstract method
	abstract override get lastChild(): Token;

	/**
	 * @param url 网址
	 * @param space 空白字符
	 * @param text 链接文字
	 */
	constructor(url?: string, space = '', text = '', config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		this.insertAt(new MagicLinkToken(url, true, config, accum));
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, accum, {
			});
			inner.type = 'ext-link-text';
			inner.setAttribute('stage', Parser.MAX_STAGE - 1);
			this.insertAt(inner);
		}
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		if (omit && this.matchesTypes(omit)) {
		} else if (this.length === 1) {
			return `[${super.toString(omit)}${this.#space}]`;
		}
		return `[${super.toString(omit, this.#space)}]`;
	}

	/** @override */
	override text(): string {
		return `[${super.text(' ')}]`;
	}

	/** @private */
	protected override getPadding(): number {
		return 1;
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i === 0 ? this.#space.length : 0;
	}

	/** @override */
	override print(): string {
		return super.print(
			this.length === 1 ? {pre: '[', post: `${this.#space}]`} : {pre: '[', sep: this.#space, post: ']'},
		);
	}
}
