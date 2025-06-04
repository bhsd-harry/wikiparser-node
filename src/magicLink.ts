import {getRegex} from '@bhsd/common';
import {generateForChild, generateForSelf} from '../util/lint';
import {zs, text, decodeNumber} from '../util/string';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import type {LintError} from '../base';
import type {
	AstText,
	CommentToken,
	IncludeToken,
	NoincludeToken,
	TranscludeToken,

	/* NOT FOR BROWSER */

	AstNodes,
	ParameterToken,
} from '../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {cloneNode} from '../util/html';
import {syntax} from '../mixin/syntax';
import type {SyntaxBase} from '../mixin/syntax';

/* NOT FOR BROWSER END */

declare type ExtLinkTypes = 'free-ext-link' | 'ext-link-url' | 'magic-link';

const space = String.raw`(?:[${zs}\t]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)`;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/(?:[\p{Zs}\t]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)+/gu;
const spaceRegex = new RegExp(`${space}+`, 'gu');

/* NOT FOR BROWSER */

const spdash = String.raw`(?:[\p{Zs}\t-]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)`;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/^(ISBN)[\p{Zs}\t]+(?:97[89][\p{Zs}\t-]?)?(?:\d[\p{Zs}\t-]?){9}[\dxX]$/u;
const isbnPattern = new RegExp(String.raw`^(ISBN)${space}+(?:97[89]${spdash}?)?(?:\d${spdash}?){9}[\dxX]$`, 'u');
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/^(RFC|PMID)[\p{Zs}\t]+\d+$/u;
const rfcPattern = new RegExp(String.raw`^(RFC|PMID)${space}+\d+$`, 'u');
/^(ftp:\/\/|\/\/)/iu; // eslint-disable-line @typescript-eslint/no-unused-expressions
const getUrlRegex = getRegex(protocol => new RegExp(`^(${protocol})`, 'iu'));

export interface MagicLinkToken extends SyntaxBase {}

/* NOT FOR BROWSER END */

/**
 * free external link
 *
 * 自由外链
 * @classdesc `{childNodes: (AstText|CommentToken|IncludeToken|NoincludeToken)[]}`
 */
@syntax()
export abstract class MagicLinkToken extends Token {
	readonly #type;

	declare readonly childNodes: readonly (AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken)[];
	abstract override get firstChild(): AstText | TranscludeToken;
	abstract override get lastChild(): AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken;

	/* NOT FOR BROWSER */

