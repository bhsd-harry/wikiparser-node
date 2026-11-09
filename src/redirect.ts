import {hiddenToken} from '../mixin/hidden';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import {RedirectTargetToken} from './link/redirectTarget';
import type {
	Config,
} from '../base';

/**
 * redirect
 *
 * 重定向
 * @classdesc `{childNodes: [SyntaxToken, RedirectTargetToken]}`
 */
@hiddenToken(false, false)
export abstract class RedirectToken extends Token {
	readonly #pre;
	readonly #post;

	declare readonly childNodes: readonly [SyntaxToken, RedirectTargetToken];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): RedirectTargetToken;
	abstract override get previousSibling(): undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken, RedirectTargetToken];

	/* NOT FOR BROWSER END */

	override get type(): 'redirect' {
		return 'redirect';
	}

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
		config: Config,
		accum: Token[] = [],
	) {
		super(undefined, config, accum);
		this.#pre = pre;
		this.#post = post;
		this.append(
			new SyntaxToken(
				syntax,
				'redirect-syntax',
				config,
				accum,
			),
			// @ts-expect-error abstract class
			new RedirectTargetToken(link, text?.slice(1), config, accum) as RedirectTargetToken,
		);
	}

	/** @private */
	override toString(skip?: boolean): string {
		return this.#pre + super.toString(skip) + this.#post;
	}

	/* NOT FOR BROWSER */

	/** @private */
	override toHtmlInternal({render = {}}: HtmlOpt = {}): string {
		const {redirect = true} = render;
		return redirect ? `<ul class="redirectText"><li>${this.lastChild.toHtmlInternal()}</li></ul>` : '';
	}
}
