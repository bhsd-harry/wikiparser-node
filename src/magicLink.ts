import {zs, text, decodeNumber} from '../util/string';
import Parser from '../index';
import {Token} from './index';
import type {
	AstText,
	CommentToken,
	IncludeToken,
	NoincludeToken,
	TranscludeToken,
} from '../internal';

/* NOT FOR BROWSER */

import {getRegex} from '@bhsd/common';
import {clone} from '../mixin/clone';
import {syntax} from '../mixin/syntax';
import {cached} from '../mixin/cached';
import type {SyntaxBase} from '../mixin/syntax';

/* NOT FOR BROWSER END */

declare type ExtLinkTypes = 'free-ext-link' | 'ext-link-url' | 'magic-link';
declare type Child = CommentToken | IncludeToken | NoincludeToken | TranscludeToken;

const space = String.raw`(?:[${zs}\t]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)`;
const spaceRegex = new RegExp(`${space}+`, 'gu');

/* NOT FOR BROWSER */

const spdash = String.raw`(?:[\p{Zs}\t-]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)`;
const isbnPattern = new RegExp(String.raw`^(ISBN)${space}+(?:97[89]${spdash}?)?(?:\d${spdash}?){9}[\dxX]$`, 'u');
const rfcPattern = new RegExp(String.raw`^(RFC|PMID)${space}+\d+$`, 'u');
const getUrlRegex = getRegex(protocol => new RegExp(`^(${protocol})`, 'iu'));

export interface MagicLinkToken extends SyntaxBase {}

/* NOT FOR BROWSER END */

/**
 * free external link
 *
 * 自由外链
 * @classdesc `{childNodes: (AstText|CommentToken|IncludeToken|NoincludeToken|TranscludeToken)[]}`
 */
@syntax()
export abstract class MagicLinkToken extends Token {
	readonly #type;

	declare readonly childNodes: readonly (AstText | Child)[];
	abstract override get firstChild(): AstText | TranscludeToken;
	abstract override get lastChild(): AstText | Child;

	/* NOT FOR BROWSER */

	abstract override get children(): Child[];

	/* NOT FOR BROWSER END */

	override get type(): ExtLinkTypes {
		return this.#type;
	}

	/**
	 * text of the link
	 *
	 * 链接显示文字
	 * @since v1.10.0
	 */
	get innerText(): string {
		const map = new Map([['!', '|'], ['=', '=']]);
		let link = text(this.childNodes.map(child => {
			const {type} = child,
				name = String(child.name);
			return type === 'magic-word' && map.has(name) ? map.get(name)! : child;
		}));
		if (this.type === 'magic-link') {
			link = link.replace(spaceRegex, ' ');
		}
		return link;
	}

	/** link / 链接 */
	get link(): string {
		const {innerText} = this;
		if (this.type === 'magic-link') {
			return innerText.startsWith('ISBN')
				? `ISBN ${
					innerText.slice(5).replace(/[- ]/gu, '')
						.replace(/x$/u, 'X')
				}`
				: innerText;
		}
		return decodeNumber(innerText).replace(/\n/gu, '%0A');
	}

	/* NOT FOR BROWSER */

	/** URL protocol / 协议 */
	get protocol(): string | undefined {
		return this.pattern.exec(this.text())?.[1];
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param url 网址
	 * @param type 类型
	 */
	constructor(url?: string, type: ExtLinkTypes = 'free-ext-link', config = Parser.getConfig(), accum?: Token[]) {
		super(url, config, accum, {
		});
		this.#type = type;

		/* NOT FOR BROWSER */

		let pattern;
		if (type === 'magic-link') {
			pattern = url?.startsWith('ISBN') ? isbnPattern : rfcPattern;
		} else {
			pattern = getUrlRegex(config.protocol + (type === 'ext-link-url' ? '|//' : ''));
		}
		this.setAttribute('pattern', pattern);
	}

	/** 获取自由外链的 URL */
	#getUrl(): URL {
		let {link} = this;
		if (link.startsWith('//')) {
			link = `https:${link}`;
		}
		return new URL(link);
	}

	/**
	 * Get the URL
	 *
	 * 获取网址
	 * @param articlePath article path / 条目路径
	 */
	getUrl(articlePath?: string): URL | string {
		LSP: {
			if (this.type !== 'magic-link') {
				return this.#getUrl();
			}
			const {link} = this;
			return link.startsWith('ISBN')
				? this.normalizeTitle(`BookSources/${link.slice(5)}`, -1, {temporary: true})
					.getUrl(articlePath)
				: new URL(
					link.startsWith('RFC')
						? `https://datatracker.ietf.org/doc/html/rfc${link.slice(4)}`
						: `https://www.ncbi.nlm.nih.gov/pubmed/${link.slice(5)}?dopt=Abstract`,
				);
		}
	}

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		const token: this = new MagicLinkToken(undefined, this.type, this.getAttribute('config'));
		token.setAttribute('pattern', this.pattern);
		return token;
	}

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		const {type, innerText, protocol} = this;
		let url: URL | string | undefined;
		try {
			url = this.getUrl();
		} catch {}
		const isISBN = protocol === 'ISBN',
			attrs = type === 'free-ext-link' || type === 'ext-link-url'
				? ` rel="nofollow" class="external free"${typeof url === 'object' ? ` href="${url.href}"` : ''}`
				: (isISBN ? '' : ` class="external mw-magiclink-${protocol!.toLowerCase()}" rel="nofollow"`)
					+ (url === undefined ? '' : ` href="${typeof url === 'string' ? url : url.href}"`)
					+ (isISBN ? ' class="internal mw-magiclink-isbn"' : '');
		return `<a${attrs}>${innerText}</a>`;
	}
}
