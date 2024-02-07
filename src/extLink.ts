import {
	MAX_STAGE,
} from '../util/constants';
import {generateForSelf} from '../util/lint';
import Parser from '../index';
import {Token} from './index';
import {MagicLinkToken} from './magicLink';
import type {LintError} from '../base';

/**
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
export abstract class ExtLinkToken extends Token {
	override readonly type = 'ext-link';
	#space;

	declare readonly childNodes: readonly [MagicLinkToken] | readonly [MagicLinkToken, Token];
	abstract override get firstChild(): MagicLinkToken;
	abstract override get lastChild(): Token;

	/**
	 * @param url 网址
	 * @param space 空白字符
	 * @param text 链接文字
	 */
	constructor(url?: string, space = '', text = '', config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		// @ts-expect-error abstract class
		this.insertAt(new MagicLinkToken(url, true, config, accum) as MagicLinkToken);
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
	override toString(): string {
		if (this.length === 1) {
			return `[${super.toString()}${this.#space}]`;
		}
		return `[${super.toString(this.#space)}]`;
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
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start);
		if (this.length === 1 && this.closest('heading-title')) {
			errors.push(generateForSelf(this, {start}, 'var-anchor', 'variable anchor in a section header'));
		}
		return errors;
	}
}
