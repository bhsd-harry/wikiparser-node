import {generateForChild, generateForSelf} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {text} from '../util/string';
import {syntax} from '../mixin/syntax';
import Parser from '../index';
import {Token} from './index';
import type {LintError} from '../base';
import type {SyntaxBase} from '../mixin/syntax';
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

declare type ExtLinkTypes = 'free-ext-link' | 'ext-link-url' | 'magic-link';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/(?:[\p{Zs}\t]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)+/gu;
const space = String.raw`(?:[\p{Zs}\t]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)`,
	spaceRegex = new RegExp(`${space}+`, 'gu');

/** NOT FOR BROWSER */

export interface MagicLinkToken extends SyntaxBase {}

/* eslint-disable @typescript-eslint/no-unused-expressions */
/^(ISBN)[\p{Zs}\t]+(?:97[89][\p{Zs}\t-]?)?(?:\d[\p{Zs}\t-]?){9}[\dxX]$/u;
/^(RFC|PMID)[\p{Zs}\t]+\d+$/u;
/* eslint-enable @typescript-eslint/no-unused-expressions */
const spdash = String.raw`(?:[\p{Zs}\t-]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)`,
	isbnPattern = new RegExp(String.raw`^(ISBN)${space}+(?:97[89]${spdash}?)?(?:\d${spdash}?){9}[\dxX]$`, 'u'),
	rfcPattern = new RegExp(String.raw`^(RFC|PMID)${space}+\d+$`, 'u');

/** NOT FOR BROWSER END */

/**
 * 自由外链
 * @classdesc `{childNodes: ...AstText|CommentToken|IncludeToken|NoincludeToken}`
 */
@syntax()
export abstract class MagicLinkToken extends Token {
	#type;

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

	/** 链接显示文字 */
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

	/** 和内链保持一致 */
	get link(): string {
		let {innerText} = this;
		if (this.type === 'magic-link' && innerText.startsWith('ISBN')) {
			innerText = `ISBN ${innerText.slice(5).replace(/[- ]/gu, '').replace(/x$/u, 'X')}`;
		}
		return innerText;
	}

	/* NOT FOR BROWSER */

	set link(url) {
		this.setTarget(url);
	}

	/** 协议 */
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
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			/^(ftp:\/\/|\/\/)/iu;
			pattern = new RegExp(`^(${config.protocol}${type === 'ext-link-url' ? '|//' : ''})`, 'iu');
		}
		this.setAttribute('pattern', pattern);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			rect = new BoundingRect(this, start);
		if (this.type === 'magic-link') {
			const {link} = this;
			if (link.startsWith('ISBN')) {
				// eslint-disable-next-line unicorn/no-useless-spread
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
		const pipe = this.type === 'ext-link-url',
			regex = pipe ? /\|/u : /[，；。：！？（）]+/u,
			child = this.childNodes.find((c): c is AstText => c.type === 'text' && regex.test(c.data));
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
				? [
					{
						desc: 'whitespace',
						range: [i, i + 1],
						text: ' ',
					},
				]
				: [
					{
						desc: 'whitespace',
						range: [i, i],
						text: ' ',
					},
					{
						desc: 'escape',
						range: [i, i + s.length],
						text: encodeURI(s),
					},
				];
			errors.push(e);
		}
		return errors;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new MagicLinkToken(undefined, this.type, this.getAttribute('config')) as this;
			token.append(...cloned);
			token.setAttribute('pattern', this.pattern);
			return token;
		});
	}

	/**
	 * @override
	 * @param token 待插入的节点
	 * @param i 插入位置
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
	 * 获取网址
	 * @throws `Error` 非标准协议
	 */
	getUrl(): URL | string {
		const {type, protocol} = this;
		let {link} = this;
		if (type === 'magic-link') {
			if (protocol === 'ISBN') {
				return this.normalizeTitle(`Special:BookSources/${link.slice(5)}`).getUrl();
			}
			link = protocol === 'RFC'
				? `https://tools.ietf.org/html/rfc${link.slice(4)}`
				: `https://pubmed.ncbi.nlm.nih.gov/${link.slice(5)}`;
		} else if (protocol === '//') {
			link = `https:${link}`;
		}
		try {
			return new URL(link);
		} catch (e) {
			if (e instanceof TypeError && e.message === 'Invalid URL') {
				throw new Error(`External link with a non-standard protocol: ${link}`);
			}
			throw e;
		}
	}

	/**
	 * 设置外链目标
	 * @param url 含协议的网址
	 */
	setTarget(url: string): void {
		const {childNodes} = Parser.parse(url, this.getAttribute('include'), 2, this.getAttribute('config'));
		this.replaceChildren(...childNodes);
	}

	/** 是否是模板或魔术字参数 */
	isParamValue(): boolean {
		return this.closest<ParameterToken>('parameter')?.getValue() === this.text();
	}

	/** 转义 `=` */
	escape(): void {
		for (const child of this.childNodes) {
			if (child.type === 'text') {
				child.escape();
			}
		}
	}

	/** @private */
	override toHtmlInternal(): string {
		const url = this.getUrl(),
			{type, innerText, protocol} = this;
		return `<a ${
			type === 'magic-link' && protocol === 'ISBN'
				? ''
				: `class="external${type === 'free-ext-link' ? ' free' : ''}" rel="nofollow" `
		}href="${typeof url === 'string' ? url : url.href}">${innerText}</a>`;
	}
}

classes['MagicLinkToken'] = __filename;
