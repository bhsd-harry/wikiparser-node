import {generateForSelf, cache} from '../util/lint';
import {Shadow} from '../util/debug';
import {BoundingRect} from '../lib/rect';
import {attributesParent} from '../mixin/attributesParent';
import {Token} from './index';
import type {Cached} from '../util/lint';
import type {
	Config,
	LintError,
	AST,
} from '../base';
import type {AttributesParentBase} from '../mixin/attributesParent';
import type {AttributesToken, TranscludeToken} from '../internal';

/* PRINT ONLY */

import Parser from '../index';

/* PRINT ONLY END */

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {fixedToken} from '../mixin/fixed';

/* NOT FOR BROWSER END */

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
@fixedToken
@attributesParent()
export abstract class HtmlToken extends Token {
	declare readonly name: string;
	#closing;
	#selfClosing;
	#tag;
	#match: Cached<this | undefined> | undefined;

	declare readonly childNodes: readonly [AttributesToken];
	abstract override get firstChild(): AttributesToken;
	abstract override get lastChild(): AttributesToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [AttributesToken];
	abstract override get firstElementChild(): AttributesToken;
	abstract override get lastElementChild(): AttributesToken;

	/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	/** @throws `Error` 自封闭标签或空标签 */
	set closing(value) {
		if (!value) {
			this.#closing = false;
			return;
		} else if (this.selfClosing) {
			throw new Error('This is a self-closing tag!');
		}
		const {html: [,, tags]} = this.getAttribute('config');
		if (tags.includes(this.name)) {
			throw new Error('This is a void tag!');
		}
		this.#closing = true;
	}

	/** @throws `Error` 闭合标签或无效自封闭标签 */
	set selfClosing(value) { // eslint-disable-line grouped-accessor-pairs
		if (!value) {
			this.#selfClosing = false;
			return;
		} else if (this.closing) {
			throw new Error('This is a closing tag!');
		}
		const {html: [tags]} = this.getAttribute('config');
		if (tags.includes(this.name)) {
			throw new Error(`<${this.name}> tag cannot be self-closing!`);
		}
		this.#selfClosing = true;
	}

	/* NOT FOR BROWSER END */

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

				/* NOT FOR BROWSER */

