import {generateForSelf} from '../util/lint';
import {noWrap} from '../util/string';
import {BoundingRect} from '../lib/rect';
import {attributesParent} from '../mixin/attributesParent';
import {Token} from './index';
import type {
	Config,
	LintError,
	AST,
} from '../base';
import type {AttributesParentBase} from '../mixin/attributesParent';
import type {AttributesToken, TranscludeToken} from '../internal';

export interface HtmlToken extends AttributesParentBase {}

const magicWords = new Set<string | undefined>(['if', 'ifeq', 'ifexpr', 'ifexist', 'iferror', 'switch']),
	formattingTags = new Set([
		'b',
		'big',
		'center',
		'cite',
		'code',
		'del',
		'dfn',
		'em',
		'font',
		'i',
		'ins',
		'kbd',
		'mark',
		'pre',
		'q',
		's',
		'samp',
		'small',
		'strike',
		'strong',
		'sub',
		'sup',
		'tt',
		'u',
		'var',
	]),
	obsoleteTags = new Set(['strike', 'big', 'center', 'font', 'tt']);

/**
 * HTML tag
 *
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
@attributesParent()
export abstract class HtmlToken extends Token {
	declare readonly name: string;
	#closing;
	#selfClosing;
	#tag;

	declare readonly childNodes: readonly [AttributesToken];
	abstract override get firstChild(): AttributesToken;
	abstract override get lastChild(): AttributesToken;

	override get type(): 'html' {
		return 'html';
	}

	/** whether to be self-closing / 是否自封闭 */
	get selfClosing(): boolean {
		return this.#selfClosing;
	}

	/** whether to be a closing tag / 是否是闭合标签 */
	get closing(): boolean {
		return this.#closing;
	}

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param closing 是否闭合
	 * @param selfClosing 是否自封闭
	 */
	constructor(
		name: string,
		attr: AttributesToken,
		closing: boolean,
		selfClosing: boolean,
		config?: Config,
		accum?: Token[],
	) {
		super(undefined, config, accum);
		this.insertAt(attr);
		this.setAttribute('name', name.toLowerCase());
		this.#closing = closing;
		this.#selfClosing = selfClosing;
		this.#tag = name;
	}

	/** @private */
	override toString(skip?: boolean): string {
		return `<${this.closing ? '/' : ''}${this.#tag}${super.toString(skip)}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @private */
	override text(): string {
		const {
				closing,
			} = this,
			tag = this.#tag + (closing ? '' : super.text());
		return `<${closing ? '/' : ''}${tag}${this.#selfClosing ? '/' : ''}>`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding'
			? this.#tag.length + (this.closing ? 2 : 1) as TokenAttribute<T>
			: super.getAttribute(key);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			rect = new BoundingRect(this, start);
		if (this.name === 'h1' && !this.closing) {
			const e = generateForSelf(this, rect, 'h1', '<h1>');
			e.suggestions = [{desc: 'h2', range: [start + 2, start + 3], text: '2'}];
			errors.push(e);
		}
		if (this.closest('table-attrs')) {
			const e = generateForSelf(this, rect, 'parsing-order', 'HTML tag in table attributes');
			e.fix = {desc: 'remove', range: [start, e.endIndex], text: ''};
			errors.push(e);
		}
		try {
			this.findMatchingTag();
		} catch (e) {
			if (e instanceof SyntaxError) {
				const {message} = e;
				const msg = message.split(':', 1)[0]!.toLowerCase(),
					error = generateForSelf(this, rect, 'unmatched-tag', msg),
					noSelfClosing: LintError.Fix = {
						desc: 'no self-closing',
						range: [error.endIndex - 2, error.endIndex - 1],
						text: '',
					};
				switch (msg) {
					case 'unclosed tag': {
						const childNodes = this.parentNode?.childNodes;
						if (
							formattingTags.has(this.name)
							&& childNodes?.slice(0, childNodes.indexOf(this))
								.some(({type, name}) => type === 'html' && name === this.name)
						) {
							error.suggestions = [{desc: 'close', range: [start + 1, start + 1], text: '/'}];
						} else if (!this.closest('heading-title')) {
							error.severity = 'warning';
						}
						break;
					}
					case 'unmatched closing tag': {
						const ancestor = this.closest<TranscludeToken>('magic-word');
						if (ancestor && magicWords.has(ancestor.name)) {
							error.severity = 'warning';
						} else {
							error.suggestions = [{desc: 'remove', range: [start, error.endIndex], text: ''}];
						}
						break;
					}
					case 'tag that is both closing and self-closing': {
						const {html: [normalTags,, voidTags]} = this.getAttribute('config'),
							open: LintError.Fix = {desc: 'open', range: [start + 1, start + 2], text: ''};
						if (voidTags.includes(this.name)) {
							error.fix = open;
						} else if (normalTags.includes(this.name)) {
							error.fix = noSelfClosing;
						} else {
							error.suggestions = [open, noSelfClosing];
						}
						break;
					}
					case 'invalid self-closing tag':
						error.suggestions = [
							noSelfClosing,
							{desc: 'close', range: [error.endIndex - 2, error.endIndex], text: `></${this.name}>`},
						];
						// no default
				}
				errors.push(error);
			}
		}
		if (obsoleteTags.has(this.name)) {
			errors.push(
				generateForSelf(this, rect, 'obsolete-tag', 'obsolete HTML tag', 'warning'),
			);
		}
		if ((this.name === 'b' || this.name === 'strong') && this.closest('heading-title')) {
			errors.push(
				generateForSelf(this, rect, 'bold-header', 'bold in section header', 'warning'),
			);
		}
		return errors;
	}

	/**
	 * Find the matching tag
	 *
	 * 搜索匹配的标签
	 * @throws `SyntaxError` 同时闭合和自封闭的标签
	 * @throws `SyntaxError` 无效自封闭标签
	 * @throws `SyntaxError` 未匹配的标签
	 */
	findMatchingTag(): this | undefined {
		const {html: [normalTags, flexibleTags, voidTags]} = this.getAttribute('config'),
			{name: tagName, parentNode, closing} = this,
			string = noWrap(this.toString());
		if (closing && (this.#selfClosing || voidTags.includes(tagName))) {
			throw new SyntaxError(`Tag that is both closing and self-closing: ${string}`);
		} else if (voidTags.includes(tagName) || this.#selfClosing && flexibleTags.includes(tagName)) { // 自封闭标签
			return this;
		} else if (this.#selfClosing && normalTags.includes(tagName)) {
			throw new SyntaxError(`Invalid self-closing tag: ${string}`);
		} else if (!parentNode) {
			return undefined;
		}
		const {childNodes} = parentNode,
			i = childNodes.indexOf(this),
			siblings = closing ? childNodes.slice(0, i).reverse() : childNodes.slice(i + 1);
		let imbalance = closing ? -1 : 1;
		for (const token of siblings) {
			if (!token.is<this>('html') || token.name !== tagName) {
				continue;
			} else if (token.#closing) {
				imbalance--;
			} else {
				imbalance++;
			}
			if (imbalance === 0) {
				return token;
			}
		}
		throw new SyntaxError(`${closing ? 'Unmatched closing' : 'Unclosed'} tag: ${string}`);
	}

	/** @private */
	override print(): string {
		return super.print({
			pre: `&lt;${this.closing ? '/' : ''}${this.#tag}`,
			post: `${this.#selfClosing ? '/' : ''}&gt;`,
		});
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		Object.assign(json, {closing: this.closing, selfClosing: this.#selfClosing});
		return json;
	}
}
