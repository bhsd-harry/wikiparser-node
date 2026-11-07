import {
	MAX_STAGE,
} from '../util/constants';
import {Token} from './index';
import {MagicLinkToken} from './magicLink';
import type {Config} from '../base';

/* NOT FOR BROWSER */

import {normalizeSpace} from '../util/string';
import {Shadow} from '../util/debug';
import {cached} from '../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * external link
 *
 * 外链
 * @classdesc `{childNodes: [MagicLinkToken, Token?]}`
 */
export abstract class ExtLinkToken extends Token {
	#space;

	declare readonly childNodes: readonly [MagicLinkToken] | readonly [MagicLinkToken, Token];
	abstract override get firstChild(): MagicLinkToken;
	abstract override get lastChild(): Token;

	/* NOT FOR BROWSER */

	abstract override get children(): [MagicLinkToken] | [MagicLinkToken, Token];

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
	}

	/** @private */
	override toString(skip?: boolean): string {
		if (this.length === 1) {
			return `[${super.toString(skip)}${this.#space}]`;
		}

		/* NOT FOR BROWSER */

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
	override getGaps(): number {
		return this.#space.length;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [url, text] = this.cloneChildNodes() as [MagicLinkToken, Token?];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ExtLinkToken(undefined, this.#space, '', this.getAttribute('config'));
			token.firstChild.safeReplaceWith(url);
			if (text) {
				token.insertAt(text);
			}
			return token;
		});
	}

	/** @private */
	override toHtmlOrPlain(_: unknown, method: Method, opt?: HtmlOpt): string {
		const {length, lastChild} = this;
		if (length === 1) {
			return this.innerText;
		}
		lastChild.normalize();
		const {childNodes} = lastChild,
			i = childNodes.findIndex(
				child => child.is('link') || child.is('file') && child.getValue('link') !== '',
			);
		if (i !== -1) {
			const after = childNodes.slice(i);
			this.insertAdjacent(after);
		}
		return lastChild[method](opt);
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: HtmlOpt): string {
		let href = '';
		try {
			href = ` href="${this.getUrl().href}"`;
		} catch {}
		return `<a rel="nofollow" class="external ${
			this.length > 1 ? 'text' : 'autonumber'
		}"${href}>${super.toHtmlInternal(opt)}</a>`;
	}

	/**
	 * Get the URL
	 *
	 * 获取网址
	 */
	getUrl(): URL {
		return this.firstChild.getUrl() as URL;
	}
}