	abstract override get children(): (CommentToken | IncludeToken | NoincludeToken | TranscludeToken)[];
	abstract override get firstElementChild():
		CommentToken | IncludeToken | NoincludeToken | TranscludeToken | undefined;
	abstract override get lastElementChild():
		CommentToken | IncludeToken | NoincludeToken | TranscludeToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): ExtLinkTypes {
		return this.#type;
	}

	/** text of the link / 链接显示文字 */
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
		return decodeNumber(innerText);
	}

	/* NOT FOR BROWSER */

	set link(url) {
		this.setTarget(url);
	}

	/** URL protocol / 协议 */
	get protocol(): string | undefined {
		return this.pattern.exec(this.text())?.[1];
	}

	/** @throws `Error` 特殊外链无法更改协议n */
	set protocol(value: string) {
		const {link, pattern, type} = this;
		if (type === 'magic-link' || !pattern.test(link)) {
			throw new Error(`Special external link cannot change protocol: ${link}`);
		}
		this.setTarget(link.replace(pattern, value));
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param url 网址
	 * @param type 类型
	 */
	constructor(url?: string, type: ExtLinkTypes = 'free-ext-link', config = Parser.getConfig(), accum?: Token[]) {
		super(url, config, accum, {
			'Stage-1': '1:', '!ExtToken': '', AstText: ':', TranscludeToken: ':',
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

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			rect = new BoundingRect(this, start),
			{type, childNodes} = this;
		if (type === 'magic-link') {
			const {link} = this;
			if (link.startsWith('ISBN')) {
				// eslint-disable-next-line unicorn/no-useless-spread, @typescript-eslint/no-misused-spread
				const digits = [...link.slice(5)].map(s => s === 'X' ? 10 : Number(s));
				if (
					digits.length === 10 && digits.reduce((sum, d, i) => sum + d * (10 - i), 0) % 11
					|| digits.length === 13 && (
						digits[12] === 10
						|| digits.reduce((sum, d, i) => sum + d * (i % 2 ? 3 : 1), 0) % 10
					)
				) {
					errors.push(generateForSelf(this, rect, 'invalid-isbn', 'invalid ISBN'));
				}
			}
			return errors;
		}
		const pipe = type === 'ext-link-url',
			regex = pipe ? /\|/u : /[，；。：！？（）]+/u,
			child = childNodes.find((c): c is AstText => c.type === 'text' && regex.test(c.data));
		if (child) {
			const {data} = child,
				e = generateForChild(
					child,
					rect,
					'unterminated-url',
					Parser.msg('$1 in URL', pipe ? '"|"' : 'full-width punctuation'),
					'warning',
				),
				{index, 0: s} = regex.exec(data)!,
				i = e.startIndex + index;
			e.suggestions = pipe
				? [{desc: 'whitespace', range: [i, i + 1], text: ' '}]
				: [
					{desc: 'whitespace', range: [i, i], text: ' '},
					{desc: 'escape', range: [i, i + s.length], text: encodeURI(s)},
				];
			errors.push(e);
		}
		return errors;
	}

	/**
	 * Get the URL
	 *
	 * 获取网址
	 * @param articlePath article path / 条目路径
	 */
	getUrl(articlePath?: string): URL | string {
		LSP: { // eslint-disable-line no-unused-labels
			const {type} = this;
			let {link} = this;
			if (type === 'magic-link') {
				if (link.startsWith('ISBN')) {
					return this
						.normalizeTitle(`BookSources/${link.slice(5)}`, -1, {temporary: true})
						.getUrl(articlePath);
				}
				link = link.startsWith('RFC')
					? `https://datatracker.ietf.org/doc/html/rfc${link.slice(4)}`
					: `https://pubmed.ncbi.nlm.nih.gov/${link.slice(5)}`;
			} else if (link.startsWith('//')) {
				link = `https:${link}`;
			}
			return new URL(link);
		}
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const token = cloneNode<this>(
			this,
			// @ts-expect-error abstract class
			() => new MagicLinkToken(undefined, this.type, this.getAttribute('config')),
		);
		token.setAttribute('pattern', this.pattern);
		return token;
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的节点
	 * @param i position to be inserted at / 插入位置
	 */
	override insertAt(token: string, i?: number): AstText;
	override insertAt<T extends AstNodes>(token: T, i?: number): T;
	override insertAt<T extends AstNodes>(token: T | string, i?: number): T | AstText {
		if (typeof token !== 'string') {
			const {type, name} = token;
			if (type === 'template') {
				this.constructorError('cannot insert a template');
			} else if (!Shadow.running && type === 'magic-word' && name !== '!' && name !== '=') {
				this.constructorError('cannot insert magic words other than "{{!}}" or "{{=}}"');
			}
		}
		return super.insertAt(token as string, i);
	}

	/**
	 * Set the target of the link
	 *
	 * 设置外链目标
	 * @param url URL containing the protocol / 含协议的网址
	 */
	setTarget(url: string): void {
		const {childNodes} = Parser
			.parse(url, this.getAttribute('include'), 2, this.getAttribute('config'));
		this.safeReplaceChildren(childNodes);
	}

	/**
	 * Check if it is a parameter of a template or magic word
	 *
	 * 是否是模板或魔术字参数
	 */
	isParamValue(): boolean {
		return this.closest<ParameterToken>('parameter')?.getValue() === this.text();
	}

	/** @private */
	override toHtmlInternal(): string {
		const {type, innerText, protocol} = this;
		let url: URL | string | undefined;
		try {
			url = this.getUrl();
		} catch {}
		return `<a${
			type === 'magic-link' && protocol === 'ISBN'
				? ''
				: ` rel="nofollow" class="external${type === 'free-ext-link' ? ' free' : ''}"`
		}${url === undefined ? '' : ` href="${typeof url === 'string' ? url : url.href}"`}>${innerText}</a>`;
	}
}

classes['MagicLinkToken'] = __filename;
