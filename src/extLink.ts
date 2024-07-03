import {
	MAX_STAGE,

	/* NOT FOR BROWSER */

	classes,
} from '../util/constants';
import {generateForSelf} from '../util/lint';
import {normalizeSpace, html} from '../util/string';
import {Shadow} from '../util/debug';
import {magicLinkParent} from '../mixin/magicLinkParent';
import Parser from '../index';
import {Token} from './index';
import {MagicLinkToken} from './magicLink';
import type {LintError} from '../base';
import type {MagicLinkParentBase} from '../mixin/magicLinkParent';
import type {FileToken} from '../internal';

export interface ExtLinkToken extends MagicLinkParentBase {}

/**
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
@magicLinkParent
export abstract class ExtLinkToken extends Token {
	#space;

	declare readonly childNodes: readonly [MagicLinkToken] | readonly [MagicLinkToken, Token];
	abstract override get firstChild(): MagicLinkToken;
	abstract override get lastChild(): Token;

	/* NOT FOR BROWSER */

	abstract override get children(): [MagicLinkToken] | [MagicLinkToken, Token];
	abstract override get firstElementChild(): MagicLinkToken;
	abstract override get lastElementChild(): Token;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-link' {
		return 'ext-link';
	}

	/* NOT FOR BROWSER */

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
		const link: MagicLinkToken = url && /\0\d+f\x7F/u.test(url)
			? accum[Number(url.slice(1, -2))]
			// @ts-expect-error abstract class
			: new MagicLinkToken(url, 'ext-link-url', config, accum);
		this.insertAt(link);
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
	override toString(skip?: boolean): string {
		if (this.length === 1) {
			return `[${super.toString(skip)}${this.#space}]`;
		}

		/* NOT FOR BROWSER */

		this.#correct();
		normalizeSpace(this.lastChild);

		/* NOT FOR BROWSER END */

		return `[${super.toString(skip, this.#space)}]`;
	}

	/** @private */
	override text(): string {
		/* NOT FOR BROWSER */

		normalizeSpace(this.childNodes[1]);

		/* NOT FOR BROWSER END */

		return `[${super.text(' ')}]`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding' ? 1 as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override getGaps(): number {
		/* NOT FOR BROWSER */

		this.#correct();

		/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

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
		const {lastChild, length} = this,
			{firstChild} = lastChild;
		if (
			!this.#space
			&& length > 1
			&& (firstChild?.type === 'text' || firstChild?.type === 'converter')
			// 都替换成`<`肯定不对，但无妨
			&& /^[^[\]<>"\0-\x1F\x7F\p{Zs}\uFFFD]/u.test(lastChild.text().replace(/&[lg]t;/u, '<'))
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

	/** @private */
	override toHtmlInternal(nowrap?: boolean): string {
		const {length, lastChild} = this,
			{childNodes} = lastChild;
		let trail = '',
			innerText: string;
		if (length > 1) {
			const i = childNodes.findIndex(
				child => child.type === 'link'
				|| child.is<FileToken>('file') && (child.getValue('link') as string | undefined)?.trim() !== '',
			);
			if (i !== -1) {
				const after = childNodes.slice(i);
				this.after(...after);
				trail = html(after, '', nowrap);
			}
			innerText = lastChild.toHtmlInternal();
		} else {
			({innerText} = this);
		}
		return `<a class="external" rel="nofollow" href="${this.getUrl().href}">${innerText}</a>${trail}`;
	}
}

classes['ExtLinkToken'] = __filename;