				name,
			} = this,
			{html: [,, voidTags]} = this.getAttribute('config'),
			tag = this.#tag + (closing ? '' : super.text());

		/* NOT FOR BROWSER */

		if (voidTags.includes(name)) {
			return closing && name !== 'br' ? '' : `<${tag}/>`;
		}

		/* NOT FOR BROWSER END */

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
			{name, parentNode, closing, selfClosing} = this,
			rect = new BoundingRect(this, start);
		if (name === 'h1' && !closing) {
			const e = generateForSelf(this, rect, 'h1', '<h1>');
			e.suggestions = [{desc: 'h2', range: [start + 2, start + 3], text: '2'}];
			errors.push(e);
		}
		if (this.closest('table-attrs')) {
			const e = generateForSelf(this, rect, 'parsing-order', 'HTML tag in table attributes');
			e.fix = {desc: 'remove', range: [start, e.endIndex], text: ''};
			errors.push(e);
		}
		if (obsoleteTags.has(name)) {
			errors.push(
				generateForSelf(this, rect, 'obsolete-tag', 'obsolete HTML tag', 'warning'),
			);
		}
		if ((name === 'b' || name === 'strong') && this.closest('heading-title')) {
			errors.push(
				generateForSelf(this, rect, 'bold-header', 'bold in section header', 'warning'),
			);
		}
		const {html: [, flexibleTags, voidTags]} = this.getAttribute('config'),
			isVoid = voidTags.includes(name),
			isFlexible = flexibleTags.includes(name),
			isNormal = !isVoid && !isFlexible;
		if (closing && (selfClosing || isVoid) || selfClosing && isNormal) {
			const error = generateForSelf(
					this,
					rect,
					'unmatched-tag',
					closing ? 'tag that is both closing and self-closing' : 'invalid self-closing tag',
				),
				open: LintError.Fix = {desc: 'open', range: [start + 1, start + 2], text: ''},
				noSelfClosing: LintError.Fix = {
					desc: 'no self-closing',
					range: [error.endIndex - 2, error.endIndex - 1],
					text: '',
				};
			if (isFlexible) {
				error.suggestions = [open, noSelfClosing];
			} else if (closing) {
				error.fix = isVoid ? open : noSelfClosing;
			} else {
				error.suggestions = [
					noSelfClosing,
					{desc: 'close', range: [error.endIndex - 2, error.endIndex], text: `></${name}>`},
				];
			}
			errors.push(error);
		} else if (!this.findMatchingTag()) {
			const error = generateForSelf(
				this,
				rect,
				'unmatched-tag',
				closing ? 'unmatched closing tag' : 'unclosed tag',
			);
			if (closing) {
				const ancestor = this.closest<TranscludeToken>('magic-word');
				if (ancestor && magicWords.has(ancestor.name)) {
					error.severity = 'warning';
				} else {
					error.suggestions = [{desc: 'remove', range: [start, error.endIndex], text: ''}];
				}
			} else {
				const childNodes = parentNode?.childNodes;
				if (
					formattingTags.has(name)
					&& childNodes?.slice(0, childNodes.indexOf(this))
						.some(({type, name: n}) => type === 'html' && n === name)
				) {
					error.suggestions = [{desc: 'close', range: [start + 1, start + 1], text: '/'}];
				} else if (!this.closest('heading-title')) {
					error.severity = 'warning';
				}
			}
			errors.push(error);
		}
		return errors;
	}

	/**
	 * Find the matching tag
	 *
	 * 搜索匹配的标签
	 */
	findMatchingTag(): this | undefined {
		return cache<this | undefined>(
			this.#match,
			() => {
				const {name, parentNode, closing, selfClosing} = this,
					{html: [, flexibleTags, voidTags]} = this.getAttribute('config'),
					isVoid = voidTags.includes(name),
					isFlexible = flexibleTags.includes(name);
				if (isVoid || isFlexible && selfClosing) { // 自封闭标签
					return this;
				} else if (!parentNode) {
					return undefined;
				}
				const {childNodes} = parentNode,
					i = childNodes.indexOf(this),
					siblings = closing ? childNodes.slice(0, i).reverse() : childNodes.slice(i + 1),
					stack = [this],
					{rev} = Shadow;
				for (const token of siblings) {
					if (!token.is<this>('html') || token.name !== name || isFlexible && token.#selfClosing) {
						continue;
					} else if (token.#closing === closing) {
						stack.push(token);
					} else {
						const top = stack.pop()!;
						if (top === this) {
							return token;
						}
						if (Parser.viewOnly) {
							top.#match = [rev, token];
							token.#match = [rev, top];
						}
					}
				}
				if (Parser.viewOnly) {
					for (const token of stack) {
						token.#match = [rev, undefined];
					}
				}
				return undefined;
			},
			value => {
				this.#match = value;
				if (value[1] && value[1] !== this) {
					value[1].#match = [Shadow.rev, this];
				}
			},
		);
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

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [attr] = this.cloneChildNodes() as [AttributesToken],
			config = this.getAttribute('config');
		// @ts-expect-error abstract class
		return Shadow.run(() => new HtmlToken(this.#tag, attr, this.closing, this.selfClosing, config) as this);
	}

	/**
	 * Change the tag name
	 *
	 * 更换标签名
	 * @param tag tag name / 标签名
	 * @throws `RangeError` 非法的HTML标签
	 */
	replaceTag(tag: string): void {
		const name = tag.toLowerCase();
		if (!this.getAttribute('config').html.some(tags => tags.includes(name))) {
			throw new RangeError(`Invalid HTML tag: ${tag}`);
		}
		this.setAttribute('name', name);
		this.#tag = tag;
	}

	/**
	 * Fix the invalid self-closing tag
	 *
	 * 修复无效自封闭标签
	 * @throws `Error` 无法修复无效自封闭标签
	 */
	fix(): void {
		const {html: [normalTags]} = this.getAttribute('config'),
			{parentNode, name: tagName, firstChild, selfClosing} = this;
		if (!parentNode || !selfClosing || !normalTags.includes(tagName)) {
			return;
		} else if (firstChild.text().trim()) {
			this.#selfClosing = false;
			this.after(
				Parser.parse(`</${this.name}>`, false, 3, this.getAttribute('config'))
					.firstChild!,
			);
			return;
		}
		const {childNodes} = parentNode,
			i = childNodes.indexOf(this),
			prevSiblings = childNodes.slice(0, i)
				.filter((child): child is this => child.type === 'html' && child.name === tagName),
			imbalance = prevSiblings.reduce((acc, {closing}) => acc + (closing ? 1 : -1), 0);
		if (imbalance < 0) {
			this.#selfClosing = false;
			this.#closing = true;
		} else {
			throw new Error(
				`Cannot fix invalid self-closing tag: The previous ${imbalance} closing tag(s) are unmatched`,
			);
		}
	}

	/** @private */
	override toHtmlInternal(): string {
		const {closing, name} = this,
			{html: [, selfClosingTags, voidTags]} = this.getAttribute('config'),
			tag = name + (closing ? '' : super.toHtmlInternal());
		if (voidTags.includes(name)) {
			return closing && name !== 'br' ? '' : `<${tag}>`;
		}
		return `<${closing ? '/' : ''}${tag}>${
			this.#selfClosing && !closing && selfClosingTags.includes(name) ? `</${name}>` : ''
		}`;
	}
}

classes['HtmlToken'] = __filename;
