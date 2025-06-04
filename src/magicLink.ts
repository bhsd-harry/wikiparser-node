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
} from '../internal';

declare type ExtLinkTypes = 'free-ext-link' | 'ext-link-url' | 'magic-link';

const space = String.raw`(?:[${zs}\t]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)`;
const spaceRegex = new RegExp(`${space}+`, 'gu');

/**
 * free external link
 *
 * 自由外链
 * @classdesc `{childNodes: (AstText|CommentToken|IncludeToken|NoincludeToken)[]}`
 */
export abstract class MagicLinkToken extends Token {
	readonly #type;

	declare readonly childNodes: readonly (AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken)[];
	abstract override get firstChild(): AstText | TranscludeToken;
	abstract override get lastChild(): AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken;

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

	/**
	 * @param url 网址
	 * @param type 类型
	 */
	constructor(url?: string, type: ExtLinkTypes = 'free-ext-link', config = Parser.getConfig(), accum?: Token[]) {
		super(url, config, accum, {
		});
		this.#type = type;
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
}
