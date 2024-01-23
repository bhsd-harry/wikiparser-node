import {
	MAX_STAGE,
} from '../util/constants';
import {magicLinkParent} from '../mixin/magicLinkParent';
import * as Parser from '../index';
import {Token} from './index';
import {MagicLinkToken} from './magicLink';
import type {MagicLinkParentBase} from '../mixin/magicLinkParent';

/**
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
export class ExtLinkToken extends magicLinkParent(Token) implements MagicLinkParentBase {
	override readonly type = 'ext-link';
	#space;

	declare readonly childNodes: [MagicLinkToken] | [MagicLinkToken, Token];
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
			inner.setAttribute('stage', MAX_STAGE - 1);
			this.insertAt(inner);
		}
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		if (this.length === 1) {
			return `[${super.toString(omit)}${this.#space}]`;
		}
		return `[${super.toString(omit, this.#space)}]`;
	}

	/** @override */
	override text(): string {
		return `[${super.text(' ')}]`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding' ? 1 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	override getGaps(): number {
		return this.#space.length;
	}

	/** @override */
	override print(): string {
		return super.print(
			this.length === 1 ? {pre: '[', post: `${this.#space}]`} : {pre: '[', sep: this.#space, post: ']'},
		);
	}
}
