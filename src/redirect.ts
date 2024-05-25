import {hiddenToken} from '../mixin/hidden';
import Parser from '../index';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import {RedirectTargetToken} from './link/redirectTarget';
import type {LintError} from '../base';

/**
 * 重定向
 * @classdesc `{childNodes: [SyntaxToken, LinkToken]}`
 */
export abstract class RedirectToken extends hiddenToken(Token) {
	override readonly type = 'redirect';
	#pre: string;
	#post: string;

	declare readonly childNodes: readonly [SyntaxToken, RedirectTargetToken];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): RedirectTargetToken;
	abstract override get previousSibling(): undefined;

	/**
	 * @param pre leading whitespace
	 * @param syntax 重定向魔术字
	 * @param link 重定向目标
	 * @param text 重定向显示文本（无效）
	 * @param post trailing whitespace
	 */
	constructor(
		pre: string,
		syntax: string | undefined,
		link: string,
		text: string | undefined,
		post: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		super(undefined, config, accum);
		this.#pre = pre;
		this.#post = post;
		const pattern = new RegExp(`^(?:${config.redirection.join('|')})\\s*(?::\\s*)?$`, 'iu');
		this.append(
			new SyntaxToken(syntax, pattern, 'redirect-syntax', config, accum, {
			}),
			// @ts-expect-error abstract class
			new RedirectTargetToken(link, text?.slice(1), config, accum) as RedirectTargetToken,
		);
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding' ? this.#pre.length as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	override toString(): string {
		return this.#pre + super.toString() + this.#post;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		return this.lastChild.lint(start + this.#pre.length + this.firstChild.toString().length);
	}
}
