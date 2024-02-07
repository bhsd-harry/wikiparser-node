import {
	MAX_STAGE,

	/* NOT FOR BROWSER */

	classes,
} from '../util/constants';
import {generateForSelf} from '../util/lint';
import {normalizeSpace} from '../util/string';
import {Shadow} from '../util/debug';
import {magicLinkParent} from '../mixin/magicLinkParent';
import Parser from '../index';
import {Token} from './index';
import {MagicLinkToken} from './magicLink';
import type {LintError} from '../base';
import type {MagicLinkParentBase} from '../mixin/magicLinkParent';

export interface ExtLinkToken extends MagicLinkParentBase {}

/**
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
@magicLinkParent
export abstract class ExtLinkToken extends Token {
	override readonly type = 'ext-link';
	#space;

	declare readonly childNodes: readonly [MagicLinkToken] | readonly [MagicLinkToken, Token];
	abstract override get firstChild(): MagicLinkToken;
	abstract override get lastChild(): Token;

	/* NOT FOR BROWSER */

	abstract override get children(): [MagicLinkToken] | [MagicLinkToken, Token];
	abstract override get firstElementChild(): MagicLinkToken;
	abstract override get lastElementChild(): Token;

	/** 链接显示文字 */
	get innerText(): string {
		return this.length > 1
			? this.lastChild.text()
			: `[${this.getRootNode().querySelectorAll('ext-link[childElementCount=1]').indexOf(this) + 1}]`;
	}

	set innerText(text) {
		this.setLinkText(text);
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param url 网址
	 * @param space 空白字符
	 * @param text 链接文字
	 */
	constructor(url?: string, space = '', text = '', config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
			MagicLinkToken: 0, Token: 1,
		});
		// @ts-expect-error abstract class
		this.insertAt(new MagicLinkToken(url, true, config, accum) as MagicLinkToken);
		this.#space = space;
		if (text) {
			const inner = new Token(text, config, accum, {
				'Stage-7': ':', ConverterToken: ':',
			});
			inner.type = 'ext-link-text';
			inner.setAttribute('stage', MAX_STAGE - 1);
			this.insertAt(inner);
		}

		/* NOT FOR BROWSER */

		this.protectChildren(0);
	}

	/** @private */
	override toString(): string {
		if (this.length === 1) {
			return `[${super.toString()}${this.#space}]`;
		}

		/* NOT FOR BROWSER */

		this.#correct();
		normalizeSpace(this.lastChild);

		/* NOT FOR BROWSER END */

		return `[${super.toString(this.#space)}]`;
	}

	/** @override */
	override text(): string {
		/* NOT FOR BROWSER */

		normalizeSpace(this.childNodes[1]);

		/* NOT FOR BROWSER END */

		return `[${super.text(' ')}]`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding' ? 1 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @private */
	override getGaps(): number {
		/* NOT FOR BROWSER */

		this.#correct();

		/* NOT FOR BROWSER END */

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

	/** @override */
	override print(): string {
		return super.print(
			this.length === 1 ? {pre: '[', post: `${this.#space}]`} : {pre: '[', sep: this.#space, post: ']'},
		);
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const [url, text] = this.cloneChildNodes() as [MagicLinkToken, Token?];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new ExtLinkToken(undefined, '', '', this.getAttribute('config')) as this;
			token.firstChild.safeReplaceWith(url);
			if (text) {
				token.insertAt(text);
			}
			return token;
		});
	}

	/** 修正空白字符 */
	#correct(): void {
		if (
			!this.#space
			&& this.length > 1
			// 都替换成`<`肯定不对，但无妨
			&& /^[^[\]<>"{\0-\x1F\x7F\p{Zs}\uFFFD]/u.test(this.lastChild.text().replace(/&[lg]t;/u, '<'))
		) {
			this.#space = ' ';
		}
	}

	/**
	 * 设置链接显示文字
	 * @param str 链接显示文字
	 */
	setLinkText(str: string): void {
		const root = Parser.parse(str, this.getAttribute('include'), 7, this.getAttribute('config'));
		if (this.length === 1) {
			root.type = 'ext-link-text';
			root.setAttribute('acceptable', {
				'Stage-7': ':', ConverterToken: ':',
			});
			this.insertAt(root);
		} else {
			this.lastChild.replaceChildren(...root.childNodes);
		}
		this.#space ||= ' ';
	}
}

classes['ExtLinkToken'] = __filename;
