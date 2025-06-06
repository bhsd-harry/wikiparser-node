import {generateForSelf, cache} from '../util/lint';
import {Shadow} from '../util/debug';
import {BoundingRect} from '../lib/rect';
import {attributesParent} from '../mixin/attributesParent';
import {Token} from './index';
import type {Cached} from '../util/lint';
import type {
	Config,
	LintError,
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
	#match: Cached<this | undefined> | undefined;

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
			{name, parentNode, closing, selfClosing} = this,
			rect = new BoundingRect(this, start),
			s = this.inTableAttrs();
		if (name === 'h1' && !closing) {
			const e = generateForSelf(this, rect, 'h1', '<h1>');
			e.suggestions = [{desc: 'h2', range: [start + 2, start + 3], text: '2'}];
			errors.push(e);
		}
		if (s) {
			const e = generateForSelf(this, rect, 'parsing-order', 'HTML tag in table attributes', s);
			if (s === 'error') {
				e.fix = {desc: 'remove', range: [start, e.endIndex], text: ''};
			}
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
						top.#match = [rev, token];
						token.#match = [rev, top];
					}
				}
				for (const token of stack) {
					token.#match = [rev, undefined];
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
}
