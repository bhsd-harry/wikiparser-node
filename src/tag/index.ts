import {cache} from '../../util/lint';
import {Shadow} from '../../util/debug';
import {Token} from '../index';
import type {Cached} from '../../util/lint';
import type {
	Config,
	AST,
} from '../../base';
import type {
	AttributesToken,
	SyntaxToken,

	/* NOT FOR BROWSER */

	ListRangeToken,
	AstNodes,
} from '../../internal';

/* PRINT ONLY */

import Parser from '../../index';

/* PRINT ONLY END */

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {fixedToken} from '../../mixin/fixed';
import type {AstRange} from '../../lib/range';

/* NOT FOR BROWSER END */

/**
 * HTML tag
 *
 * HTML标签
 * @classdesc `{childNodes: [AttributesToken]}`
 */
@fixedToken
export abstract class TagToken extends Token {
	#closing;
	#tag;
	#match: Cached<this | undefined> | undefined;

	declare readonly childNodes: readonly [AttributesToken | SyntaxToken];
	abstract override get firstChild(): AttributesToken | SyntaxToken;
	abstract override get lastChild(): AttributesToken | SyntaxToken;
	abstract override get type(): 'html' | 'tvar';
	abstract get selfClosing(): boolean | undefined;

	/* NOT FOR BROWSER */

	abstract get legacy(): boolean | undefined;
	abstract override get children(): [AttributesToken | SyntaxToken];
	abstract override get firstElementChild(): AttributesToken | SyntaxToken;
	abstract override get lastElementChild(): AttributesToken | SyntaxToken;

	/* NOT FOR BROWSER END */

	/** whether to be a closing tag / 是否是闭合标签 */
	get closing(): boolean {
		return this.#closing;
	}

	/* NOT FOR BROWSER */

	set closing(value) {
		this.#closing = Boolean(value);
	}

	/** @private */
	get tag(): string {
		return this.#tag;
	}

	/** @private */
	set tag(value: string) {
		this.#tag = value;
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param tag 标签名
	 * @param attr 标签属性
	 * @param closing 是否闭合
	 */
	constructor(tag: string, attr: AttributesToken | SyntaxToken, closing: boolean, config?: Config, accum?: Token[]) {
		super(undefined, config, accum);
		this.insertAt(attr);
		this.#closing = closing;
		this.#tag = tag;
	}

	/** @private */
	override toString(skip?: boolean): string {
		return `<${this.#closing ? '/' : ''}${this.#tag}${super.toString(skip)}${this.selfClosing ? '/' : ''}>`;
	}

	/** @private */
	override text(separator = ''): string {
		const {closing} = this;
		return `<${closing && !separator ? '/' : ''}${this.#tag}${closing ? '' : super.text()}${separator}>`;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding'
			? this.#tag.length + (this.#closing ? 2 : 1) as TokenAttribute<T>
			: super.getAttribute(key);
	}

	/**
	 * Find the matching tag
	 *
	 * 搜索匹配的标签
	 */
	findMatchingTag(): this | undefined {
		LINT: return cache<this | undefined>(
			this.#match,
			() => {
				const {
					type,
					name,
					closing,
					selfClosing,

					/* NOT FOR BROWSER */

					legacy,
				} = this;
				let {parentNode} = this,
					isVoid = false,
					isFlexible = false;
				if (type === 'html') {
					const [, flexibleTags, voidTags] = this.getAttribute('config').html;
					isVoid = voidTags.includes(name!);
					isFlexible = flexibleTags.includes(name!);
				}
				if (isVoid || isFlexible && selfClosing) { // 自封闭标签
					return this;
				}
				/* c8 ignore next 3 */
				if (!parentNode) {
					return undefined;
				}
				const {childNodes} = parentNode,
					i = childNodes.indexOf(this),
					siblings = closing ? childNodes.slice(0, i) : childNodes.slice(i + 1).reverse(),
					stack = [this],
					{rev} = Shadow;
				let cur = siblings.pop();
				while (
					cur
					|| parentNode.is<ListRangeToken>('list-range') && parentNode.parentNode
				) {
					if (!cur) {
						/* NOT FOR BROWSER */

						const parent: Token = parentNode.parentNode!,
							ch = parent.childNodes,
							j = ch.indexOf(parentNode);
						Array.prototype.push.apply(
							siblings,
							closing ? ch.slice(0, j) : ch.slice(j + 1).reverse(),
						);
						parentNode = parent;
					} else if (cur.is<ListRangeToken>('list-range')) {
						const ch = cur.childNodes;
						Array.prototype.push.apply(siblings, closing ? ch as AstNodes[] : [...ch].reverse());

						/* NOT FOR BROWSER END */
					} else if (
						!cur.is<this>(type)
						|| type === 'html' && (cur.name !== name || isFlexible && cur.selfClosing)
						|| type === 'tvar' && cur.legacy !== legacy
					) {
						//
					} else if (cur.#closing === closing) {
						/* c8 ignore next 3 */
						if (type === 'tvar') {
							return undefined;
						}
						stack.push(cur);
					} else {
						const top = stack.pop()!;
						if (top === this) {
							return cur;
						}
						if (Parser.viewOnly) {
							top.#match = [rev, cur];
							cur.#match = [rev, top];
						}
					}
					cur = siblings.pop();
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
		PRINT: return super.print({
			pre: `&lt;${this.#closing ? '/' : ''}${this.#tag}`,
			post: `${this.selfClosing ? '/' : ''}&gt;`,
		});
	}

	/** @private */
	override json(_?: string, depth?: number, start = this.getAbsoluteIndex()): AST {
		LSP: {
			const json = super.json(undefined, depth, start);
			json['closing'] = this.#closing;
			return json;
		}
	}

	/* NOT FOR BROWSER */

	/**
	 * Get the range of the tag pair
	 *
	 * 获取标签对的范围
	 * @since v1.23.0
	 */
	getRange(): AstRange | undefined {
		const matched = this.findMatchingTag();
		if (!matched || matched === this) {
			return undefined;
		}
		const {closing} = this,
			range = this.createRange();
		range.setStartAfter(closing ? matched : this);
		range.setEndBefore(closing ? this : matched);
		return range;
	}
}

classes['TagToken'] = __filename;
