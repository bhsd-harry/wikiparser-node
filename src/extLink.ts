import {
	MAX_STAGE,

	/* NOT FOR BROWSER */

	classes,
} from '../util/constants';
import {generateForSelf} from '../util/lint';
import {Token} from './index';
import {MagicLinkToken} from './magicLink';
import type {Config, LintError} from '../base';

/* NOT FOR BROWSER */

import {normalizeSpace} from '../util/string';
import {Shadow} from '../util/debug';
import Parser from '../index';
import type {FileToken} from '../internal';

/* NOT FOR BROWSER END */

/**
 * external link
 *
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, ?Token]}`
 */
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

	/** text of the link / 链接显示文字 */
	get innerText(): string {
		return this.length > 1
			? this.lastChild.text()
			: `[${
				this.getRootNode().querySelectorAll<this>('ext-link[childElementCount=1]').indexOf(this) + 1
			}]`;
	}

	set innerText(text) {
		this.setLinkText(text);
	}

	/** URL protocol / 协议 */
	get protocol(): string | undefined {
		return this.firstChild.protocol;
	}

	set protocol(value: string) {
		this.firstChild.protocol = value;
	}

	/** link / 链接 */
	get link(): string {
		return this.firstChild.link;
	}

	set link(url) {
		this.firstChild.link = url;
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param url 网址
	 * @param space 空白字符
	 * @param text 链接文字
	 */
	constructor(url?: string, space = '', text = '', config?: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
			MagicLinkToken: 0, Token: 1,
		});
		const link: MagicLinkToken = url && /^\0\d+f\x7F$/u.test(url)
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
			const token = new ExtLinkToken(undefined, this.#space, '', this.getAttribute('config')) as this;
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
			// eslint-disable-next-line es-x/no-regexp-unicode-property-escapes
			&& /^[^[\]<>"\0-\x1F\x7F\p{Zs}\uFFFD]/u
				.test(lastChild.text().replace(/&[lg]t;/u, '<'))
		) {
			this.#space = ' ';
		}
	}

	/**
	 * Set the text of the link
	 *
	 * 设置链接显示文字
	 * @param str text of the link / 链接显示文字
	 */
	setLinkText(str: string): void {
		const root = Parser
			.parse(str, this.getAttribute('include'), 7, this.getAttribute('config'));
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
	override toHtmlInternal(opt?: HtmlOpt): string {
		const {length, lastChild} = this;
		let innerText: string,
			href: string | undefined;
		if (length > 1) {
			lastChild.normalize();
			const {childNodes} = lastChild,
				i = childNodes.findIndex(
					child => child.type === 'link'
						|| child.is<FileToken>('file')
						&& (child.getValue('link') as string | undefined)?.trim() !== '',
				);
			if (i !== -1) {
				const after = childNodes.slice(i);
				this.after(...after);
			}
			innerText = lastChild.toHtmlInternal(opt);
		} else {
			({innerText} = this);
		}
		try {
			({href} = this.getUrl());
		} catch {}
		return `<a rel="nofollow" class="external"${
			href === undefined ? '' : ` href="${href}"`
		}>${innerText}</a>`;
	}

	/**
	 * Get the URL
	 *
	 * 获取网址
	 */
	getUrl(): URL {
		return this.firstChild.getUrl() as URL;
	}

	/**
	 * Set the target of the link
	 *
	 * 设置外链目标
	 * @param url URL containing the protocol / 含协议的网址
	 */
	setTarget(url: string): void {
		this.firstChild.setTarget(url);
	}
}

classes['ExtLinkToken'] = __filename;
