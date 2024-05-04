import {classes} from '../util/constants';
import {Shadow} from '../util/debug';
import {hiddenToken} from '../mixin/hidden';
import {fixedToken} from '../mixin/fixed';
import Parser from '../index';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import {RedirectTargetToken} from './link/redirectTarget';
import type {LintError} from '../base';

/**
 * 重定向
 * @classdesc `{childNodes: [SyntaxToken, LinkToken]}`
 */
@fixedToken
export abstract class RedirectToken extends hiddenToken(Token) {
	override readonly type = 'redirect';
	#pre: string;
	#post: string;

	declare readonly childNodes: readonly [SyntaxToken, RedirectTargetToken];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): RedirectTargetToken;
	abstract override get previousSibling(): undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, RedirectTargetToken];
	abstract override get firstElementChild(): SyntaxToken;
	abstract override get lastElementChild(): RedirectTargetToken;
	abstract override get previousElementSibling(): undefined;

	/* NOT FOR BROWSER END */

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
				AstText: ':',
			}),
			// @ts-expect-error abstract class
			new RedirectTargetToken(link, text?.slice(1), config, accum) as RedirectTargetToken,
		);
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding' ? this.#pre.length as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @override */
	override toString(): string {
		return this.#pre + super.toString() + this.#post;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		return this.lastChild.lint(start + this.#pre.length + String(this.firstChild).length);
	}

	/** @override */
	override print(): string {
		return super.print({pre: this.#pre, post: this.#post});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes() as [SyntaxToken, RedirectTargetToken],
			config = this.getAttribute('config');
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new RedirectToken([this.#pre, undefined, '', undefined, this.#post], config, []);
			token.firstChild.safeReplaceWith(cloned[0]);
			token.lastChild.safeReplaceWith(cloned[1]);
			return token;
		});
	}
}

classes['RedirectToken'] = __filename;
